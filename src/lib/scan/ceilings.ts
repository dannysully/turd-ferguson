import "server-only";

import type { Settings } from "./settings";
import { anthropicCallsSince, spentSince } from "./spend";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The ceilings every paid pass passes through, in one place.
 *
 * These were written inline in /api/scan/start and they are moved here, not
 * copied, for a reason the campaign benchmark migration argues at length: a
 * reading IS a scan row, so it inherits the scan's ceilings. A second route
 * with its own transcription of them would be a second set to keep in step -
 * and the day this repo spent finding holes in the first set is the argument
 * against having two. Every hole found since is in this file, once:
 *
 *  - a ceiling whose read failed used to be a ceiling that was simply off;
 *  - the daily dollar cap cannot see a model call, so calls have their own;
 *  - a pass that died still spent, so spend ceilings count failures;
 *  - a visitor's own allowance does not, because our bug is not their scan.
 *
 * Order is cheapest first and it is load-bearing: everything below a given
 * line costs money or database work, and the first refusal wins.
 *
 * Returns the refusal a caller should send back, or null when every ceiling is
 * clear. Nothing here writes; a caller that gets null still has to do its own
 * insert, and a caller that gets a refusal has spent four reads and no money.
 */
export type Refusal = { http: number; code: string; message: string };

export type CeilingOpts = {
  settings: Settings;
  /** The start of the rolling day, as an ISO string. */
  since: string;
  /** The caller, already hashed. See hashIp - a raw address never reaches here. */
  ipHash: string;
  /**
   * Whether to count this caller's campaign rows against their allowance as
   * well as their scans.
   *
   * A reading is a scans row, so the scans count below already bounds a
   * visitor who keeps running benchmarks. What it does not bound is a campaign
   * whose scan insert failed: no scans row exists, so it is free. That costs
   * nothing in model calls - the campaign is inserted before anything is paid
   * for - but it is an unbounded insert from an anonymous form, and
   * campaigns_ip_idx exists in the schema for exactly this count. An index
   * nothing reads invites the next reader to conclude the limit is enforced.
   */
  countCampaigns?: boolean;
  /**
   * What the caller is trying to start, in the words the visitor gets back:
   * "scan" on the scan route, "benchmark" on the campaign one. The two share
   * one allowance, and somebody told they are out of scans when they asked for
   * a benchmark would go looking for the wrong limit.
   */
  subject: string;
};

export async function checkCeilings(opts: CeilingOpts): Promise<Refusal | null> {
  const { settings, since, ipHash, subject } = opts;
  const db = supabaseAdmin();

  if (!settings.scans_enabled) {
    return { http: 503, code: "paused", message: "Scans are paused right now. We will be back shortly." };
  }

  /**
   * A ceiling that could not be read has not been cleared.
   *
   * The error was discarded here, and a failed count comes back null, so
   * `?? 0` stated "nothing has run today" as a fact whenever the read did not
   * answer - and the cap it guards was simply off for as long as that lasted.
   * The direction matters: the hour this fails in is an hour the database is
   * unwell, which is the same hour every request below still pays Anthropic for
   * a site read before reaching an insert that will fail. So the ceiling went
   * blind exactly when it was the only thing left, which is the shape
   * `anthropicCallsSince` was already fixed for.
   *
   * Refused rather than allowed, and it is not a new trade: the three ceilings
   * around it - getSettings, spentSince, anthropicCallsSince - all throw on a
   * read that fails and so already refuse. These two were the outliers, with
   * nothing written down to say why.
   *
   * Its own code, not "capped". The cap was not hit; we could not find out
   * whether it was, and a log that cannot tell those apart sends whoever reads
   * it to the wrong question.
   */
  const { count: todayCount, error: todayErr } = await db
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("is_tracking_run", false)
    .gte("created_at", since);
  if (todayErr) {
    console.warn("[scan] could not count today's scans, so the daily cap is unverified: " + todayErr.message);
    return {
      http: 503,
      code: "cap_unreadable",
      message: `We could not start that ${subject} just now. Please try again in a moment.`,
    };
  }
  if ((todayCount ?? 0) >= settings.daily_scan_cap) {
    return { http: 503, code: "capped", message: "We have hit today's scan limit. We will be back shortly." };
  }

  // Spend is capped as well as volume: adding engines changes the cost of a
  // scan by an order of magnitude, so a count alone is no longer a safe limit.
  const spentToday = await spentSince(since, { excludeTrackingRuns: true });
  if (spentToday >= settings.daily_cost_cap_usd) {
    return { http: 503, code: "capped", message: "We have hit today's scan limit. We will be back shortly." };
  }

  /**
   * The model bill, which the dollar cap above cannot see.
   *
   * daily_cost_cap_usd sums dfs_cost, and the call the scan route is about to
   * make - reading the site and naming the brand - costs nothing at
   * DataForSEO. So did the question set, the brand extraction, the leaderboard
   * judgement and the source classification. Every per-scan ceiling in this
   * codebase bounds one scan; nothing bounded a day.
   *
   * Checked here rather than inside the Anthropic client because this is the
   * first door and the cheapest place to refuse: every model call downstream
   * belongs to a pass that started here.
   */
  const callsToday = await anthropicCallsSince(since);
  if (callsToday >= settings.anthropic_calls_per_day) {
    console.warn(
      `[scan] model call cap reached: ${callsToday} of ${settings.anthropic_calls_per_day} in 24h`,
    );
    return { http: 503, code: "capped", message: "We have hit today's scan limit. We will be back shortly." };
  }

  /**
   * The per-IP limit, refused rather than waved through when it cannot be read.
   *
   * Same defect as the daily cap above and the same fix, with one difference in
   * what the visitor is told: 429 "you have used today's free scans" would be a
   * statement about them that we have no basis for. We do not know how many
   * they have used - that is the whole failure - so this answers the same 503 as
   * the cap above rather than accusing them of something unmeasured.
   *
   * Scans that failed are not counted, decided by Danny on 20 September 2026:
   * "If our pass failed, that is ours. Do not charge a retry against their
   * allowance." A row only reaches status 'failed' once the pipeline has
   * started and died - a domain we cannot reach is refused with a 422 before
   * any row is inserted - so every row this excludes is one of ours, not a
   * scan the visitor got the benefit of.
   *
   * Deliberately narrower than it looks, and the narrowness is the point. This
   * is the per-IP ALLOWANCE, which is about what is fair to one visitor. The
   * daily scan cap, the dollar cap and the model call ceiling above all still
   * count failures, because those are about spend, and a pass that died still
   * spent. So a visitor cannot lose a scan to our bug, and we cannot lose a
   * day's budget to a loop of them: the two concerns are held by different
   * ceilings rather than one ceiling being asked to do both jobs badly.
   *
   * One allowance covers scans and benchmarks together. A reading is a scans
   * row carrying the same ip_hash, so it is counted here without a second rule -
   * which is what Danny's answer 5 asked for, and it is also the only shape
   * that cannot be gamed by alternating between the two forms.
   */
  const { count: ipCount, error: ipErr } = await db
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .neq("status", "failed")
    .gte("created_at", since);
  if (ipErr) {
    console.warn(
      "[scan] could not count scans for this address, so the per-IP limit is unverified: " + ipErr.message,
    );
    return {
      http: 503,
      code: "cap_unreadable",
      message: `We could not start that ${subject} just now. Please try again in a moment.`,
    };
  }
  if ((ipCount ?? 0) >= settings.ip_scans_per_day) {
    return {
      http: 429,
      code: "rate_limited",
      message: `You have used today's free ${subject}s. Try again tomorrow.`,
    };
  }

  if (opts.countCampaigns) {
    const { count: campaignCount, error: campaignErr } = await db
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if (campaignErr) {
      console.warn(
        "[coverage] could not count campaigns for this address, so the per-IP limit is unverified: " +
          campaignErr.message,
      );
      return {
        http: 503,
        code: "cap_unreadable",
        message: `We could not start that ${subject} just now. Please try again in a moment.`,
      };
    }
    if ((campaignCount ?? 0) >= settings.ip_scans_per_day) {
      return {
        http: 429,
        code: "rate_limited",
        message: `You have used today's free ${subject}s. Try again tomorrow.`,
      };
    }
  }

  return null;
}
