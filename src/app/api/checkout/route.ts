import { contactUrlFor, TRACKED_PRICE } from "@/config/pricing";
import { TIER_PLAIN } from "@/components/TierName";
import { CHECKOUT_TIERS, checkoutRequest, type CheckoutTier } from "@/lib/checkout/session";
import { createCheckoutSession } from "@/lib/checkout/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORIGIN = "https://alwayscited.com";

/**
 * Start a live Stripe Checkout (R91 part 2, Danny, 29 Sep 2026; pricing spec
 * section 5). Takes the order - tier, sector, quantity, market, work email,
 * keyword - as a plain form post or JSON, builds the Session with
 * `checkoutRequest` (the amount always from the price config, never from this
 * request) and sends the buyer to Stripe's own form with a 303.
 *
 * Anything sold by call, and any request made before the key exists, goes to
 * the contact page for that tier - the spec's "Book a call" fallback. A
 * refused Session is logged by status and Stripe's error code only; if the
 * code names a missing permission it goes to docs/blocked.md, not round it.
 *
 * The order form that posts here is not built yet (R91 part 3), so the
 * route has no caller in the app; route-callers records that.
 */
export async function POST(req: Request) {
  const isForm = (req.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  let raw: Record<string, unknown>;
  try {
    raw = isForm ? Object.fromEntries(new URLSearchParams(await req.text())) : await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object") return Response.json({ error: "bad_request" }, { status: 400 });
  const field = (k: string, max: number) => (typeof raw[k] === "string" ? (raw[k] as string).slice(0, max) : typeof raw[k] === "number" ? String(raw[k]) : "");

  const tier = field("tier", 20);
  const order = {
    tier,
    sector: field("sector", 60),
    quantity: Number(field("quantity", 4) || "1"),
    market: field("market", 4),
    email: field("email", 300),
    keyword: field("keyword", 200),
  };

  const r = checkoutRequest(order, {
    trackedPrice: { us: TRACKED_PRICE.us, uk: TRACKED_PRICE.uk },
    names: { tracked: TIER_PLAIN.tracked, mentioned: TIER_PLAIN.mentioned, cited: TIER_PLAIN.cited },
    origin: ORIGIN,
  });

  const known = (CHECKOUT_TIERS as readonly string[]).includes(tier) || tier === "everywhere";
  const call = ORIGIN + (known ? contactUrlFor(tier as CheckoutTier | "everywhere") : "/contact");
  const go = (url: string) => (isForm ? Response.redirect(url, 303) : Response.json({ url }));

  if (r.kind === "invalid") return Response.json({ error: "invalid", message: r.message }, { status: 400 });
  if (r.kind === "call") return go(call);

  const s = await createCheckoutSession(r.form);
  if (s.ok) return go(s.url);
  if (s.reason === "no_key") return go(call);
  console.error(`[checkout] Stripe did not create a Session: ${s.reason} ${s.status ?? ""} ${s.code ?? ""}`.trim());
  return Response.json({ error: "checkout_failed", message: "The checkout did not open. Please try again, or book a call." }, { status: 502 });
}
