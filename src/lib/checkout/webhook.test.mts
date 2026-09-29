import assert from "node:assert/strict";
import { test } from "node:test";

import { checkoutRequest } from "./session.ts";
import { completedOrder, handleWebhook, orderEmailText, packsOn, signStripePayload, subscriptionScanToken, verifyStripeSignature, type WebhookDeps } from "./webhook.ts";

/**
 * BRIEF-3 C4 (30 Sep 2026): the webhook's rules against recorded fixtures.
 * Nothing here reaches Stripe or Supabase; the writes are injected.
 */

const SECRET = "whsec_test_fixture_not_a_real_secret";
const NOW = 1_790_000_000;
const TOKEN = "57520fc70f3cf9dced06f60186ae059e".replace(/./g, (c, i) => (i % 2 ? c : "a"));

const completed = {
  id: "evt_fixture_completed",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_fixture",
      customer_details: { email: "Owner@Example.com" },
      subscription: "sub_fixture",
      amount_total: 12900,
      currency: "usd",
      metadata: { tier: "tracked", sector: "", quantity: "1", market: "us", keyword: "", scan_token: TOKEN },
    },
  },
};
const updated = {
  id: "evt_fixture_updated",
  type: "customer.subscription.updated",
  data: { object: { id: "sub_fixture", metadata: { scan_token: TOKEN }, items: { data: [{ quantity: 1, price: { metadata: {} } }, { quantity: 2, metadata: { kind: "pack" } }] } } },
};
const deleted = { id: "evt_fixture_deleted", type: "customer.subscription.deleted", data: { object: { id: "sub_fixture", metadata: { scan_token: TOKEN } } } };

function deps(seen = new Set<string>()) {
  const calls: string[] = [];
  const d: WebhookDeps = {
    record: async (id) => {
      calls.push(`record ${id}`);
      if (seen.has(id)) return "duplicate";
      seen.add(id);
      return "new";
    },
    forget: async (id) => {
      calls.push(`forget ${id}`);
      seen.delete(id);
    },
    completed: async (o) => (calls.push(`completed ${o.email} ${o.scanToken}`), true),
    updated: async (s) => (calls.push(`updated ${packsOn(s)}`), true),
    deleted: async (s) => (calls.push(`deleted ${subscriptionScanToken(s)}`), true),
  };
  return { d, calls, seen };
}

const post = (event: unknown, d: WebhookDeps, secret: string | undefined = SECRET, sig?: string | null) => {
  const raw = JSON.stringify(event);
  return handleWebhook(raw, sig === undefined ? signStripePayload(raw, SECRET, NOW) : sig, secret, d, NOW);
};

test("no secret: 503 and nothing acted on, never a skipped check", async () => {
  const { d, calls } = deps();
  const a = await post(completed, d, "");
  assert.equal(a.status, 503);
  assert.deepEqual(calls, []);
});

test("an unsigned, wrongly signed or stale request is refused before it is parsed", async () => {
  for (const sig of [null, "", "t=1,v1=abc", signStripePayload("{}", SECRET, NOW), signStripePayload(JSON.stringify(completed), "whsec_other", NOW)]) {
    const { d, calls } = deps();
    const a = await post(completed, d, SECRET, sig);
    assert.equal(a.status, 400, `accepted ${sig}`);
    assert.deepEqual(calls, []);
  }
  const raw = JSON.stringify(completed);
  assert.equal(verifyStripeSignature(raw, signStripePayload(raw, SECRET, NOW - 301), SECRET, NOW), false, "a signature over five minutes old");
  assert.equal(verifyStripeSignature(raw, signStripePayload(raw, SECRET, NOW - 299), SECRET, NOW), true);
});

test("a replayed event id answers 200 and does nothing the second time", async () => {
  const { d, calls } = deps();
  assert.equal((await post(completed, d)).status, 200);
  const again = await post(completed, d);
  assert.equal(again.status, 200);
  assert.equal(again.body.ignored, "duplicate");
  assert.deepEqual(calls.filter((c) => c.startsWith("completed")).length, 1);
});

test("each handled event reaches its handler, with the fixture's values", async () => {
  const { d, calls } = deps();
  await post(completed, d);
  await post(updated, d);
  await post(deleted, d);
  assert.deepEqual(calls, [
    "record evt_fixture_completed",
    `completed owner@example.com ${TOKEN}`,
    "record evt_fixture_updated",
    "updated 2",
    "record evt_fixture_deleted",
    `deleted ${TOKEN}`,
  ]);
});

test("an event the endpoint is not registered for is answered and not recorded", async () => {
  const { d, calls } = deps();
  const a = await post({ id: "evt_x", type: "invoice.paid", data: { object: {} } }, d);
  assert.equal(a.status, 200);
  assert.deepEqual(calls, []);
});

test("a failed handler forgets the event id, so Stripe's retry is acted on", async () => {
  const { d, calls, seen } = deps();
  d.completed = async () => false;
  assert.equal((await post(completed, d)).status, 500);
  assert.ok(!seen.has(completed.id));
  assert.ok(calls.includes(`forget ${completed.id}`));
});

test("the Session's order: email lowercased, scan token only when it is one", () => {
  const o = completedOrder(completed.data.object);
  assert.equal(o.email, "owner@example.com");
  assert.equal(o.scanToken, TOKEN);
  assert.equal(o.subscriptionId, "sub_fixture");
  assert.equal(completedOrder({ ...completed.data.object, metadata: { scan_token: "../etc" } }).scanToken, null);
});

test("packs count only items marked as a pack", () => {
  assert.equal(packsOn(updated.data.object), 2);
  assert.equal(packsOn({ items: { data: [{ quantity: 3 }] } }), 0);
  assert.equal(packsOn({}), 0);
});

test("the order email names the order and says when there was no scan", () => {
  const o = completedOrder({ ...completed.data.object, metadata: { tier: "mentioned", sector: "saas", quantity: "3", market: "uk", keyword: "crm" } });
  const m = orderEmailText(o, "no scan on the order, so no client was created", "https://alwayscited.com");
  assert.match(m.text, /Tier: mentioned/);
  assert.match(m.text, /Clusters: 3/);
  assert.match(m.text, /Keyword target: crm/);
  assert.match(m.text, /set the client up by hand/);
  assert.match(m.text, /129\.00 USD/);
});

test("checkout puts a scan token in the Session metadata only when it is one", () => {
  const ctx = { trackedPrice: { us: 129, uk: 99 }, names: { tracked: "alwaystracked", mentioned: "alwaysmentioned", cited: "alwayscited" }, origin: "https://alwayscited.com" as const };
  const base = { tier: "tracked", sector: "", quantity: 1, market: "us", email: "a@example.com", keyword: "" };
  const withScan = checkoutRequest({ ...base, scan: TOKEN.toUpperCase() }, ctx);
  assert.equal(withScan.kind, "session");
  if (withScan.kind === "session") {
    assert.equal(withScan.form.get("metadata[scan_token]"), TOKEN);
    assert.equal(withScan.form.get("subscription_data[metadata][scan_token]"), TOKEN);
  }
  const bad = checkoutRequest({ ...base, scan: "not-a-token" }, ctx);
  if (bad.kind === "session") assert.equal(bad.form.get("metadata[scan_token]"), null);
});
