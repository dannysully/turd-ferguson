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

// R151 (3 Oct 2026): sources and pieces were fixed figures that disagreed - a
// domain "cited in 6 answers" beside a piece one engine cited, 6 of 8 answers
// once trimmed to two questions. Now one citation list feeds both.
test("the complete fixture's sources and pieces agree with its answers at every question count", () => {
  for (const n of ["", "1", "2", "3", "4", "5"]) {
    const r = readingFixture(READING_FIXTURE_TOKEN, { COVERAGE_FIXTURE_STATE: "complete", COVERAGE_FIXTURE_QUESTIONS: n });
    assert.ok(r);
    const answered = r.questions.flatMap((q) => q.answers).filter((a) => a.answered).length;
    for (const s of r.sources) assert.ok(s.citations <= answered, `${n}: ${s.domain} ${s.citations} > ${answered}`);
    for (const p of r.pieces) {
      const cited = p.pageEngines.length + p.publicationEngines.length;
      const count: number = r.sources.find((s) => s.domain === p.domain)?.citations ?? 0;
      assert.equal(cited > 0, count > 0, `${n}: ${p.domain}`);
      // An engine cites at most once per question, so the domain's count bounds it.
      assert.ok(count >= cited && count <= cited * r.questions.length);
    }
    assert.equal(r.coverage.cited + r.coverage.uncited.length, r.coverage.uploaded);
  }
  const five = readingFixture(READING_FIXTURE_TOKEN, { COVERAGE_FIXTURE_STATE: "complete" });
  assert.deepEqual(five?.sources.map((s) => s.citations), [6, 4, 2, 1]);
});
