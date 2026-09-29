import { MAX_CLUSTERS, type Market, quoteFor } from "../../config/sector-pricing.ts";
import { CHECKOUT_LIMITS } from "../../config/contact.ts";
import { isPlausibleEmail } from "../email-address.ts";

/**
 * The Stripe Checkout Session a live order asks for - section 5 of
 * docs/pricing-spec-2026-09-27.md (R91, Danny, 29 Sep 2026; danny.md 91).
 *
 * Pure, so the rules are tested without Stripe: the amount is always read
 * from the price config here, never from anything the browser sent; every
 * Session allows promotion codes; success and cancel land on alwayscited.com.
 * Anything the spec sells by call - alwayseverywhere, the "other" sector,
 * more than ten clusters - is refused as `call`, so the caller shows
 * "Book a call" instead of a checkout.
 *
 * Returns the form body for `POST /v1/checkout/sessions`. The caller holds
 * the key (process.env only) and makes the request.
 */

export const CHECKOUT_TIERS = ["tracked", "mentioned", "cited"] as const;
export type CheckoutTier = (typeof CHECKOUT_TIERS)[number];

export type Order = { tier: string; sector: string; quantity: number; market: string; email: string; keyword: string };

export type CheckoutContext = {
  /** alwaystracked's monthly price per market, from pricing.ts. */
  trackedPrice: Record<Market, number>;
  /** Each tier's plain name (TIER_PLAIN), for the line item Stripe shows. */
  names: Record<CheckoutTier, string>;
  /** Where Stripe returns the buyer. Always the production origin. */
  origin: "https://alwayscited.com";
};

export type CheckoutRequest = { kind: "session"; form: URLSearchParams; amount: number; currency: "usd" | "gbp" } | { kind: "call" } | { kind: "invalid"; message: string };

export function checkoutRequest(order: Order, ctx: CheckoutContext): CheckoutRequest {
  const market = order.market === "uk" ? "uk" : order.market === "us" ? "us" : null;
  if (!market) return { kind: "invalid", message: "Unknown market." };
  if (!(CHECKOUT_TIERS as readonly string[]).includes(order.tier)) return { kind: "call" };
  const tier = order.tier as CheckoutTier;
  const email = order.email.trim().toLowerCase();
  if (email.length > CHECKOUT_LIMITS.email || !isPlausibleEmail(email)) return { kind: "invalid", message: "A work email is needed." };
  const keyword = order.keyword.trim();
  if (tier !== "tracked" && (keyword.length < CHECKOUT_LIMITS.keyword.min || keyword.length > CHECKOUT_LIMITS.keyword.max)) return { kind: "invalid", message: "A keyword target is needed." };
  if (!Number.isInteger(order.quantity) || order.quantity < 1) return { kind: "invalid", message: "Pick a quantity." };
  if (order.quantity > MAX_CLUSTERS) return { kind: "call" };

  let unit: number;
  let quantity: number;
  if (tier === "tracked") {
    unit = ctx.trackedPrice[market];
    quantity = 1;
  } else {
    const one = quoteFor(order.sector, market, tier, 1);
    if (one.kind === "call") return { kind: "call" };
    unit = one.amount;
    quantity = order.quantity;
  }

  const currency = market === "uk" ? "gbp" : "usd";
  const f = new URLSearchParams();
  f.set("mode", "subscription");
  f.set("allow_promotion_codes", "true");
  f.set("customer_email", email);
  f.set("success_url", `${ctx.origin}/checkout/done?session={CHECKOUT_SESSION_ID}`);
  f.set("cancel_url", `${ctx.origin}/packages`);
  f.set("line_items[0][quantity]", String(quantity));
  f.set("line_items[0][price_data][currency]", currency);
  f.set("line_items[0][price_data][unit_amount]", String(Math.round(unit * 100)));
  f.set("line_items[0][price_data][recurring][interval]", "month");
  f.set("line_items[0][price_data][product_data][name]", ctx.names[tier]);
  for (const [k, v] of Object.entries({ tier, sector: tier === "tracked" ? "" : order.sector, quantity: String(quantity), market, keyword })) {
    f.set(`metadata[${k}]`, v);
    f.set(`subscription_data[metadata][${k}]`, v);
  }
  // UK VAT at checkout (spec section 2) needs Stripe Tax or a tax rate on the
  // account - not set here until that exists; see docs/blocked.md.
  return { kind: "session", form: f, amount: unit * quantity, currency };
}
