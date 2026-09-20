import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_COVERAGE_ROWS, parseCoverageCsv } from "./csv.ts";

/**
 * The coverage list is one half of the comparison this whole feature makes. If
 * it disagrees with the other half about what a domain is, the reading says a
 * placement was not cited when it was - which is the worst answer this page can
 * give, because it is wrong in the direction the reader would act on.
 *
 * So the tests below are mostly about that agreement, and about the files that
 * actually arrive rather than a well-formed one.
 */

test("a bare list of links is a coverage list", () => {
  const out = parseCoverageCsv("https://www.trade-title.com/piece\nhttps://national.co.uk/news/item");
  assert.deepEqual(out.rows, [
    { url: "https://www.trade-title.com/piece", source_domain: "trade-title.com" },
    { url: "https://national.co.uk/news/item", source_domain: "national.co.uk" },
  ]);
  assert.equal(out.skipped, 0);
});

test("the URL is found whichever column it is in, and a header is just a skipped line", () => {
  const csv = [
    "Title,URL,Published",
    '"Retailer settles same-day, finally",https://trade-title.com/piece,2026-03-01',
    "Something with no link at all,,2026-03-02",
  ].join("\n");
  const out = parseCoverageCsv(csv);
  assert.deepEqual(out.rows, [{ url: "https://trade-title.com/piece", source_domain: "trade-title.com" }]);
  // The header and the row with no link. Counted, so the page can say so.
  assert.equal(out.skipped, 2);
});

test("a quoted field containing a comma does not shift the columns", () => {
  const out = parseCoverageCsv('"Hats, gloves and scarves",https://trade-title.com/a');
  assert.deepEqual(out.rows, [{ url: "https://trade-title.com/a", source_domain: "trade-title.com" }]);
});

test("a doubled quote inside a quoted field is a literal quote", () => {
  const out = parseCoverageCsv('"He said ""yes""",https://trade-title.com/b');
  assert.deepEqual(out.rows, [{ url: "https://trade-title.com/b", source_domain: "trade-title.com" }]);
});

/**
 * The agreement that matters. `collectCitations` files a cited source under
 * `normalizeDomain`, so a placed page has to land on the same string or the
 * match fails on rows that are the same site.
 */
test("the stored domain is the one a citation would be filed under", () => {
  const out = parseCoverageCsv(
    ["https://WWW.Trade-Title.com/Piece", "http://trade-title.com:8080/other", "trade-title.com/third"].join("\n"),
  );
  assert.deepEqual(
    out.rows.map((r) => r.source_domain),
    ["trade-title.com", "trade-title.com", "trade-title.com"],
  );
});

test("the query-string @ and the backslash cannot make a placement somebody else's domain", () => {
  const out = parseCoverageCsv(
    ["https://trade-title.com?email=me@other.com", "https://trade-title.com\\@evil.com"].join("\n"),
  );
  assert.deepEqual(
    out.rows.map((r) => r.source_domain),
    ["trade-title.com", "trade-title.com"],
  );
});

test("three pieces on one title are three placements", () => {
  const out = parseCoverageCsv(
    ["https://trade-title.com/a", "https://trade-title.com/b", "https://trade-title.com/c"].join("\n"),
  );
  assert.equal(out.rows.length, 3);
});

test("the same url twice is one placement", () => {
  const out = parseCoverageCsv(["https://trade-title.com/a", "https://trade-title.com/a"].join("\n"));
  assert.equal(out.rows.length, 1);
  // A duplicate is not a line we failed to read, so it is not reported as one.
  assert.equal(out.skipped, 0);
});

test("a prose cell that happens to name a publication is not a placed page", () => {
  // "Publication" columns carry a bare title, and a row whose only dotted field
  // is a sentence must not be stored as a URL somebody placed.
  const out = parseCoverageCsv("Trade Title,Ran a piece on us. Very positive.,2026-03-01");
  assert.deepEqual(out.rows, []);
  assert.equal(out.skipped, 1);
});

test("a bare domain in a URL column is still a placement", () => {
  const out = parseCoverageCsv("Trade Title,trade-title.com,2026-03-01");
  assert.deepEqual(out.rows, [{ url: "trade-title.com", source_domain: "trade-title.com" }]);
});

/**
 * The "Publication, Headline, URL" export, which is what most coverage trackers
 * hand you. The publication cell is a bare domain and it sits *before* the URL
 * column, so a first-match rule returns the publication and never reads the
 * link. Both halves are asserted because they fail together and are two
 * different findings on the page.
 */
test("a publication column does not beat the URL column beside it", () => {
  const out = parseCoverageCsv(
    ["Publication,Headline,URL", 'trade-title.com,"Retailer X opens in Leeds",https://trade-title.com/leeds'].join("\n"),
  );
  assert.deepEqual(out.rows, [{ url: "https://trade-title.com/leeds", source_domain: "trade-title.com" }]);
});

test("three placements on one title stay three when a publication column names it", () => {
  // Deduplication is on the url, so a publication cell winning over the link
  // collapsed every placement on a title into one row - and `coverageStored`
  // reports that count straight back to whoever uploaded the file.
  const out = parseCoverageCsv(
    [
      "Publication,Headline,URL",
      "trade-title.com,Retailer X opens in Leeds,https://trade-title.com/leeds",
      "trade-title.com,Retailer X names new CFO,https://trade-title.com/cfo",
      "trade-title.com,Retailer X Q3 results,https://trade-title.com/q3",
    ].join("\n"),
  );
  assert.equal(out.rows.length, 3);
  assert.deepEqual(
    out.rows.map((r) => r.url),
    ["https://trade-title.com/leeds", "https://trade-title.com/cfo", "https://trade-title.com/q3"],
  );
  // Every one still files under the domain a citation would be filed under.
  assert.deepEqual(new Set(out.rows.map((r) => r.source_domain)), new Set(["trade-title.com"]));
});

test("a path with no scheme still outranks a bare domain in the same row", () => {
  // The fallback must be ranked on "is this located", not on "does it have a
  // scheme" - plenty of exports carry host/path with the scheme stripped.
  const out = parseCoverageCsv("trade-title.com,Retailer X opens,trade-title.com/leeds");
  assert.deepEqual(out.rows, [{ url: "trade-title.com/leeds", source_domain: "trade-title.com" }]);
});

test("carriage returns from a Windows export do not end up in the domain", () => {
  const out = parseCoverageCsv("https://trade-title.com/a\r\nhttps://national.co.uk/b\r\n");
  assert.deepEqual(
    out.rows.map((r) => r.source_domain),
    ["trade-title.com", "national.co.uk"],
  );
});

test("a list longer than the ceiling is cut and says so", () => {
  const lines: string[] = [];
  for (let i = 0; i < MAX_COVERAGE_ROWS + 20; i++) lines.push(`https://trade-title.com/piece-${i}`);
  const out = parseCoverageCsv(lines.join("\n"));
  assert.equal(out.rows.length, MAX_COVERAGE_ROWS);
  assert.equal(out.truncated, true);
});

test("a list inside the ceiling is not reported as cut", () => {
  const out = parseCoverageCsv("https://trade-title.com/a");
  assert.equal(out.truncated, false);
});

test("an empty upload is an empty list, not an error", () => {
  assert.deepEqual(parseCoverageCsv("").rows, []);
  assert.deepEqual(parseCoverageCsv("\n\n  \n").rows, []);
});
