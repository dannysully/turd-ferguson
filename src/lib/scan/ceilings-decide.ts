import type { Settings } from "./settings-merge.ts";

/**
 * The ceilings, as a decision: which refusal a set of readings produces, in
 * which order they are taken, and what a reading that did not answer means.
 *
 * This is the half of `ceilings.ts` that decides. It lived inside that module
 * beside four Supabase reads, which meant nothing could execute it: `ceilings.ts`
 * is `server-only` and imports `@/lib/supabase/admin`, so Node's own runner
 * cannot load it. The executed-file census on 20 September 2026 found it
 * invisible to all 45 tests - the one function standing between an anonymous
 * form and every dollar this site spends, swept by reading and never once run.
 *
 * Same move `settings-merge.ts` made out of `settings.ts` and `brand-name.ts`
 * out of `engines.ts`, for the same reason and with the same shape: the network
 * half stays behind, everything that decides stays here.
 *
 * ## What the split had to preserve, and what it makes checkable
 *
 * **The order is load-bearing**, and it was held by nothing but the order of
 * the lines. Everything below a given ceiling costs money or database work, so
 * the first refusal must win and no reading below it may be taken at all. That
 * is why `CeilingReads` is five functions rather than a record of five numbers:
 * a struct would have to be filled before the first test ran, which is the one
 * shape that cannot express "cheapest first" - and a test can count the calls.
 *
 * **A ceiling that could not be read has not been cleared.** Two of the five
 * report that as `null`; the other two throw, and throwing reaches the route as
 * a 500, which is also a refusal. Both directions are refusals and neither is
 * "carry on", which is what `?? 0` used to say.
 *
 * **What the visitor is told is not what the log is told.** Three ceilings
 * answer the same 503 "we hit today's limit" because they are all the same fact
 * to the person reading it, while the `code` tells them apart for whoever reads
 * the log. `cap_unreadable` is deliberately not `capped`: the cap was not hit,
 * we could not find out whether it was, and a log that cannot tell those apart
 * sends its reader to the wrong question.
 */

export type Refusal = { http: number; code: string; message: string };

/**
 * A count, or why there isn't one.
 *
 * Not `number | null`. The reason the read gave is the only part of a failed
 * ceiling that tells whoever reads the log what to go and look at, and it was
 * in all three of these lines before the split; a bare null would have quietly
 * dropped it while every assertion about the refusal still passed.
 */
export type Count = number | { failed: string };

/**
 * The five readings, taken lazily and in order.
 *
 * The two spend figures have no failure case here: `spentSince` and
 * `anthropicCallsSince` both throw on a read that did not answer and so already
 * refuse, through the route rather than through this function.
 */
export type CeilingReads = {
  /** Scans started in the window. Tracking runs excluded - not a visitor's scan. */
  todayScans(): Promise<Count>;
  /** DataForSEO spend in the window, tracking runs excluded. Throws on a failed read. */
  spentToday(): Promise<number>;
  /** Model calls billed in the window, tracking runs included. Throws on a failed read. */
  modelCallsToday(): Promise<number>;
  /** This caller's scans in the window, ours-that-failed excluded. */
  ipScans(): Promise<Count>;
  /** This caller's campaign rows in the window. Only read when `countCampaigns`. */
  ipCampaigns(): Promise<Count>;
};

/** True when a reading did not answer, which is a refusal rather than a zero. */
function unread(count: Count): count is { failed: string } {
  return typeof count !== "number";
}

export type CeilingOpts = {
  settings: Settings;
  /**
   * Whether to count this caller's campaign rows against their allowance as
   * well as their scans.
   *
   * A reading is a scans row, so the scans count already bounds a visitor who
   * keeps running benchmarks. What it does not bound is a campaign whose scan
   * insert failed: no scans row exists, so it is free. That costs nothing in
   * model calls - the campaign is inserted before anything is paid for - but it
   * is an unbounded insert from an anonymous form, and `campaigns_ip_idx` exists
   * in the schema for exactly this count. An index nothing reads invites the
   * next reader to conclude the limit is enforced.
   */
  countCampaigns?: boolean;
  /**
   * What the caller is trying to start, in the words the visitor gets back:
   * "scan" on the scan route, "benchmark" on the campaign one. The two share one
   * allowance, and somebody told they are out of scans when they asked for a
   * benchmark would go looking for the wrong limit.
   */
  subject: string;
};

/** The same sentence for all three spend ceilings; the `code` tells them apart. */
const CAPPED: Refusal = {
  http: 503,
  code: "capped",
  message: "We have hit today's scan limit. We will be back shortly.",
};

/**
 * A reading that did not answer.
 *
 * 503 rather than 429 on the per-caller ones, and that is not a detail. "You
 * have used today's free scans" is a statement about them that we have no basis
 * for - not knowing how many they have used is the entire failure - so this
 * answers the same 503 as the caps above rather than accusing somebody of
 * something unmeasured.
 */
function unreadable(subject: string): Refusal {
  return {
    http: 503,
    code: "cap_unreadable",
    message: `We could not start that ${subject} just now. Please try again in a moment.`,
  };
}

/** Out of allowance, which is the one ceiling the visitor can do something about. */
function rateLimited(subject: string): Refusal {
  return {
    http: 429,
    code: "rate_limited",
    message: `You have used today's free ${subject}s. Try again tomorrow.`,
  };
}

/**
 * Take the ceilings in order and return the first refusal, or null when every
 * one is clear.
 *
 * `warn` is `console.warn` in production and an array push in the test, for the
 * reason `mergeSettings` takes one: a ceiling that went unread without saying so
 * is a ceiling that was simply off, and the test has to be able to see that it
 * said so.
 *
 * Nothing here writes. A caller that gets null still has to do its own insert,
 * and a caller that gets a refusal has spent some reads and no money.
 */
export async function decideCeilings(
  opts: CeilingOpts,
  reads: CeilingReads,
  warn: (message: string) => void = () => {},
): Promise<Refusal | null> {
  const { settings, subject } = opts;

  // 1. The kill switch, which must cost nothing to honour: it exists to be
  //    thrown in a hurry, by someone who will not then check that it took.
  if (!settings.scans_enabled) {
    return { http: 503, code: "paused", message: "Scans are paused right now. We will be back shortly." };
  }

  // 2. The day's volume.
  const todayCount = await reads.todayScans();
  if (unread(todayCount)) {
    warn("[scan] could not count today's scans, so the daily cap is unverified: " + todayCount.failed);
    return unreadable(subject);
  }
  if (todayCount >= settings.daily_scan_cap) return CAPPED;

  // 3. The day's DataForSEO bill. Adding engines changes the cost of a scan by
  //    an order of magnitude, so a count alone is no longer a safe limit.
  if ((await reads.spentToday()) >= settings.daily_cost_cap_usd) return CAPPED;

  /**
   * 4. The day's model bill, which the dollar cap above cannot see.
   *
   * `daily_cost_cap_usd` sums `dfs_cost`, and the call the scan route is about
   * to make - reading the site and naming the brand - costs nothing at
   * DataForSEO. So does the question set, the brand extraction, the leaderboard
   * judgement and the source classification. Every other per-scan ceiling here
   * bounds one scan; nothing bounded a day.
   */
  const callsToday = await reads.modelCallsToday();
  if (callsToday >= settings.anthropic_calls_per_day) {
    warn(`[scan] model call cap reached: ${callsToday} of ${settings.anthropic_calls_per_day} in 24h`);
    return CAPPED;
  }

  /**
   * 5. The caller's own allowance.
   *
   * Deliberately narrower than the three above, and the narrowness is the point.
   * This is about what is fair to one visitor; the caps above are about spend,
   * and a pass that died still spent. So a visitor cannot lose a scan to our
   * bug, and we cannot lose a day's budget to a loop of them - two concerns held
   * by different ceilings rather than one ceiling doing both jobs badly.
   *
   * One allowance covers scans and benchmarks together, because a reading is a
   * scans row carrying the same ip_hash. That is what Danny's answer 5 asked
   * for, and it is also the only shape that cannot be gamed by alternating
   * between the two forms.
   */
  const ipCount = await reads.ipScans();
  if (unread(ipCount)) {
    warn(
      "[scan] could not count scans for this address, so the per-IP limit is unverified: " + ipCount.failed,
    );
    return unreadable(subject);
  }
  if (ipCount >= settings.ip_scans_per_day) return rateLimited(subject);

  // 6. Campaign rows for this caller, on the route that writes one.
  if (opts.countCampaigns) {
    const campaignCount = await reads.ipCampaigns();
    if (unread(campaignCount)) {
      warn(
        "[coverage] could not count campaigns for this address, so the per-IP limit is unverified: " +
          campaignCount.failed,
      );
      return unreadable(subject);
    }
    if (campaignCount >= settings.ip_scans_per_day) return rateLimited(subject);
  }

  return null;
}
