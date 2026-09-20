import assert from "node:assert/strict";
import { test } from "node:test";

import { canRerun, readingState, shouldPoll } from "./reading-state.ts";

/**
 * The defect these guard, stated once: the page derived three booleans and let
 * every other status fall through to "running", which mounted a poll that could
 * never finish and hid the only control that could move the page on. See
 * reading-state.ts.
 */

test("the three live statuses keep their own state", () => {
  assert.equal(readingState("queued"), "running");
  assert.equal(readingState("running"), "running");
  assert.equal(readingState("complete"), "complete");
  assert.equal(readingState("failed"), "failed");
});

test("pending_topic is stalled, not running", () => {
  // The actual bricked row: addReading inserts here and only leaves once the
  // questions are stored. Nothing server-side ever moves it - stallStamp
  // returns null for it and reapStalled sweeps only queued and running.
  assert.equal(readingState("pending_topic"), "stalled");
  assert.equal(shouldPoll(readingState("pending_topic")), false);
  assert.equal(canRerun(readingState("pending_topic")), true);
});

test("a campaign with no reading at all is stalled, not running", () => {
  // This was the literal `: true` in the old ternary. There is no pass in
  // flight, so there is nothing for a poll to wait for.
  for (const empty of [null, undefined]) {
    assert.equal(readingState(empty), "stalled");
    assert.equal(shouldPoll(readingState(empty)), false);
    assert.equal(canRerun(readingState(empty)), true);
  }
});

test("a status nobody has added yet lands somewhere with a way out", () => {
  // The narrowing that matters: "not one of the three" rather than
  // `=== "pending_topic"`. A value added to the enum later must not land back
  // in the endless poll. If someone rewrites readingState to name
  // pending_topic explicitly, this is the test that fails.
  assert.equal(readingState("some_status_added_in_2027"), "stalled");
  assert.equal(shouldPoll(readingState("some_status_added_in_2027")), false);
  assert.equal(canRerun(readingState("some_status_added_in_2027")), true);
});

test("only a pass in flight suppresses the re-run button", () => {
  // Mirrors the rerun route's own guard, which 409s on queued and running and
  // accepts everything else. The button is offered in exactly the states the
  // API would take it from.
  assert.equal(canRerun("running"), false);
  for (const s of ["complete", "failed", "stalled"] as const) {
    assert.equal(canRerun(s), true, `${s} must offer a re-run`);
  }
});

test("exactly one state, and polling implies it", () => {
  // A guard on the narrowing itself: shouldPoll must be true for running and
  // nothing else, so it cannot quietly widen back to "anything not finished".
  const states = ["running", "complete", "failed", "stalled"] as const;
  assert.equal(states.filter((s) => shouldPoll(s)).length, 1);
  assert.equal(states.filter((s) => shouldPoll(s))[0], "running");
});
