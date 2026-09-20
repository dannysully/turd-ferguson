/**
 * How many answers cited each domain on one reading.
 *
 * Split out of `reading.ts` rather than written inside it for the reason
 * `ip-range.ts` was split out of `address.ts` and `opportunities.ts` out of
 * `unlock.ts`: that module opens with `import "server-only"`, which makes it
 * unloadable under `node --test`, so counting logic living there could not be
 * checked. This is rows in and a map out, and nothing else.
 */

/** The citation columns the per-domain count is derived from. */
export type CitationCountRow = { source_domain: string; question_id: string; engine: string };

/**
 * One count per `(source_domain, question_id, engine)` - the key every other
 * reader of `scan_citations` already uses.
 *
 * This used to increment on every physical row, which is not what
 * `ReadingSource.citations` declares itself to be - "how many answers cited it,
 * across every question and engine" - and the two came apart in the one case
 * the table allows. `scan_citations` has no unique key and the pipeline
 * inserts rather than upserts, so a pass that stored its citations and then
 * threw leaves those rows behind and the retry adds a second copy on top.
 * Every other reader survives that because it dedupes: `scan_teaser` selects a
 * distinct triple, `buildUnlockPayload` and `deriveOpportunities` key a set on
 * these same three columns. This reader did not, so a retried reading reported
 * every source as cited twice as often as it was - and `base.sources` is
 * sorted on that number, so the order of the table was wrong as well as the
 * figures in it.
 *
 * Deduping here rather than deleting the superseded rows is deliberate. That
 * delete is an open question for Danny (blocked.md item 11) and this reader
 * does not need it answered to be correct.
 */
export function countCitedDomains(rows: CitationCountRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  for (const c of rows) {
    const key = `${c.source_domain}|${c.question_id}|${c.engine}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counts.set(c.source_domain, (counts.get(c.source_domain) ?? 0) + 1);
  }
  return counts;
}
