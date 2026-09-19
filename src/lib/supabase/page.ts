/**
 * PostgREST answers a select with at most `db-max-rows` rows - 1000 on a
 * default Supabase project - and says so nowhere in the response. A truncated
 * answer and a genuinely short one are the same shape, so an unpaged select
 * over a table that grows with the scan reads as complete when it is not.
 *
 * The retention purge hit this first and it cleared the first thousand stale
 * scans and silently left the rest. The same ceiling sits under the per-scan
 * reads: citations are questions x engines x however many sources each answer
 * cited, which is the one table on a scan that has no small bound.
 *
 * Pass a page function rather than a builder so the caller keeps its own
 * filters and its own row type:
 *
 *     await selectAll((from, to) =>
 *       db.from("scan_citations").select("source_domain")
 *         .eq("scan_id", scanId)
 *         .order("id", { ascending: true })
 *         .range(from, to));
 *
 * Always order by the primary key. `range` is `offset` and `limit`, so without
 * an ORDER BY the order between two requests is whatever the planner chose and
 * a row can land on both pages or on neither.
 *
 * No `server-only` import, deliberately. This module holds no secret and
 * reaches nothing - it loops over a function the caller supplies - and the
 * guard that matters sits on `supabase/admin.ts`, which is what actually
 * builds the service-role client and which every caller of this goes through.
 * What the guard here did buy was that `node --test` could not load the file,
 * so the loop under the paid report and both spend ceilings could not have a
 * check on it. It has one now.
 */
export const PAGE = 1000;

/**
 * Read a whole table through a paged select, whatever the server's own row
 * ceiling is set to.
 *
 * The end of the table is a page that comes back empty, and the next offset is
 * however many rows the last page actually returned.
 *
 * It used to stop on the first page shorter than `PAGE`, which is only sound
 * if `db-max-rows` is at least `PAGE`. That is the Supabase default and it is
 * a project setting, changeable in the dashboard, readable only with the
 * dashboard or the service role key - so nothing in this repo could confirm
 * the assumption the paid report rested on, and it sat in blocked.md as a
 * question for Danny. Lowered to 500 and the old loop returns the first 500
 * citations of a scan as the whole set: the source list, share of voice, the
 * placement table and both spend ceilings all quietly read short, and the day
 * the ceilings under-report is the busy day they exist for.
 *
 * Advancing by what came back rather than by `PAGE` removes the assumption
 * instead of documenting it. The cost is one extra request per call - the
 * empty page that proves the end - which is paid on every call rather than
 * only on the truncated ones, because a short page cannot be told from a
 * capped one without asking. Callers run these inside `Promise.all`, so it is
 * one round trip added to a group, not one per table.
 */
export async function selectAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    // An empty page is the end of the table, and the only thing that is.
    if (!rows.length) return out;
    out.push(...rows);
    // Never by PAGE: the server may have given fewer than were asked for, and
    // the next offset is where this page actually ended. A row count is always
    // at least 1 here, so the offset strictly increases and the loop ends.
    from += rows.length;
  }
}
