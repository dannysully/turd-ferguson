/**
 * The uploaded coverage list, turned into rows.
 *
 * What a PR team has is a spreadsheet of placements. What `campaign_coverage`
 * wants is a url and the domain that url belongs to. This is the whole distance
 * between the two, and it is a pure function over a string so it can be tested
 * against the shapes that actually arrive rather than reasoned about.
 *
 * ## The domain is taken from normalizeDomain and nowhere else
 *
 * The comparison this list exists for is "did an engine cite a page we placed",
 * and the cited side of that comparison is `collectCitations` in engines.ts,
 * which files every citation under `normalizeDomain(...)`. So the placed side
 * has to use the same function or the two sides disagree about what a domain
 * is - a www prefix, a port, a trailing dot, an uppercase host, and the match
 * silently fails on rows that are the same page.
 *
 * That function also carries two fixes this parser must not re-derive: a query
 * string containing an "@" used to yield a different company's domain, and so
 * did a backslash before one. A second normaliser here would be a second copy
 * of both bugs. AGENTS.md names that hazard for the brand extractor and the
 * source classifier already, which judge the same domain differently because
 * each knows something the other does not.
 *
 * No `server-only`. Pure over a string, and `npm run check` loads it directly.
 */

import { isPlausibleDomain, normalizeDomain } from "../scan/domain.ts";

/** One placed page. `source_domain` is what a citation is matched against. */
export type CoverageRow = { url: string; source_domain: string };

export type CoverageParse = {
  rows: CoverageRow[];
  /**
   * Lines that held no usable URL, counted rather than discarded silently.
   *
   * A visitor who uploads a 60-row export and gets 11 rows back has been told
   * something about their file; the same visitor getting 11 rows and no number
   * has been told nothing, and the most likely cause - a column of page titles
   * where the URLs were expected - looks exactly like a successful upload.
   */
  skipped: number;
  /**
   * True when the file had more usable rows than `MAX_COVERAGE_ROWS`, so the
   * list is the first N rather than all of them. Said out loud for the same
   * reason: a truncated list makes a reading look like less coverage than there
   * was, and that is a finding the page would otherwise invent.
   */
  truncated: boolean;
};

/**
 * How many placements one campaign may upload.
 *
 * A ceiling rather than a judgement about campaign size. Every row is a string
 * compared against the cited domains of one reading, so the cost of a large
 * list is storage and a longer page, not model calls - but an unbounded insert
 * from an anonymous form is an unbounded insert from an anonymous form.
 */
export const MAX_COVERAGE_ROWS = 500;

/**
 * How many pieces of coverage one reading reports on, URL by URL.
 *
 * Far below `MAX_COVERAGE_ROWS`, and they answer different questions. That
 * ceiling is what an anonymous form may insert; this is what the free reading
 * will report on a row each, and a per-URL table of 500 rows is not a finding,
 * it is a spreadsheet. An agency checking a campaign has a handful of
 * placements it cares about.
 *
 * The parse still reads the whole file - the excess is dropped by the caller,
 * which is what lets the form say how many were read and how many were not.
 */
export const MAX_COVERAGE_URLS = 5;

/** The largest upload accepted, before parsing. 500 rows of URL is far under this. */
export const MAX_COVERAGE_BYTES = 512 * 1024;

/**
 * One CSV row into its fields, RFC 4180 quoting included.
 *
 * Written out rather than split on commas because a real export quotes any
 * field containing one - an article title with a comma in it is the common
 * case, and a naive split turns one row into two fields and shifts every
 * column after it. A doubled quote inside a quoted field is a literal quote.
 */
function splitRow(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === ",") {
      out.push(field);
      field = "";
      continue;
    }
    field += ch;
  }
  out.push(field);
  return out;
}

/**
 * The URL in a row, or null.
 *
 * Every field is tried rather than a column being chosen by its header,
 * because the files this takes are exports from half a dozen tools and a
 * coverage list pasted out of an email is not a CSV at all. That handles
 * "Title, URL, Date" and "URL" and a bare list of links with one rule.
 *
 * ## A located link beats a bare domain, wherever each one sits in the row
 *
 * This used to return the *first* field that normalised to a plausible domain,
 * and a "Publication" cell reading "retailweek.com" is one - so on the ordinary
 * "Publication, Headline, URL" export the publication name won and the URL
 * column was never reached. The comment here claimed that case was handled; it
 * was not, because a bare domain is deliberately accepted too and nothing
 * ranked the two.
 *
 * The cost was not the wrong url alone. Rows are deduplicated on the url, so
 * three placements on one trade title all collapsed to the single row
 * `retailweek.com` - and `coverageStored` is what the upload route reports back,
 * so a PR team who uploaded three placements was told we had stored one. That is
 * a wrong number about their own campaign, from the most ordinary file shape
 * there is.
 *
 * So a field carrying a scheme or a path is taken at once, and a bare domain is
 * only remembered as a fallback for the row - which keeps "a bare domain in a
 * URL column is still a placement" true for the exports that have no full link
 * in them at all. Where a row is nothing but bare domains the dedupe still
 * collapses repeats, and it should: there is no url there to tell two
 * placements apart.
 */
function urlIn(fields: string[]): string | null {
  let bareDomain: string | null = null;

  for (const raw of fields) {
    const value = raw.trim();
    if (!value || value.length > 2000) continue;
    if (/\s/.test(value)) continue;

    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
    const located = hasScheme || value.includes("/");
    // A field is only considered when it looks like a link: it carries a
    // scheme, or a path, or it is a bare domain.
    if (!located && !value.includes(".")) continue;
    if (!isPlausibleDomain(normalizeDomain(value))) continue;

    if (located) return value;
    bareDomain ??= value;
  }

  return bareDomain;
}

/**
 * Parse an uploaded coverage list.
 *
 * Deduplicated on the url as typed, not on the domain: three articles on the
 * same trade title are three placements and the reading should say so. What is
 * matched against a citation is the domain, and the page counts domains when it
 * reports a match - so keeping the rows apart here costs nothing and keeps the
 * uploaded list honest about what was uploaded.
 *
 * A header row needs no special case. "URL" normalises to "url", which has no
 * dot and so is not a plausible domain, and the row is skipped like any other
 * line with no link in it. That is also why `skipped` is reported rather than
 * shown as an error: one skipped line is almost always the header.
 */
export function parseCoverageCsv(text: string): CoverageParse {
  const rows: CoverageRow[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  let truncated = false;

  // \r\n, \n and a lone \r all end a line. A file saved on Windows and pasted
  // through a JSON body keeps its carriage returns, and a trailing \r on every
  // field is not a character normalizeDomain removes.
  for (const line of text.split(/\r\n|\r|\n/)) {
    if (!line.trim()) continue;

    const url = urlIn(splitRow(line));
    if (!url) {
      skipped++;
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);

    if (rows.length >= MAX_COVERAGE_ROWS) {
      truncated = true;
      break;
    }
    rows.push({ url, source_domain: normalizeDomain(url) });
  }

  return { rows, skipped, truncated };
}
