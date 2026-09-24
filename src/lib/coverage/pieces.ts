/**
 * Each piece of coverage, and what the engines did with it.
 *
 * The reading already answers this by domain: how many placed domains were
 * cited, and which were not. That is the right shape for a 500-row upload and
 * the wrong shape for the question a PR agency actually asks, which is about a
 * piece - *this* article, the one they placed on Tuesday. A domain answer
 * cannot tell them whether the engines cited the placement or something else
 * the same publication had already written.
 *
 * So this counts two matches per piece and keeps them apart:
 *
 * - **the page** - an engine cited that URL. The strong finding.
 * - **the publication** - an engine cited the domain but a different page on
 *   it. Worth knowing and not the same claim, because the publication may have
 *   been cited for something that has nothing to do with the campaign.
 *
 * Kept apart rather than summed because collapsing them is how a tool starts
 * telling an agency their placement was cited when what was cited was a
 * five-year-old article on the same site.
 *
 * No `server-only`: pure functions over rows, so `npm run check` executes them.
 *
 * ## What this must never be turned into
 *
 * A reading has no before. Nothing here returns a delta, a lift, or anything
 * shaped like one, and the page must not phrase what it does return as an
 * effect of the coverage. An engine citing a placed page is a fact about one
 * reading; it is not evidence the placement caused it, and there is no earlier
 * reading to compare against on a first run. `blocked.md` has the retention
 * and comparison decisions; this module is deliberately incapable of the
 * claim.
 */

import type { Engine } from "@/lib/scan/engines";

export type CoveragePieceInput = {
  url: string;
  source_domain: string;
};

export type CitationRow = {
  source_domain: string;
  url: string | null;
  engine: string;
};

export type CoveragePiece = {
  /** As uploaded, for display. Never the normalised form. */
  url: string;
  /** The publication, as stored beside the URL at upload time. */
  domain: string;
  /** Engines that cited this exact page. */
  pageEngines: Engine[];
  /** Engines that cited this publication, but a different page on it. */
  publicationEngines: Engine[];
};

/**
 * A URL reduced to the part worth comparing: host without `www.`, and path
 * without a trailing slash. Lower-cased.
 *
 * Query and fragment are dropped, and that is a judgement rather than an
 * oversight. Coverage exports carry `?utm_source=` on almost every row and an
 * engine citing the same article will not have it, so comparing the whole
 * string would report a page as uncited because a campaign tag was on one copy
 * of it. The cost is that two genuinely different pages distinguished only by
 * a query string collapse into one - a paginated archive is the realistic
 * case, and it is not what anybody places coverage on.
 *
 * Anything that will not parse comes back lower-cased and trimmed instead of
 * throwing. A row that is not a URL cannot match a citation that is, which is
 * the correct outcome, and it must not take the reading down.
 */
export function comparableUrl(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  try {
    const u = new URL(text.includes("://") ? text : "https://" + text);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "");
    return host + path.toLowerCase();
  } catch {
    return text.toLowerCase();
  }
}

/** The same normalisation for a bare domain, so both sides of a match agree. */
export function comparableDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^www\./, "").replace(/\/+$/, "");
}

/**
 * One row per piece of coverage, in upload order.
 *
 * `known` is the engine set the reading actually read, and a citation naming
 * anything outside it is dropped rather than rendered. This is the rule the
 * rest of the reading keeps: a row whose engine the union does not know is a
 * row we cannot label, and labelling it anyway is how a page ends up naming an
 * engine the scan never asked.
 */
export function coveragePieces(
  coverage: CoveragePieceInput[],
  citations: CitationRow[],
  known: readonly Engine[],
): CoveragePiece[] {
  const allowed = new Set<string>(known);

  /** engine sets by cited page, and by cited publication. */
  const byPage = new Map<string, Set<string>>();
  const byDomain = new Map<string, Set<string>>();

  for (const c of citations) {
    if (!allowed.has(c.engine)) continue;
    const domain = comparableDomain(c.source_domain ?? "");
    if (domain) {
      const set = byDomain.get(domain) ?? new Set<string>();
      set.add(c.engine);
      byDomain.set(domain, set);
    }
    // `url` is nullable on the citation table: an engine that gave a domain
    // and no page still counts as having cited the publication, and cannot
    // count as having cited any particular page on it.
    const page = c.url ? comparableUrl(c.url) : "";
    if (page) {
      const set = byPage.get(page) ?? new Set<string>();
      set.add(c.engine);
      byPage.set(page, set);
    }
  }

  const order = (set: Set<string> | undefined): Engine[] =>
    set ? (known.filter((e) => set.has(e)) as Engine[]) : [];

  return coverage.map((piece) => {
    const page = comparableUrl(piece.url);
    const domain = comparableDomain(piece.source_domain);
    const pageEngines = order(byPage.get(page));
    const onDomain = order(byDomain.get(domain));
    // The publication column is the engines that cited the site but NOT this
    // page. An engine in both would otherwise be counted twice and read as two
    // findings, when the stronger one is the only one that is true.
    const seen = new Set<string>(pageEngines);
    return {
      url: piece.url,
      domain: piece.source_domain,
      pageEngines,
      publicationEngines: onDomain.filter((e) => !seen.has(e)),
    };
  });
}
