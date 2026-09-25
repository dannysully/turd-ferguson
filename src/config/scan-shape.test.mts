import assert from "node:assert/strict";
import { test } from "node:test";

import { ENGINE_SPECS, FREE_ENGINES } from "../lib/scan/engines.ts";
import { FREE_ENGINE_COUNT, listOf, namedOf, pickEngines } from "./scan-shape.ts";

/**
 * Moved here from worked-example.test.mts on 25 September 2026 (Q03), when the
 * homepage worked example went with AnswerExplorer, the only panel that read
 * it. listOf still writes sentences on /what-is-aeo, /coverage-check and in
 * pricing.ts, so its test outlives the example it was written beside.
 */
test("listOf and pickEngines are what the sentences are made of", () => {
  assert.equal(listOf([]), "");
  assert.equal(listOf(["a"]), "a");
  assert.equal(listOf(["a", "b"]), "a and b");
  assert.equal(listOf(["a", "b", "c"]), "a, b and c");

  // A position past the end drops out rather than printing "undefined".
  assert.deepEqual(pickEngines([FREE_ENGINE_COUNT, FREE_ENGINE_COUNT + 9]), []);
  assert.deepEqual(pickEngines([-1]), []);
  assert.deepEqual(pickEngines([0]), [ENGINE_SPECS[FREE_ENGINES[0]].label]);
  assert.equal(namedOf([FREE_ENGINE_COUNT]), `0 of ${FREE_ENGINE_COUNT}`);
});
