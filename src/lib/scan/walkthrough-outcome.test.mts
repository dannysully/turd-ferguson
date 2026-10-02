import assert from "node:assert/strict";
import { test } from "node:test";

import { readWalkthroughOutcome, walkthroughBack } from "./walkthrough-outcome.ts";

test("the walkthrough outcome is one of four words, else nothing", () => {
  for (const w of ["video", "demo", "bad", "failed"]) assert.equal(readWalkthroughOutcome(w), w);
  for (const w of [undefined, "", "sent", "VIDEO", ["video"]]) assert.equal(readWalkthroughOutcome(w), null);
});

test("a walkthrough form post goes back only to a scan or a reading on this site", () => {
  assert.equal(walkthroughBack("/coverage-check/abc_DEF-123", "t1"), "/coverage-check/abc_DEF-123");
  assert.equal(walkthroughBack("/scan/0123abcd", "t1"), "/scan/0123abcd");
  for (const bad of [undefined, "", "//evil.example/scan/x", "https://evil.example/scan/x", "/scan/x?y=1", "/scan/../app", "/app/acme", "/scan/" + "a".repeat(81)]) {
    assert.equal(walkthroughBack(bad, "t1"), "/scan/t1", String(bad));
  }
});
