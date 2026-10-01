import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { MAX_COVERAGE_URLS } from "./csv.ts";
import { pretick } from "./draft.ts";
import { coverageFixture, fixtureDraft } from "./draft-fixture.ts";

/** R140 part 3 (1 Oct 2026): the draft route's local fixture. */

test("the fixture switch is off unless set, and throws in production", () => {
  assert.equal(coverageFixture({}), false);
  assert.equal(coverageFixture({ COVERAGE_FIXTURE: "0" }), false);
  assert.equal(coverageFixture({ COVERAGE_FIXTURE: "1" }), true);
  assert.throws(() => coverageFixture({ COVERAGE_FIXTURE: "1", VERCEL_ENV: "production" }));
});

test("the fixture draft keeps every pasted row, ticks five and names one unread", () => {
  const rows = Array.from({ length: 7 }, (_, i) => ({ url: `https://pub${i}.example/a`, source_domain: `pub${i}.example` }));
  const d = fixtureDraft(pretick(rows));
  assert.equal(d.rows.length, 7);
  assert.equal(d.rows.filter((r) => r.ticked).length, MAX_COVERAGE_URLS);
  assert.ok(d.reportLimit);
  assert.deepEqual(d.unread, [`https://pub${MAX_COVERAGE_URLS - 1}.example/a`]);
  assert.equal(d.prompts.length, 5);
  assert.equal(fixtureDraft(pretick(rows.slice(0, 2))).reportLimit, null);
});

test("the route asks the switch before Turnstile and answers from it only after the bounds and the parse", () => {
  const src = readFileSync(new URL("../../app/api/coverage-check/draft/route.ts", import.meta.url), "utf8");
  const at = (s: string) => src.indexOf(s);
  assert.ok(at("const fixture = coverageFixture();") > 0);
  assert.ok(at("if (!fixture && !(await verifyTurnstile(") > at("const fixture = coverageFixture();"));
  assert.ok(at("if (fixture) return Response.json(fixtureDraft(") > at("parseCoverageCsv("));
  assert.ok(at("if (fixture) return Response.json(fixtureDraft(") < at(".from(\"model_call_debits\")"), "the fixture answers before any read or spend");
});
