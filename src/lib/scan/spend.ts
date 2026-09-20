import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { selectAll } from "@/lib/supabase/page";

/**
 * The PostgREST filter for scans whose spend belongs to the window starting
 * at `since`.
 *
 * Not `created_at >= since`, which is what both ceilings below used to ask,
 * and which made them blind to the most expensive thing this system does.
 *
 * Spend lands on the scan row, but it is not all spent when that row is made.
 * The gated pass is the biggest single spender here - every question again on
 * every gated engine, plus a brand extraction per engine and a source
 * classification - and it runs when the visitor clicks the link in the
 * verification email, which is whenever they get round to reading their mail.
 * A scan started on Monday and verified on Wednesday bills Wednesday's reads
 * onto Monday's row, and a window of `created_at >= now - 24h` cannot see a
 * penny of it. Once a scan is a day old its gated pass is free as far as both
 * ceilings can tell, however many of them are unlocked at once.
 *
 * So a scan counts if either of its passes STARTED in the window or if either
 * of them finished in it. One that straddles the boundary is counted whole in
 * both windows rather than split between them: these are ceilings,
 * over-counting costs a visitor a scan they could have had, and under-counting
 * is how a day's budget gets spent twice.
 *
 * The free pass is dated by created_at, because the row is made as that pass
 * starts. The gated pass is dated by gated_started_at, stamped by the same
 * compare-and-swap in pipeline.ts that claims it. Before that column existed
 * this filter asked only about completions, so the most expensive pass in the
 * system - every question again on every gated engine - cost nothing either
 * ceiling could see for as long as it was running. Ten unlocks clicked
 * together were ten passes in flight and a day's budget that read as untouched.
 * Danny decided this on 20 September 2026.
 *
 * ── What these two ceilings still under-count ──────────────────────────
 *
 * Said here, at the read, rather than left for someone to infer from the
 * absence of it. Both numbers below are floors, not measurements.
 *
 * A pass the platform kills mid-flight was billed by the vendor for every read
 * it had already made and never reached billSpend, so that spend is not on the
 * row and no sweep can reconstruct it afterwards. gated_started_at now brings
 * the ROW inside the window - the ceiling counts the scan - but the figure on
 * it is short by whatever the killed pass spent before it died. Danny's
 * instruction on 20 September 2026 was to leave the gap rather than close it
 * with an estimate: a number nobody measured would read as measured, and the
 * stall reaper deliberately writes no figure for the same reason.
 *
 * So: if either ceiling is close to its limit, the real spend is above what it
 * says, never below. Treat a reading near the cap as already past it.
 */
function activeWindow(since: string): string {
  return (
    "created_at.gte." + since +
    ",completed_at.gte." + since +
    ",gated_started_at.gte." + since +
    ",gated_completed_at.gte." + since
  );
}

/**
 * What the scans active since `since` have cost at DataForSEO.
 *
 * Both callers used to sum an unpaged select, which PostgREST caps at 1000
 * rows without saying so. A spend cap that reads a truncated set fails open -
 * it under-reports the day, and the busier the day the further under it
 * reads, which is the one direction a cap must not fail in.
 *
 * The two callers disagree about tracking runs and that is preserved here
 * rather than quietly settled: the start route excludes them because a
 * tracking run is not a visitor's free scan, and the unlock path counts
 * everything because it is protecting the day's budget as a whole. Whether
 * that is the intended pair of denominators is a product question, and it is
 * at least visible in one function now instead of implied by two call sites.
 */
export async function spentSince(
  since: string,
  opts: { excludeTrackingRuns: boolean },
): Promise<number> {
  const db = supabaseAdmin();
  const rows = await selectAll<{ dfs_cost: number | string | null }>((from, to) => {
    const q = db.from("scans").select("dfs_cost").or(activeWindow(since));
    return (opts.excludeTrackingRuns ? q.eq("is_tracking_run", false) : q)
      .order("id", { ascending: true })
      .range(from, to);
  });
  return rows.reduce((total, r) => total + Number(r.dfs_cost ?? 0), 0);
}

/**
 * Model calls billed onto the scans active since `since`.
 *
 * daily_cost_cap_usd bounds DataForSEO spend and nothing bounded Anthropic
 * spend at all. The two are not interchangeable: the engine reads are what
 * the cap was written for, but a scan also pays for a brand read, a question
 * set, a brand extraction per engine, a leaderboard judgement and a source
 * classification, and every one of those is a model call that the dollar cap
 * cannot see. A loop that spends nothing at DataForSEO can spend all day at
 * Anthropic and trip no ceiling.
 *
 * Counted in calls rather than dollars on purpose. A dollar figure here would
 * be a price per call typed into this repo, which goes stale silently and
 * reads as measured when it is guessed; a call count is what the column
 * actually holds.
 *
 * Tracking runs are included. This is the whole day's model budget rather
 * than a visitor's allowance, and a tracking run spends it like anything
 * else.
 *
 * Windowed through activeWindow for the reason written above it, and paged
 * for the same reason spentSince is: PostgREST caps a select at 1000
 * rows and says so nowhere, and a ceiling that reads a truncated set
 * under-reports exactly when the day is busy enough to matter.
 *
 * Two tables, because a call does not always have a scan to belong to.
 * /api/scan/start pays for the brand read before it inserts the row that would
 * carry the cost, so an attempt that dies in between bills nothing anywhere -
 * and the failure that causes it is the repeating kind, which is precisely
 * when this ceiling is the only thing left. Those calls go to
 * model_call_debits instead and are added here. See recordModelCallDebit.
 */
export async function anthropicCallsSince(since: string): Promise<number> {
  const db = supabaseAdmin();
  const [billed, unattributed] = await Promise.all([
    selectAll<{ anthropic_calls: number | null }>((from, to) =>
      db
        .from("scans")
        .select("anthropic_calls")
        .or(activeWindow(since))
        .order("id", { ascending: true })
        .range(from, to),
    ),
    selectAll<{ calls: number | null }>((from, to) =>
      db
        .from("model_call_debits")
        .select("calls")
        .gte("created_at", since)
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);
  return (
    billed.reduce((total, r) => total + Number(r.anthropic_calls ?? 0), 0) +
    unattributed.reduce((total, r) => total + Number(r.calls ?? 0), 0)
  );
}

/**
 * Record model calls that no scan row can carry.
 *
 * Called from the two exits in /api/scan/start that can happen after the brand
 * read has been paid for and before the insert lands: the read itself throwing,
 * and the insert failing. Both used to leave the calls invisible to
 * anthropicCallsSince, which is the ceiling written to stop a bad hour
 * repeating - so the worse the hour, the less of it the ceiling could see.
 *
 * Never throws. This runs on a path that is already failing and already has a
 * sentence to give the visitor; turning a lost debit into a second error would
 * replace an accurate 502 with a 500 and tell them less. A debit that does not
 * land is logged and the count is low by that much, which is the same place we
 * were before this existed.
 *
 * Nothing is written when `calls` is zero: the row would say only that a
 * request failed, which the log already says, and the check constraint on the
 * table refuses it anyway.
 */
export async function recordModelCallDebit(entry: {
  calls: number;
  reason: string;
  domain?: string;
  ipHash?: string;
}): Promise<void> {
  if (entry.calls <= 0) return;
  try {
    const { error } = await supabaseAdmin().from("model_call_debits").insert({
      calls: entry.calls,
      reason: entry.reason,
      domain: entry.domain ?? null,
      ip_hash: entry.ipHash ?? null,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.warn(
      `[scan] could not record ${entry.calls} unattributed model call(s) (${entry.reason}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
