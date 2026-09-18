/**
 * Brand name matching.
 *
 * Engines spell the same brand differently, and the leaderboard is keyed on
 * raw text, so the same company arrives several times and splits its own
 * score. On the first live scan the subject appeared twice - "London Ski Co"
 * at 24 mentions from three engines and "London Ski Co." at 12 from ChatGPT -
 * which understated the client by a third and cost them five places.
 *
 * Worse, the subject was matched with `trim().toLowerCase()`, so the spelling
 * with the full stop was not recognised as the subject at all and was filed as
 * a competitor on the client's own report.
 *
 * brandKey folds the differences that are punctuation and nothing else:
 * case, accents, spacing, ampersands, hyphens, full stops. Everything that
 * survives is a letter or a digit.
 *
 *   "London Ski Co."      -> londonskico
 *   "London Ski Co"       -> londonskico
 *   "NET-A-PORTER"        -> netaporter
 *   "Net-a-Porter"        -> netaporter
 *   "Snow + Rock"         -> snowrock
 *   "Snow+Rock"           -> snowrock
 *   "Sportalm Kitzbühel"  -> sportalmkitzbuhel
 *   "Sportalm Kitzbuhel"  -> sportalmkitzbuhel
 *
 * What it deliberately does NOT do is merge on prefixes. "Sportalm" stays
 * separate from "Sportalm Kitzbühel", and "Amundsen" from "Amundsen Sports",
 * because the same rule would merge "Snow Peak" into "Snow+Rock" and merge
 * "Moncler Grenoble" - a distinct line - into "Moncler". Under-merging leaves
 * two honest rows; over-merging invents a number nobody can check.
 */
export function brandKey(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Pick which spelling to show for a set of variants that share a key.
 *
 * Most-mentioned wins, because that is how the engines mostly wrote it. The
 * tie-breaks matter more than they look: without the all-caps rule a 6-6 tie
 * between "NET-A-PORTER" and "Net-a-Porter" resolves alphabetically and the
 * report shouts at the reader.
 */
export function pickDisplayName(variants: Map<string, number>): string {
  const rows = [...variants.entries()];
  rows.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    const aShout = a[0] === a[0].toUpperCase() && /[A-Z]/.test(a[0]);
    const bShout = b[0] === b[0].toUpperCase() && /[A-Z]/.test(b[0]);
    if (aShout !== bShout) return aShout ? 1 : -1;
    if (b[0].length !== a[0].length) return b[0].length - a[0].length;
    return a[0].localeCompare(b[0]);
  });
  return rows[0]?.[0] ?? "";
}
