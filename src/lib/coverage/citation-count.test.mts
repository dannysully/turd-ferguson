import assert from "node:assert/strict";
import { test } from "node:test";

import { countCitedDomains } from "./citation-count.ts";

/**
 * `ReadingSource.citations` is the only per-source number on a campaign
 * reading, and `base.sources` is sorted on it - so getting it wrong reorders
 * the table as well as misstating it.
 *
 * The defect it had: it counted physical rows. `scan_citations` has no unique
 * key and the pipeline inserts rather than upserts, so a pass that stored its
 * citations and then threw leaves those rows behind and the retry writes a
 * second copy. The campaign benchmark is the live feature that rides on this -
 * a re-run against a campaign is a fresh scan row, but a reading that failed
 * partway and was retried is the same one, with both passes' rows on it.
 */

const row = (source_domain: string, question_id: string, engine: string) => ({
  source_domain,
  question_id,
  engine,
});

test("one answer citing a domain counts once", () => {
  const counts = countCitedDomains([row("which.co.uk", "q1", "chatgpt")]);
  assert.deepEqual([...counts.entries()], [["which.co.uk", 1]]);
});

test("the same domain across different questions and engines counts each time", () => {
  const counts = countCitedDomains([
    row("which.co.uk", "q1", "chatgpt"),
    row("which.co.uk", "q2", "chatgpt"),
    row("which.co.uk", "q1", "gemini"),
  ]);
  assert.deepEqual([...counts.entries()], [["which.co.uk", 3]]);
});

test("a retried pass's duplicate rows do not double the count", () => {
  /**
   * The case that was wrong. Both passes stored a citation for the same
   * answer, so the reading reported this source as cited twice as often as it
   * was. Counting rows gives 2 here; counting answers gives 1.
   */
  const counts = countCitedDomains([
    row("which.co.uk", "q1", "chatgpt"),
    row("which.co.uk", "q1", "chatgpt"),
  ]);
  assert.deepEqual([...counts.entries()], [["which.co.uk", 1]]);
});

test("a near-duplicate url on one answer is still one citation", () => {
  /**
   * Why merging the two source lists in `parseScraper` cannot move this
   * number. The merge can produce two rows for one page carrying different
   * tracking parameters, but `url` is not in the key here - or in any other
   * reader's key - so the count is the same either way.
   */
  const counts = countCitedDomains([
    row("which.co.uk", "q1", "chatgpt"),
    row("which.co.uk", "q1", "chatgpt"),
  ]);
  assert.equal(counts.get("which.co.uk"), 1);
});

test("distinct domains are counted apart", () => {
  const counts = countCitedDomains([
    row("which.co.uk", "q1", "chatgpt"),
    row("trustpilot.com", "q1", "chatgpt"),
  ]);
  assert.equal(counts.get("which.co.uk"), 1);
  assert.equal(counts.get("trustpilot.com"), 1);
  assert.equal(counts.size, 2);
});
