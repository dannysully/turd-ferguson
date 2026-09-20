import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ENGINES,
  knownEngines,
  parseChatGpt,
  parseGoogleAio,
  parsePerplexity,
  stripMarkdownLinks,
} from "./engines.ts";

/**
 * The parsers turn one vendor's JSON into every number on the report:
 * `answered` is the measured-absence claim the free result leads with,
 * `prose` is the only text brand matching ever sees, and `citations` become
 * the source list and - through `deriveOpportunities` - the gated placement
 * list.
 *
 * The header of engines.ts has always said these are "testable against
 * recorded responses". They were not, until 20 September 2026: the module
 * imported "./domain" without an extension, which Node's runner cannot
 * resolve, so nothing here could be loaded at all.
 *
 * The shapes below are the ones the fields are read out of, trimmed to what
 * each assertion needs.
 */

const aio = (overview: Record<string, unknown> | null, extra: Record<string, unknown> = {}) => ({
  items: [
    { type: "organic", rank_group: 1, domain: "example.com", url: "https://example.com/a" },
    ...(overview ? [{ type: "ai_overview", ...overview }] : []),
  ],
  ...extra,
});

test("an Overview with prose is an answer, with its references", () => {
  const read = parseGoogleAio(
    aio({
      items: [
        {
          text: "Vibe Retail is widely recommended.",
          references: [{ domain: "which.co.uk", url: "https://which.co.uk/x", title: "Best shops" }],
        },
      ],
    }),
  );

  assert.equal(read.answered, true);
  assert.equal(read.prose, "Vibe Retail is widely recommended.");
  assert.deepEqual(
    read.citations.map((c) => c.source_domain),
    ["which.co.uk"],
  );
});

test("an Overview element with no prose is not an answer", () => {
  /**
   * The defect. `load_async_ai_overview` fetches the expanded Overview in a
   * second step, and when that step does not land the element still arrives
   * with no `items` and so no text. That was recorded as `answered: true` with
   * empty prose - which names nobody - so the scan stated that Google had
   * shown an Overview and left the brand out of it.
   */
  const read = parseGoogleAio(aio({}));

  assert.equal(read.answered, false);
  assert.equal(read.prose, "");
  assert.deepEqual(read.raw, { claimed_but_absent: true, empty_overview: true });
});

test("an empty Overview is retryable, and says which of the two it was", () => {
  // The caller retries once on `claimed_but_absent`, so the empty element has
  // to report it - and `empty_overview` is what separates "we did not get it"
  // from "Google did not show one".
  const absent = parseGoogleAio(aio(null, { item_types: ["ai_overview", "organic"] }));
  assert.equal(absent.answered, false);
  assert.deepEqual(absent.raw, { claimed_but_absent: true });

  const none = parseGoogleAio(aio(null, { item_types: ["organic"] }));
  assert.equal(none.answered, false);
  assert.deepEqual(none.raw, { claimed_but_absent: false });
});

test("the organic results survive every Overview outcome", () => {
  // They come from the same response and are what gives the report a Google
  // rank for a question the Overview did not answer.
  for (const result of [aio({}), aio(null), aio({ items: [{ text: "Something." }] })]) {
    assert.deepEqual(parseGoogleAio(result).organic, [
      { domain: "example.com", url: "https://example.com/a", rank: 1 },
    ]);
  }
});

test("a scraper answer with no text is not an answer", () => {
  assert.equal(parseChatGpt({ items: [{ type: "text", markdown: "" }] }).answered, false);
  assert.equal(parseChatGpt({ items: [] }).answered, false);
  assert.equal(parseChatGpt(null).answered, false);
});

test("a local business panel counts towards being named", () => {
  // Panels name suppliers without citing a page, and those names are part of
  // the answer.
  const read = parseChatGpt({
    items: [{ type: "panel", items: [{ title: "Vibe Retail" }], markdown: "" }],
  });
  assert.equal(read.answered, true);
  assert.match(read.prose, /Vibe Retail/);
});

test("a citation keeps its url when its domain field is empty", () => {
  // `||` and not `??`, deliberately: a JSON API with no value for a string
  // field returns an empty one at least as often as it omits the key, and an
  // empty domain used to take the whole citation with it.
  const read = parsePerplexity({
    items: [
      {
        sections: [
          { text: "Try them.", annotations: [{ url: "https://which.co.uk/x", title: "Best shops" }] },
        ],
      },
    ],
  });
  assert.deepEqual(
    read.citations.map((c) => c.source_domain),
    ["which.co.uk"],
  );
});

test("a citation is deduplicated on domain and url together", () => {
  const read = parsePerplexity({
    items: [
      {
        sections: [
          {
            text: "Try them.",
            annotations: [
              { url: "https://which.co.uk/x" },
              { url: "https://which.co.uk/x" },
              { url: "https://which.co.uk/y" },
            ],
          },
        ],
      },
    ],
  });
  assert.equal(read.citations.length, 2);
  assert.deepEqual(
    read.citations.map((c) => c.position),
    [1, 2],
  );
});

/**
 * The either/or. Both scraper parsers used to pick one source list and throw
 * the other away - `collectCitations(topLevel.length ? topLevel : perItem)`,
 * and the same shape in `parseGoogleAio` against `aio.references`. Where a
 * response carried both, whichever lost was gone, and those citations are the
 * report's source list and the gated placement list.
 *
 * These four fix the behaviour in place. The first two are the defect; the
 * third is the property that makes merging safe to ship without a recorded
 * response to check it against - a response with only top-level sources comes
 * out byte for byte as it did before, positions included.
 */
test("a scraper answer merges top-level and per-item sources", () => {
  const read = parseChatGpt({
    items: [{ markdown: "Try them.", sources: [{ domain: "which.co.uk", url: "https://which.co.uk/x" }] }],
    sources: [{ domain: "trustpilot.com", url: "https://trustpilot.com/a" }],
  });

  assert.deepEqual(
    read.citations.map((c) => c.source_domain),
    ["trustpilot.com", "which.co.uk"],
  );
});

test("a source in both scraper lists is one citation, not two", () => {
  const read = parseChatGpt({
    items: [{ markdown: "Try them.", sources: [{ domain: "which.co.uk", url: "https://which.co.uk/x" }] }],
    sources: [{ domain: "which.co.uk", url: "https://which.co.uk/x" }],
  });

  assert.equal(read.citations.length, 1);
  assert.deepEqual(
    read.citations.map((c) => c.position),
    [1],
  );
});

test("a scraper answer with only top-level sources is unchanged by the merge", () => {
  const read = parseChatGpt({
    items: [{ markdown: "Try them." }],
    sources: [
      { domain: "trustpilot.com", url: "https://trustpilot.com/a" },
      { domain: "which.co.uk", url: "https://which.co.uk/x" },
    ],
  });

  assert.deepEqual(
    read.citations.map((c) => [c.source_domain, c.position]),
    [
      ["trustpilot.com", 1],
      ["which.co.uk", 2],
    ],
  );
});

test("an Overview merges top-level and element-level references", () => {
  const read = parseGoogleAio(
    aio({
      references: [{ domain: "trustpilot.com", url: "https://trustpilot.com/a" }],
      items: [
        {
          text: "Vibe Retail is widely recommended.",
          references: [{ domain: "which.co.uk", url: "https://which.co.uk/x" }],
        },
      ],
    }),
  );

  assert.equal(read.answered, true);
  assert.deepEqual(
    read.citations.map((c) => c.source_domain),
    ["trustpilot.com", "which.co.uk"],
  );
});

test("link URLs do not survive into the prose brand matching reads", () => {
  // A brand whose name appears only inside a URL must not count as named.
  assert.equal(stripMarkdownLinks("Try [Vibe Retail](https://viberetail.com)."), "Try Vibe Retail.");
  assert.equal(stripMarkdownLinks("See https://viberetail.com for more."), "See for more.");
});

/* ------------------------------------------------------------------ *
 * knownEngines - the one door every reader of a stored list goes through
 * ------------------------------------------------------------------ */

test("a repeated name in a stored engine list is read once", () => {
  /**
   * The behaviour. `pipeline.ts` has always done this to `scans.engines`
   * before asking anything; three readers did not, and each of them then
   * disagreed with the pass about the same row. `engine-list-readers.test.mts`
   * is what holds the walk - this only holds the value, and on its own it
   * would have passed on the tree that carried the defect.
   */
  assert.deepEqual(knownEngines(["chatgpt", "chatgpt", "google_aio"]), ["chatgpt", "google_aio"]);
});

test("the first occurrence keeps its place, so the grid's columns do not reshuffle", () => {
  // The campaign grid's cells are built by walking this list, and the page
  // renders one column per entry in this order.
  assert.deepEqual(knownEngines(["google_aio", "chatgpt", "google_aio"]), ["google_aio", "chatgpt"]);
});

test("a name the union does not know is dropped, not passed through", () => {
  assert.deepEqual(knownEngines(["chatgpt", "gemini_ultra_9", "bard"]), ["chatgpt"]);
});

test("a column that is null or absent reads as an empty list, not a throw", () => {
  // jsonb holds whatever was typed into it and the column is nullable, so both
  // reach this from a real row.
  assert.deepEqual(knownEngines(null), []);
  assert.deepEqual(knownEngines(undefined), []);
});

test("every engine the union knows survives the door", () => {
  // A floor derived from ENGINES rather than typed: a filter that quietly
  // stopped recognising one would otherwise look like a clean dedupe.
  assert.deepEqual(knownEngines([...ENGINES]), [...ENGINES]);
});
