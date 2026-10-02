import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { FIXTURE_ORDER_KEYWORD, expandFixture, fixtureSetupConfirmed, fixtureState } from "./fixture-mode.ts";
import { orderKeyword, prefillCard } from "./order-keyword.ts";

// R180 (Danny, 2 Oct 2026, danny.md line 212): the checkout keyword reaches the dashboard, as a prefill only.

test("an order with a typed keyword and no scan gives its keyword", () => {
  assert.equal(orderKeyword({ keyword: "  invoicing app for freelancers ", scan_token: null }), "invoicing app for freelancers");
});

test("an order with a scan is unchanged: its typed keyword is not used", () => {
  assert.equal(orderKeyword({ keyword: "invoicing app for freelancers", scan_token: "57520fc70f3cf9dced06f60186ae059e" }), null);
});

test("no order, no keyword, or a keyword under 2 characters gives nothing", () => {
  assert.equal(orderKeyword(null), null);
  assert.equal(orderKeyword(undefined), null);
  assert.equal(orderKeyword({ keyword: null, scan_token: null }), null);
  assert.equal(orderKeyword({ keyword: " x ", scan_token: null }), null);
  assert.equal(orderKeyword({ keyword: "k".repeat(300), scan_token: null })?.length, 120);
});

test("the prefill lands on the first cluster with no keyword, and only with a keyword to give", () => {
  const cards = [
    { id: "a", keyword: "already set" },
    { id: "b", keyword: null },
    { id: "c", keyword: null },
  ];
  assert.equal(prefillCard(cards, "invoicing app"), "b");
  assert.equal(prefillCard(cards, null), null);
  assert.equal(prefillCard([{ id: "a", keyword: "set" }], "invoicing app"), null, "every cluster has its keyword");
});

test("fixture signup-typed: one keywordless cluster, no prompts, the typed keyword on the order, setup to do", () => {
  const base = expandFixture(JSON.parse(readFileSync(new URL("./fixture.json", import.meta.url), "utf8")));
  const f = fixtureState(base, { TRACKING_FIXTURE_STATE: "signup-typed" });
  assert.deepEqual(f.data.clusters.map((c) => [c.name, c.keyword_id]), [["Needs a keyword", null]]);
  assert.equal(f.data.questions.length, 0);
  assert.equal(orderKeyword(f.order), FIXTURE_ORDER_KEYWORD);
  assert.equal(fixtureSetupConfirmed({ TRACKING_FIXTURE_STATE: "signup-typed" }), false);
  assert.equal(fixtureState(base, { TRACKING_FIXTURE_STATE: "signup" }).order, undefined, "the from-a-scan signup has no typed keyword");
});
