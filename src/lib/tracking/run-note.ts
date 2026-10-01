import { type Day, type Range, formatDay } from "./figures.ts";
import type { OverviewData } from "./overview-data.ts";

/**
 * R151 (1 Oct 2026): what a screen says when the last check shown lost reads.
 * A partial run (decide.ts runOutcome) stores its failed reads unanswered, and
 * every figure skips an unanswered read, so they are left out rather than
 * counted as misses. One sentence, so the Overview and the list screens agree.
 */
export const MISSING_READS = "Some reads did not come back; they are left out of the figures, not counted as misses.";

/** The note for Clusters, Who is named and Cited pages, or null when the range holds no partial run. */
export function partialRunNote(lastRun: OverviewData["lastRun"], range: Range, today: Day): string | null {
  if (lastRun?.status !== "partial" || lastRun.run_date < range.from || lastRun.run_date > range.to) return null;
  return `${lastRun.run_date === today ? "Today's check" : `The check on ${formatDay(lastRun.run_date)}`} was partial. ${MISSING_READS}`;
}
