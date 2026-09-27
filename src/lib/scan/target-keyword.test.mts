import assert from "node:assert/strict";
import { test } from "node:test";

import { normaliseCandidate, pickKeyword, stripFiller } from "./target-keyword.ts";

const CAT = "business cash flow finance";
const NOUN = "providers";

test("Danny's example: the question comes down to the supplier keyword", () => {
  assert.equal(normaliseCandidate("best business cash flow finance providers uk", CAT, NOUN), "business cash flow finance providers");
});

test("the bare category never stands, and gets the supplier noun instead", () => {
  // Offered bare, it is not refused outright: it becomes the supplier keyword.
  assert.equal(normaliseCandidate("business cash flow finance", CAT, NOUN), "business cash flow finance providers");
  // With no supplier noun to add, the bare category is refused.
  assert.equal(normaliseCandidate("business cash flow finance", CAT, ""), null);
  assert.equal(normaliseCandidate("top business cash flow finance 2026", CAT, "finance"), null);
});

test("filler, years and the country word come out", () => {
  assert.equal(stripFiller("Which are the top 10 SEO agencies in the UK 2026?"), "seo agencies");
  assert.equal(normaliseCandidate("who offers invoice finance lenders", CAT, NOUN), "invoice finance lenders");
});

test("a supplier noun alone is not a keyword", () => {
  assert.equal(normaliseCandidate("best providers uk", CAT, NOUN), null);
});

test("the highest volume standing candidate wins", () => {
  const v = new Map([
    ["invoice finance providers", 320],
    ["business cash flow finance providers", 480],
  ]);
  assert.equal(pickKeyword(["best invoice finance providers", "business cash flow finance providers uk", "business cash flow finance"], CAT, NOUN, v), "business cash flow finance providers");
});

test("all zero: the shortest standing candidate", () => {
  assert.equal(
    pickKeyword(["cash flow lenders for small firms", "cash flow lenders", "business cash flow finance"], CAT, NOUN, new Map()),
    "cash flow lenders",
  );
});

test("nothing stands: null, not a guess", () => {
  assert.equal(pickKeyword(["best", "top uk 2026"], CAT, NOUN, new Map()), null);
});
