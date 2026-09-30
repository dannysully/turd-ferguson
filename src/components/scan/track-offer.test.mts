import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { trackOffer } from "./track-offer.ts";

/**
 * R139 (Danny, 30 Sep 2026, danny.md line 127): the result screen's "Track
 * this cluster" card prices a UK scan in GBP plus VAT and carries the market
 * to /checkout; a US scan is unchanged. The prices here are the call's own
 * input - the card passes pricing.ts's TRACKED_PRICE, held by the census below.
 */

const PRICES = { us: 129, uk: 99 };
const BASE = "/checkout?tier=alwaystracked";

test("a UK scan shows the GBP price, plus VAT, and its link carries market=uk", () => {
  const o = trackOffer("UK", PRICES, BASE, "abc");
  assert.equal(o.market, "uk");
  assert.equal(o.price, "£99");
  assert.equal(o.vat, true);
  assert.equal(o.href, "/checkout?tier=alwaystracked&market=uk&scan=abc");
});

test("a US scan is unchanged: USD, no VAT, no market in the link", () => {
  const o = trackOffer("US", PRICES, BASE, "a b");
  assert.equal(o.market, "us");
  assert.equal(o.price, "$129");
  assert.equal(o.vat, false);
  assert.equal(o.href, "/checkout?tier=alwaystracked&scan=a%20b");
});

test("the card reads its price from pricing.ts and its link from trackOffer, never a literal", () => {
  const src = readFileSync(new URL("./ResultView.tsx", import.meta.url), "utf8");
  assert.match(src, /trackOffer\(p\.r\.market, TRACKED_PRICE, checkoutUrlFor\("tracked"\), p\.token\)/);
  assert.match(src, /href=\{offer\.href\}/);
  assert.match(src, /\{offer\.price\}/);
  assert.doesNotMatch(src, /TRACKED_PRICE\.us/, "the card no longer prints the US price for every market");
});
