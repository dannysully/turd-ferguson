import assert from "node:assert/strict";
import { test } from "node:test";

import { addPanelState, checkVerdict, precheckKeyword } from "./add-cluster.ts";

// BRIEF-3 T6 part 3a (30 Sep 2026): the free checks that stand before any paid
// read, and C1's pick in the board's words. Made-up Tallyroo, as the fixture.

const P = { tracked: ["Invoicing Software"], brands: ["Tallyroo", "tallyroo.com"] };

test("each free refusal, before any read", () => {
  assert.equal((precheckKeyword("  invoicing   software ", P) as { reason: string }).reason, "tracked");
  assert.equal((precheckKeyword("tallyroo pricing", P) as { reason: string }).reason, "own_brand");
  assert.equal((precheckKeyword("what is bookkeeping", P) as { reason: string }).reason, "informational");
  assert.equal((precheckKeyword("bookkeeping course online", P) as { reason: string }).reason, "informational");
  assert.equal((precheckKeyword("payroll", P) as { reason: string }).reason, "too_broad");
  assert.deepEqual(precheckKeyword("Accounting Software for Dentists", P), { ok: true, keyword: "accounting software for dentists" });
});

test("a refusal offers 'Ask us to pick one' except when the keyword is already tracked", () => {
  assert.equal((precheckKeyword("invoicing software", P) as { ask: boolean }).ask, false);
  assert.equal((precheckKeyword("payroll", P) as { ask: boolean }).ask, true);
});

test("C1's pick becomes the board's verdict", () => {
  const ok = checkVerdict({ keyword: "accounting software for dentists", volume: 1300, intent: "commercial" }, "the United States");
  assert.deepEqual(ok, { ok: true, keyword: "accounting software for dentists", volume: 1300, intent: "commercial", message: "1,300 searches a month in the United States, commercial intent. Good to track." });
  assert.equal((checkVerdict({ none: "no_intent" }, "x") as { reason: string }).reason, "informational");
  assert.equal((checkVerdict({ none: "no_volume" }, "x") as { reason: string }).reason, "no_volume");
  assert.equal((checkVerdict("read_failed", "x") as { reason: string }).reason, "read_failed");
});

test("the panel is full at the limit", () => {
  assert.equal(addPanelState(9, 10), "open");
  assert.equal(addPanelState(10, 10), "full");
  assert.equal(addPanelState(12, 15), "open");
});
