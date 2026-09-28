// R69 (danny.md line 70, 28 Sep 2026): a tile's picks carried in the URL.
import assert from "node:assert/strict";
import test from "node:test";

import { MAX_CLUSTERS, SECTORS } from "./sector-pricing.ts";
import { SELECTION_DEFAULT, isCall, parseSelection, withSelection } from "./sector-selection.ts";

const priced = SECTORS.find((s) => s.prices)!.id;

test("an untouched tile's CTA stays bare", () => {
  assert.equal(withSelection("/alwaysmentioned", SELECTION_DEFAULT), "/alwaysmentioned");
});

test("a selection builds the href, only the params that are set", () => {
  assert.equal(withSelection("/alwayscited", { sector: priced, qty: 3, market: "us" }), `/alwayscited?sector=${priced}&clusters=3`);
  assert.equal(withSelection("/alwayscited", { sector: "", qty: 2, market: "uk" }), "/alwayscited?clusters=2&market=uk");
  assert.equal(
    withSelection("/contact?tier=alwayscited", { sector: "other", qty: 1, market: "us" }),
    "/contact?tier=alwayscited&sector=other",
  );
});

test("the tier page's first render reads the picks back", () => {
  const href = withSelection("/alwayscited", { sector: priced, qty: 3, market: "uk" });
  assert.deepEqual(parseSelection(new URLSearchParams(href.split("?")[1])), { sector: priced, qty: 3, market: "uk" });
  assert.deepEqual(parseSelection(new URLSearchParams(`clusters=${MAX_CLUSTERS + 1}`)).qty, MAX_CLUSTERS + 1);
});

test("invalid params are ignored one by one, never an error", () => {
  for (const q of ["sector=nope", "clusters=0", `clusters=${MAX_CLUSTERS + 2}`, "clusters=3.5", "clusters=abc", "market=fr", "sector=&clusters=-1"]) {
    assert.deepEqual(parseSelection(new URLSearchParams(q)), SELECTION_DEFAULT, q);
  }
  assert.deepEqual(parseSelection(new URLSearchParams("sector=nope&clusters=4")), { ...SELECTION_DEFAULT, qty: 4 });
});

test("Other and 11+ price as a call; a priced pick does not", () => {
  assert.equal(isCall("mentioned", { sector: "other", qty: 1, market: "us" }), true);
  assert.equal(isCall("cited", { sector: priced, qty: MAX_CLUSTERS + 1, market: "us" }), true);
  assert.equal(isCall("cited", { sector: priced, qty: 3, market: "uk" }), false);
  assert.equal(isCall("cited", SELECTION_DEFAULT), false);
});
