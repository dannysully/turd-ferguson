/**
 * Which of four states a campaign reading is in.
 *
 * Split out of the page for the reason `citation-count.ts` was split out of
 * `reading.ts` and `run-steps.ts` out of the three files that each held a copy:
 * a server component cannot be loaded under `node --test`, so a state machine
 * living inside one cannot be checked, and this one had a hole in it.
 *
 * ## The hole
 *
 * The page derived three booleans and let the fourth case fall through to
 * "running":
 *
 * ```
 * const running = reading ? status === "queued" || status === "running" : true;
 * ```
 *
 * `status` has more values than those. `addReading` inserts a reading at
 * `pending_topic` and only moves it to `queued` once the questions are stored,
 * so a throw in between leaves a row no pass will ever claim. Nothing closes it
 * afterwards: `stallStamp` returns null for `pending_topic` deliberately, and
 * `reapStalled` sweeps only `queued` and `running`.
 *
 * Defaulting that to "running" mounts a 5s `router.refresh()` poll that can
 * never terminate, and hides the re-run button - which was gated on
 * `complete || failed`. The single row that needs a person to start it again
 * was the single row with no control to do it, under copy promising the page
 * would fill in by itself. `readCampaign` takes the newest row as `current`, so
 * one bricked reading also shadows an earlier good one.
 *
 * `stalled` is therefore defined as "none of the other three" rather than as
 * `status === "pending_topic"`. A status added to the enum later lands in the
 * state that has a way out of it instead of back in the endless poll.
 */

/** The four states, exactly one of which is true for any reading. */
export type ReadingState = "running" | "complete" | "failed" | "stalled";

/**
 * @param status the reading's stored status, or null when the campaign has no
 *   reading row at all - which is also `stalled`, not `running`: there is
 *   nothing in flight to wait for.
 */
export function readingState(status: string | null | undefined): ReadingState {
  if (status === "queued" || status === "running") return "running";
  if (status === "complete") return "complete";
  if (status === "failed") return "failed";
  return "stalled";
}

/** Only a reading actually in flight should mount the refresh poll. */
export function shouldPoll(state: ReadingState): boolean {
  return state === "running";
}

/**
 * When the re-run button is offered.
 *
 * Everything except a pass already in flight. That matches the rerun route's
 * own guard, which refuses only `queued` and `running` (and not even those once
 * `isFreePassDead` says the platform killed it) - so the button is shown in
 * exactly the states the API would accept it from, and never in one where it
 * would come back 409.
 */
export function canRerun(state: ReadingState): boolean {
  return state !== "running";
}
