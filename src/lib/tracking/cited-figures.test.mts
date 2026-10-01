import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { expandFixture } from "./fixture-mode.ts";
import { citedPageRows, citedPages } from "./figures.ts";
import { urlKey } from "./placements.ts";

/**
 * R144 (1 Oct 2026; BRIEF-4 P4): the Cited pages page reads what the
 * Overview's "Pages the engines cite most" panel reads for the same range -
 * the panel is the page's head - and its pages are in the placements
 * url_key form, so a live placement's row is found by key.
 */

const fx = expandFixture(JSON.parse(readFileSync(new URL("./fixture.json", import.meta.url), "utf8")));
const range = { from: "2026-09-02", to: fx.today };

test("the panel's rows are the page's first rows, count for count", () => {
  const panel = citedPages(fx.data.answers, range, fx.client.domain);
  const page = citedPageRows(fx.data.answers, range, fx.client.domain);
  assert.ok(panel.length >= 3, `the fixture cites only ${panel.length} pages`);
  assert.ok(page.length >= panel.length);
  panel.forEach((p, i) => {
    assert.equal(page[i]!.page, p.page);
    assert.equal(page[i]!.count, p.count);
    assert.deepEqual(page[i]!.engines, p.engines);
    assert.equal(page[i]!.yours, p.yours);
  });
});

test("pages carry no query string and match url_key; first, last and prompt days come from the range", () => {
  const rows = [
    { run_date: "2026-09-10", question_id: "q1", engine: "chatgpt", answered: true, citations: [{ source_domain: "www.softwarecritic.com", url: "https://www.softwarecritic.com/best/?utm_source=x" }] },
    { run_date: "2026-09-12", question_id: "q1", engine: "gemini", answered: true, citations: [{ source_domain: "softwarecritic.com", url: "https://softwarecritic.com/best" }] },
    { run_date: "2026-09-11", question_id: "q1", engine: "gemini", answered: true, citations: [] },
    { run_date: "2026-09-12", question_id: "q2", engine: "gemini", answered: true, citations: [{ source_domain: "tallyroo.com", url: "https://tallyroo.com/pricing" }] },
  ];
  const page = citedPageRows(rows, { from: "2026-09-10", to: "2026-09-12" }, "tallyroo.com");
  const best = page.find((p) => p.page === "softwarecritic.com/best")!;
  assert.equal(best.page, urlKey("https://www.softwarecritic.com/best/?utm_source=x"));
  assert.equal(best.count, 2);
  assert.equal(best.first, "2026-09-10");
  assert.equal(best.last, "2026-09-12");
  assert.deepEqual(best.prompts, [{ id: "q1", daysCited: 2, daysAnswered: 3 }]);
  assert.equal(best.yours, false);
  assert.equal(page.find((p) => p.page === "tallyroo.com/pricing")!.yours, true);
});
