import assert from "node:assert/strict";
import { test } from "node:test";

import { ASKS_PER_MEMBER_PER_DAY, askGate, askMail, askRecipient, askToast, readAskKeyword, upsellMode } from "./ask.ts";

/** A stub of the one count askGate reads, recording the filters it was given. */
function countDb(count: number | null, error: { message: string } | null = null) {
  const filters: [string, string, unknown][] = [];
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (filters.push(["eq", c, v]), q),
    gte: (c: string, v: unknown) => (filters.push(["gte", c, v]), Promise.resolve({ count, error })),
  };
  return { db: { from: (t: string) => (assert.equal(t, "cta_events"), q) } as never, filters };
}

test("off asks nobody; agency asks its contact, or us when it has none; nomada asks us", () => {
  assert.equal(askRecipient("off", "a@agency.example"), null);
  assert.deepEqual(askRecipient("agency", "a@agency.example"), { to: "a@agency.example", who: "your account contact" });
  assert.deepEqual(askRecipient("agency", null), { to: null, who: "nomada digital" });
  assert.deepEqual(askRecipient("nomada", "a@agency.example"), { to: null, who: "nomada digital" });
  assert.equal(upsellMode("agency"), "agency");
  assert.equal(upsellMode("anything"), "nomada");
});

test("three asks a member a day, counted off today's asked rows for this client", async () => {
  assert.equal(ASKS_PER_MEMBER_PER_DAY, 3);
  const two = countDb(2);
  assert.deepEqual(await askGate(two.db, { clientId: "c", email: "m@example.com", today: "2026-09-30" }), { ok: true });
  assert.deepEqual(two.filters, [
    ["eq", "client_domain_id", "c"],
    ["eq", "member_email", "m@example.com"],
    ["eq", "action", "asked"],
    ["gte", "created_at", "2026-09-30T00:00:00Z"],
  ]);
  assert.deepEqual(await askGate(countDb(3).db, { clientId: "c", email: "m", today: "2026-09-30" }), { ok: false, reason: "capped" });
  assert.deepEqual(await askGate(countDb(null, { message: "x" }).db, { clientId: "c", email: "m", today: "2026-09-30" }), { ok: false, reason: "read_failed" });
});

test("the keyword is trimmed and single-spaced; blank is no ask", () => {
  assert.equal(readAskKeyword("  cloud   accounting "), "cloud accounting");
  assert.equal(readAskKeyword("   "), null);
  assert.equal(readAskKeyword(undefined), null);
});

test("the mail names the client, the member and the keyword, and no tier in agency mode", () => {
  const m = askMail({ brand: "Tallyroo", domain: "example.com", member: "m@example.com", keyword: "invoices", mode: "nomada" });
  assert.equal(m.subject, "Pick a cluster keyword for Tallyroo");
  assert.match(m.text, /m@example\.com \(Tallyroo, example\.com\)/);
  assert.match(m.text, /The keyword they tried: invoices/);
  assert.match(m.text, /alwaystracked/);
  assert.doesNotMatch(askMail({ brand: "T", domain: "example.com", member: "m", keyword: "k", mode: "agency" }).text, /always/);
});

test("the toast, as the board's: who it went to and who will be answered", () => {
  assert.equal(askToast("nomada digital", "m@example.com"), "Sent to nomada digital. We'll reply to m@example.com.");
  assert.equal(askToast("your account contact", "m@example.com"), "Sent to your account contact. They'll reply to m@example.com.");
});
