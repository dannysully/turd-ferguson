// R69 (danny.md line 70, 28 Sep 2026): a tile's picks carried in the URL.
import assert from "node:assert/strict";
import test from "node:test";

import { MAX_CLUSTERS, SECTORS } from "./sector-pricing.ts";
import { SELECTION_DEFAULT, isCall, parseSelection, picksLine, tierFromPlain, withSelection } from "./sector-selection.ts";

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

// R69 follow-up (28 Sep 2026): /contact received the picks and the enquiry
// dropped them. ContactTier and the contact action share picksLine.
test("picksLine names the picks, and nothing when none were made", () => {
  const label = SECTORS.find((s) => s.id === priced)!.label;
  assert.equal(picksLine(SELECTION_DEFAULT), null);
  assert.equal(picksLine({ sector: priced, qty: 3, market: "us" }), `${label}, 3 clusters, US market`);
  assert.equal(picksLine({ sector: "", qty: 1, market: "uk" }), "UK market");
  assert.equal(
    picksLine({ sector: priced, qty: MAX_CLUSTERS + 1, market: "us" }),
    `${label}, more than ${MAX_CLUSTERS} clusters, US market`,
  );
});

test("a call CTA's link reads back to the same line /contact shows", () => {
  const sel = { sector: priced, qty: 11, market: "uk" as const };
  const params = new URL(withSelection("/contact?tier=alwayscited", sel), "https://alwayscited.com").searchParams;
  assert.equal(tierFromPlain(params.get("tier")), "cited");
  assert.equal(picksLine(parseSelection(params)), picksLine(sel));
});

test("a tier value that is not a tier name is dropped", () => {
  assert.equal(tierFromPlain("AlwaysCited"), null);
  assert.equal(tierFromPlain(""), null);
  assert.equal(tierFromPlain(null), null);
  assert.equal(tierFromPlain("alwaystracked"), "tracked");
});
