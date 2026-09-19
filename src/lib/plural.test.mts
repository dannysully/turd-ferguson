import assert from "node:assert/strict";
import { test } from "node:test";

import { count, isAre } from "./plural.ts";

test("one takes the singular", () => {
  assert.equal(count(1, "brand"), "1 brand");
  assert.equal(count(1, "question"), "1 question");
});

test("everything else takes the plural, including zero", () => {
  // Zero is plural in English - "0 brands" - and zero is a measured finding
  // here rather than an absence, so it is printed rather than suppressed.
  assert.equal(count(0, "brand"), "0 brands");
  assert.equal(count(2, "brand"), "2 brands");
  assert.equal(count(14, "question"), "14 questions");
});

test("an irregular plural is given, never guessed", () => {
  assert.equal(count(1, "entry", "entries"), "1 entry");
  assert.equal(count(3, "entry", "entries"), "3 entries");
});

test("the verb agrees with the same number", () => {
  assert.equal(isAre(1), "is");
  assert.equal(isAre(0), "are");
  assert.equal(isAre(2), "are");
});
