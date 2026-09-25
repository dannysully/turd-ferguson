import assert from "node:assert/strict";
import { test } from "node:test";

import { endingOf, marketFromEnding, marketFromRankings, marketReasonLine, needsRankings, pickMarket } from "./market-pick.ts";

test("a UK ending decides UK and .us decides US, with no ranking read", () => {
  for (const d of ["acme.co.uk", "acme.uk", "acme.org.uk", "acme.ltd.uk", "acme.plc.uk", "acme.me.uk"]) {
    assert.equal(marketFromEnding(d), "UK", d);
    assert.equal(needsRankings(null, d), false, d);
  }
  assert.equal(marketFromEnding("acme.us"), "US");
  for (const d of ["acme.com", "acme.ai", "acme.io", "acme.co", "acme.de"]) {
    assert.equal(marketFromEnding(d), null, d);
    assert.equal(needsRankings(null, d), true, d);
  }
});

test("the visitor's choice wins and skips the read", () => {
  assert.deepEqual(pickMarket({ chosen: "UK", domain: "acme.com" }), { market: "UK", reason: "chosen" });
  assert.equal(needsRankings("US", "acme.com"), false);
});

test("UK needs more than 1.5x the US footprint", () => {
  assert.equal(marketFromRankings({ etv: 1600, count: 10 }, { etv: 1000, count: 10 }), "UK");
  assert.equal(marketFromRankings({ etv: 1500, count: 10 }, { etv: 1000, count: 10 }), "US");
  assert.equal(marketFromRankings({ etv: 10, count: 1 }, { etv: 0, count: 0 }), "UK");
  assert.equal(marketFromRankings({ etv: 0, count: 0 }, { etv: 5, count: 1 }), "US");
});

test("keyword count only when neither side has traffic value", () => {
  assert.equal(marketFromRankings({ etv: 0, count: 40 }, { etv: 0, count: 10 }), "UK");
  assert.equal(marketFromRankings({ etv: 0, count: 12 }, { etv: 0, count: 10 }), "US");
  assert.equal(marketFromRankings({ etv: 0, count: 0 }, { etv: 0, count: 0 }), null);
  assert.equal(marketFromRankings(null, null), null);
});

test("nothing to go on is the US", () => {
  assert.deepEqual(pickMarket({ domain: "acme.com", rankings: null }), { market: "US", reason: "default" });
  assert.deepEqual(pickMarket({ domain: "acme.com", rankings: { uk: null, us: null } }), { market: "US", reason: "default" });
  assert.deepEqual(pickMarket({ domain: "acme.co.uk" }), { market: "UK", reason: "domain ending" });
  assert.deepEqual(
    pickMarket({ domain: "rotaready.com", rankings: { uk: { etv: 9000, count: 800 }, us: { etv: 300, count: 90 } } }),
    { market: "UK", reason: "rankings" },
  );
});

test("the reason line says why, in words", () => {
  assert.equal(endingOf("acme.co.uk"), ".co.uk");
  assert.equal(endingOf("acme.uk"), ".uk");
  assert.equal(marketReasonLine("acme.co.uk", { market: "UK", reason: "domain ending" }), "Set from the .co.uk ending.");
  assert.equal(marketReasonLine("rotaready.com", { market: "UK", reason: "rankings" }), "Most of rotaready.com's Google rankings are in the UK.");
  assert.equal(marketReasonLine("acme.com", { market: "US", reason: "default" }), "We default to the US - switch if your buyers are in the UK.");
  assert.equal(marketReasonLine("acme.com", { market: "US", reason: "chosen" }), null);
  assert.equal(marketReasonLine("acme.com", { market: "US", reason: null }), null);
});
