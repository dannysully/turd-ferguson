import assert from "node:assert/strict";
import { test } from "node:test";

import { READING_FIXTURE_TOKEN, readingFixture } from "./reading-fixture.ts";
import { readingState } from "./reading-state.ts";

/**
 * R151 (1 Oct 2026): the reading fixture answers only its own token, only
 * with the switch set, and never in production.
 */

test("the reading fixture is off without the switch, and for any other token", () => {
  assert.equal(readingFixture(READING_FIXTURE_TOKEN, {}), null);
  assert.equal(readingFixture("a-real-token", { COVERAGE_FIXTURE_STATE: "complete" }), null);
});

test("the reading fixture refuses production", () => {
  assert.throws(() => readingFixture(READING_FIXTURE_TOKEN, { COVERAGE_FIXTURE_STATE: "complete", VERCEL_ENV: "production" }));
});

test("each fixture state reads as that state, and the brand stays a placeholder", () => {
  for (const s of ["complete", "running", "failed", "stalled"]) {
    const r = readingFixture(READING_FIXTURE_TOKEN, { COVERAGE_FIXTURE_STATE: s });
    assert.ok(r);
    assert.equal(readingState(r.reading?.status), s);
    assert.match(r.campaign.brand, /^\[.*\]$/);
  }
  const done = readingFixture(READING_FIXTURE_TOKEN, { COVERAGE_FIXTURE_STATE: "complete" });
  assert.ok(done && done.named.of > 0 && done.named.count < done.named.of);
});
