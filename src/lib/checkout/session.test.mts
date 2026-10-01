import assert from "node:assert/strict";
import { test } from "node:test";

import { quoteFor, SECTORS } from "../../config/sector-pricing.ts";
import { checkoutRequest, type CheckoutContext, type Order } from "./session.ts";

/** R91 (29 Sep 2026): the Session a checkout asks Stripe for. No Stripe call is made here. */

// Made-up figures: the rule under test is that the context's figure is used, not what it is.
const ctx: CheckoutContext = { trackedPrice: { us: 7, uk: 5 }, names: { tracked: "t-name", mentioned: "m-name", cited: "c-name" }, origin: "https://alwayscited.com" };
const priced = SECTORS.find((s) => s.prices)!;
const order = (o: Partial<Order> = {}): Order => ({ tier: "mentioned", sector: priced.id, quantity: 3, market: "us", email: "Buyer@Example.com", keyword: "accounting software", ...o });

test("the amount comes from the price config, times quantity, in cents", () => {
  const r = checkoutRequest(order(), ctx);
  assert.equal(r.kind, "session");
  if (r.kind !== "session") return;
  const one = quoteFor(priced.id, "us", "mentioned", 1);
  assert.equal(one.kind, "price");
  if (one.kind !== "price") return;
  assert.equal(r.form.get("line_items[0][price_data][unit_amount]"), String(one.amount * 100));
  assert.equal(r.form.get("line_items[0][quantity]"), "3");
  assert.equal(r.amount, one.amount * 3);
  assert.equal(r.form.get("line_items[0][price_data][currency]"), "usd");
  assert.equal(r.form.get("line_items[0][price_data][product_data][name]"), "m-name");
});

test("every Session allows promotion codes, is monthly, and returns to alwayscited.com", () => {
  for (const o of [order(), order({ tier: "cited", market: "uk" }), order({ tier: "tracked", sector: "", keyword: "" })]) {
    const r = checkoutRequest(o, ctx);
    assert.equal(r.kind, "session", JSON.stringify(o));
    if (r.kind !== "session") continue;
    assert.equal(r.form.get("allow_promotion_codes"), "true");
    assert.equal(r.form.get("mode"), "subscription");
    assert.equal(r.form.get("line_items[0][price_data][recurring][interval]"), "month");
    assert.ok(r.form.get("success_url")!.startsWith("https://alwayscited.com/"));
    assert.ok(r.form.get("cancel_url")!.startsWith("https://alwayscited.com/"));
    assert.equal(r.form.get("customer_email"), "buyer@example.com");
  }
});

test("the success URL names the plan, and from=scan only when a scan token rides on the order (R148 pass 8, 1 Oct 2026)", () => {
  const tok = "0123456789abcdef0123456789abcdef";
  const withScan = checkoutRequest(order({ tier: "tracked", sector: "", keyword: "", scan: tok }), ctx);
  const without = checkoutRequest(order({ tier: "cited" }), ctx);
  const junk = checkoutRequest(order({ scan: "not-a-token" }), ctx);
  assert.ok(withScan.kind === "session" && without.kind === "session" && junk.kind === "session");
  assert.equal(withScan.form.get("success_url"), "https://alwayscited.com/checkout/done?session={CHECKOUT_SESSION_ID}&plan=tracked&from=scan");
  assert.equal(without.form.get("success_url"), "https://alwayscited.com/checkout/done?session={CHECKOUT_SESSION_ID}&plan=cited");
  assert.equal(junk.form.get("success_url"), "https://alwayscited.com/checkout/done?session={CHECKOUT_SESSION_ID}&plan=mentioned");
});

test("every Session charges tax through Stripe Tax on a tax-exclusive price (R129, 30 Sep 2026)", () => {
  for (const tier of ["tracked", "mentioned", "cited"]) {
    for (const market of ["uk", "us"]) {
      const r = checkoutRequest(order({ tier, market }), ctx);
      assert.equal(r.kind, "session");
      if (r.kind !== "session") continue;
      assert.equal(r.form.get("automatic_tax[enabled]"), "true");
      assert.equal(r.form.get("tax_id_collection[enabled]"), "true");
      assert.equal(r.form.get("billing_address_collection"), "required");
      assert.equal(r.form.get("line_items[0][price_data][tax_behavior]"), "exclusive", "prices are before VAT");
    }
  }
});

test("alwaystracked is one subscription at the configured price per market", () => {
  const r = checkoutRequest(order({ tier: "tracked", market: "uk", quantity: 4, sector: "", keyword: "" }), ctx);
  assert.equal(r.kind, "session");
  if (r.kind !== "session") return;
  assert.equal(r.form.get("line_items[0][price_data][unit_amount]"), "500");
  assert.equal(r.form.get("line_items[0][quantity]"), "1");
  assert.equal(r.currency, "gbp");
});

test("what the spec sells by call is refused as a call, never a Session", () => {
  assert.equal(checkoutRequest(order({ tier: "everywhere" }), ctx).kind, "call");
  assert.equal(checkoutRequest(order({ sector: "other" }), ctx).kind, "call");
  assert.equal(checkoutRequest(order({ quantity: 11 }), ctx).kind, "call");
});

test("an order the browser could forge is refused, and no field sets the amount", () => {
  assert.equal(checkoutRequest(order({ market: "eu" }), ctx).kind, "invalid");
  assert.equal(checkoutRequest(order({ email: "nope" }), ctx).kind, "invalid");
  assert.equal(checkoutRequest(order({ keyword: " " }), ctx).kind, "invalid");
  assert.equal(checkoutRequest(order({ quantity: 0 }), ctx).kind, "invalid");
  assert.equal(checkoutRequest(order({ quantity: 1.5 }), ctx).kind, "invalid");
  const forged = checkoutRequest({ ...order(), amount: 1 } as Order, ctx);
  const honest = checkoutRequest(order(), ctx);
  assert.ok(forged.kind === "session" && honest.kind === "session");
  assert.equal(forged.form.toString(), honest.form.toString());
});
