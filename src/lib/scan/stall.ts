import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * When a pass that is still marked running can no longer be alive.
 *
 * Every route that starts a pass declares `maxDuration = 300`, and the
 * pipeline gives itself 270s and then writes `failed` itself. So the only way
 * a row is left at `running` is the one failure the pipeline cannot catch: the
 * function was killed by the platform with the row mid-flight. Past 300s from
 * the moment the pass stamped its start, nothing server-side can move that row
 * ever again.
 *
 * 330s, so thirty seconds of margin over the ceiling. The margin can be this
 * small because there is no clock skew to cover: `started_at`, `queued_at` and
 * `unlocked_at` are all written as `new Date().toISOString()` by the app, and
 * compared here against `Date.now()` in the app. Postgres `now()` never enters
 * it, so the only skew is between two app instances, which is NTP-tight.
 *
 * Deliberately *under* ScanFlow's six-minute `STUCK_MS`. That ordering is the
 * point: by the time the progress screen gives up and offers "you can run it
 * again", the row is already provably dead, so the confirm route accepts the
 * re-run instead of handing back the `running` it is stuck on. With the two
 * numbers the other way round, that offer was a loop - see the note in
 * worklog.md.
 */
export const STALL_AFTER_MS = 330_000;

/** The instant a stamp has to predate for its pass to be provably dead. */
export function stallCutoffIso(now: number = Date.now()): string {
  return new Date(now - STALL_AFTER_MS).toISOString();
}

/**
 * The stamp that says when the pass in question started counting.
 *
 * `running` is claimed with `started_at`. `queued` is stamped with `queued_at`
 * by the confirm route. A null stamp is never treated as stale: it means we
 * cannot date this row, and failing a scan we cannot date is the one direction
 * this must not get wrong. Rows queued before `queued_at` existed therefore
 * stay as they are rather than being reaped on a guess.
 */
export function stallStamp(row: { status?: string | null; started_at?: string | null; queued_at?: string | null }):
  | string
  | null {
  if (row.status === "running") return row.started_at ?? null;
  if (row.status === "queued") return row.queued_at ?? null;
  return null;
}

/**
 * Whether the free pass on this row is provably dead.
 *
 * Read-only, and used on the two paths that decide what a visitor is shown: the
 * status poll and the server render of /scan/[token]. Both used to report the
 * column verbatim, so a killed pass put the visitor on the progress screen -
 * on first load and again on every reload - for a fresh six minutes each time,
 * waiting on a row nothing would ever touch.
 */
export function isFreePassDead(
  row: { status?: string | null; started_at?: string | null; queued_at?: string | null },
  now: number = Date.now(),
): boolean {
  const stamp = stallStamp(row);
  if (!stamp) return false;
  const at = Date.parse(stamp);
  // An unparseable stamp is the null case: we cannot date the row.
  if (Number.isNaN(at)) return false;
  return now - at > STALL_AFTER_MS;
}

/**
 * Whether the email-gated pass on this row is provably dead.
 *
 * Dated by `unlocked_at`, which needs no new column: completeUnlock stamps it
 * and then moves `gated_status` off 'none' a few statements later, in the same
 * request. It also throws `UnlockNotStamped` if that stamp does not land, so
 * `gated_status` is only ever queued or running on a row that has one - and a
 * null would read as "cannot date", which leaves the row alone.
 */
export function isGatedPassDead(
  row: { gated_status?: string | null; unlocked_at?: string | null },
  now: number = Date.now(),
): boolean {
  if (row.gated_status !== "queued" && row.gated_status !== "running") return false;
  if (!row.unlocked_at) return false;
  const at = Date.parse(row.unlocked_at);
  if (Number.isNaN(at)) return false;
  return now - at > STALL_AFTER_MS;
}

/**
 * The sentence left in `scans.error` and `scans.gated_error` by a reap.
 *
 * Written for the admin page, which is the only thing that reads those
 * columns - the public status poll deliberately stopped handing them out. It
 * has to be distinguishable from a pass that failed and said why, because the
 * two have different causes: this one means the function was killed, which is
 * a platform or budget question, not a vendor or a query.
 */
export const REAPED_FREE = "the run was stopped before it could record a result, and was closed by the stall sweep";
export const REAPED_GATED =
  "the deeper check was stopped before it could record a result, and was closed by the stall sweep";

type Reaped = { ids: string[] };

/**
 * Narrow a sweep to a single scan, or leave it sweeping the table.
 *
 * A helper rather than an `if` around the await, because the writes sweep in
 * `writes.test.mts` reads the source and wants the error bound to the statement
 * the write is in - and it is right to. Building the query into a `let` and
 * awaiting it several lines later is the shape that hides a discarded error,
 * so a reap written that way is indistinguishable from one that ignores its
 * result. This keeps the whole write, its filters and its error on one
 * statement; the conditional filter goes in here instead.
 */
function scopeToScan<T extends { eq(column: string, value: string): T }>(q: T, scanId?: string): T {
  return scanId ? q.eq("id", scanId) : q;
}

/**
 * Close the free pass on rows whose pass is provably dead.
 *
 * Two updates rather than one, because the two states are dated by different
 * columns and PostgREST cannot express "running by started_at OR queued by
 * queued_at" in a single filter without an `or(and(...),and(...))` string that
 * is easy to get subtly wrong and impossible to read.
 *
 * Both are compare-and-swap: the status is in the filter, so a row that has
 * moved since it was read is not written over. `.select("id")` is what makes
 * the outcome readable at all - PostgREST answers an UPDATE that matched no
 * rows with a 2xx, so without it a reap that did nothing is indistinguishable
 * from one that closed a scan.
 *
 * `scanId` scopes it to one row for the confirm route, which reaps only the
 * scan in front of it. Omitted, it sweeps the table for the cron.
 *
 * Throws rather than swallowing: both callers answer for the result, one of
 * them by telling a visitor their scan can be run again.
 */
export async function reapStalledFreePass(
  db: SupabaseClient,
  opts: { scanId?: string; now?: number } = {},
): Promise<Reaped> {
  const cutoff = stallCutoffIso(opts.now);
  const ids: string[] = [];

  for (const [status, column] of [
    ["running", "started_at"],
    ["queued", "queued_at"],
  ] as const) {
    const { data, error } = await scopeToScan(
      db.from("scans").update({ status: "failed", error: REAPED_FREE }).eq("status", status).lt(column, cutoff),
      opts.scanId,
    ).select("id");
    if (error) throw new Error(`could not close stalled ${status} scans: ${error.message}`);
    for (const row of data ?? []) ids.push(row.id as string);
  }

  return { ids };
}

/**
 * Close the gated pass on rows whose pass is provably dead.
 *
 * This is the one the pipeline's own comment calls worse, and it is: the gated
 * claim is `.eq("gated_status", "queued")`, so a row left at `running` can
 * never be picked up by anything again, and there is no second run to fall back
 * on the way the free pass has one. That is the pass somebody gave an email
 * address for, and the report screen goes on saying the engines are still
 * running for as long as they keep it open.
 *
 * Marking it failed is what the screen already knows how to render: ScanFlow
 * reads `gated_status === "failed"` and says so, rather than promising a
 * result that is not coming.
 */
export async function reapStalledGatedPass(
  db: SupabaseClient,
  opts: { scanId?: string; now?: number } = {},
): Promise<Reaped> {
  const cutoff = stallCutoffIso(opts.now);

  const { data, error } = await scopeToScan(
    db
      .from("scans")
      .update({ gated_status: "failed", gated_error: REAPED_GATED })
      .in("gated_status", ["queued", "running"])
      .lt("unlocked_at", cutoff),
    opts.scanId,
  ).select("id");
  if (error) throw new Error(`could not close stalled gated passes: ${error.message}`);

  return { ids: (data ?? []).map((row) => row.id as string) };
}
