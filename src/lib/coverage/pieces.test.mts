import assert from "node:assert/strict";
import { test } from "node:test";

import { comparableDomain, comparableUrl, coveragePieces } from "./pieces.ts";

/**
 * The per-piece reading, which is the finding a PR agency came for.
 *
 * The rule these tests hold is the separation: a page cited and a publication
 * cited are two different claims, and the second must never be rendered as the
 * first. An agency that placed an article on a title the engines were already
 * citing for something else is the case this exists to tell apart.
 */

const ENGINES = ["google_aio", "chatgpt", "gemini", "perplexity"] as const;

test("a URL is compared without its scheme, www, trailing slash or campaign tags", () => {
  const same = [
    "https://www.example.com/news/story",
    "http://example.com/news/story/",
    "example.com/news/story",
    "https://example.com/news/story?utm_source=newsletter",
    "https://EXAMPLE.com/News/Story#top",
  ].map(comparableUrl);
  assert.deepEqual(new Set(same).size, 1, "these are one page and compared as five: " + [...new Set(same)].join(", "));
  assert.equal(same[0], "example.com/news/story");
});

test("two different pages on one site stay different", () => {
  assert.notEqual(comparableUrl("example.com/a"), comparableUrl("example.com/b"));
});

test("something that will not parse is not a crash and matches nothing", () => {
  assert.equal(comparableUrl("not a url at all"), "not a url at all");
  assert.equal(comparableUrl(""), "");
  assert.equal(comparableDomain("  WWW.Example.com/ "), "example.com");
});

test("an engine that cited the page is a page finding, not a publication one", () => {
  const pieces = coveragePieces(
    [{ url: "https://www.example.com/news/story", source_domain: "example.com" }],
    [{ source_domain: "example.com", url: "https://example.com/news/story?utm_campaign=x", engine: "chatgpt" }],
    ENGINES,
  );
  assert.deepEqual(pieces[0].pageEngines, ["chatgpt"]);
  assert.deepEqual(
    pieces[0].publicationEngines,
    [],
    "the engine cited the page, so counting it under the publication as well reports one finding twice",
  );
});

test("an engine that cited the site but a different page is a publication finding only", () => {
  const pieces = coveragePieces(
    [{ url: "https://example.com/news/story", source_domain: "example.com" }],
    [{ source_domain: "example.com", url: "https://example.com/something/else", engine: "gemini" }],
    ENGINES,
  );
  assert.deepEqual(
    pieces[0].pageEngines,
    [],
    "a different page on the same title is not the placement - this is the claim the module exists to keep apart",
  );
  assert.deepEqual(pieces[0].publicationEngines, ["gemini"]);
});

test("a citation with no URL counts for the publication and for no page", () => {
  // Gemini is the case: it returns `sources: null` and the pipeline stores the
  // domain it could determine with no page beside it.
  const pieces = coveragePieces(
    [{ url: "https://example.com/news/story", source_domain: "example.com" }],
    [{ source_domain: "example.com", url: null, engine: "gemini" }],
    ENGINES,
  );
  assert.deepEqual(pieces[0].pageEngines, []);
  assert.deepEqual(pieces[0].publicationEngines, ["gemini"]);
});

test("an engine outside the reading's own set is dropped rather than rendered", () => {
  const pieces = coveragePieces(
    [{ url: "https://example.com/a", source_domain: "example.com" }],
    [
      { source_domain: "example.com", url: "https://example.com/a", engine: "claude" },
      { source_domain: "example.com", url: "https://example.com/a", engine: "chatgpt" },
    ],
    ENGINES,
  );
  assert.deepEqual(
    pieces[0].pageEngines,
    ["chatgpt"],
    "a reading that did not read claude must not report a claude citation",
  );
});

test("engines come back in the reading's own order, not the citation table's", () => {
  const pieces = coveragePieces(
    [{ url: "https://example.com/a", source_domain: "example.com" }],
    [
      { source_domain: "example.com", url: "https://example.com/a", engine: "perplexity" },
      { source_domain: "example.com", url: "https://example.com/a", engine: "google_aio" },
    ],
    ENGINES,
  );
  assert.deepEqual(pieces[0].pageEngines, ["google_aio", "perplexity"]);
});

test("a piece nothing cited comes back with both lists empty rather than missing", () => {
  const pieces = coveragePieces(
    [
      { url: "https://example.com/a", source_domain: "example.com" },
      { url: "https://other.com/b", source_domain: "other.com" },
    ],
    [{ source_domain: "example.com", url: "https://example.com/a", engine: "chatgpt" }],
    ENGINES,
  );
  assert.equal(pieces.length, 2, "every uploaded piece gets a row - a dropped one reads as never uploaded");
  assert.deepEqual(pieces[1].pageEngines, []);
  assert.deepEqual(pieces[1].publicationEngines, []);
  assert.equal(pieces[1].url, "https://other.com/b", "the row shows the URL as uploaded, not the normalised form");
});

test("upload order is kept", () => {
  const urls = ["https://a.com/1", "https://b.com/2", "https://c.com/3"];
  const pieces = coveragePieces(
    urls.map((url) => ({ url, source_domain: new URL(url).hostname })),
    [],
    ENGINES,
  );
  assert.deepEqual(pieces.map((p) => p.url), urls);
});
