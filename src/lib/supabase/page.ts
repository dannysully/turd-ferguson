import "server-only";

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
 */
export const PAGE = 1000;

export async function selectAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    // A short page is the end of the table. A full one is indistinguishable
    // from a truncated one, which is the whole reason this function exists.
    if (rows.length < PAGE) return out;
  }
}
