import type { Metadata } from "next";

import TierName, { TIER_PLAIN } from "@/components/TierName";
import { CHECKOUT_LIMITS } from "@/config/contact";
import { TIERS, TRACKED_PRICE, contactUrlFor } from "@/config/pricing";
import { MARKETS, MAX_CLUSTERS, SECTORS, formatPrice, quoteFor } from "@/config/sector-pricing";
import { parseSelection, tierFromPlain, withSelection } from "@/config/sector-selection";
import { CARD, MICRO, SHELL, T } from "@/config/tokens";
import { CHECKOUT_TIERS, type CheckoutTier } from "@/lib/checkout/session";

export const dynamic = "force-dynamic";

/** An order in progress - noindex here, in the header rule and in robots.txt. */
export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

/**
 * The order form (R91 part 3, pricing spec section 5): before payment, the
 * keyword target, sector, quantity and work email, and the terms. Plain HTML
 * both ways, so it works with no script: "Update price" is a GET back here
 * with the picks, and "Continue to payment" posts the same picks to
 * /api/checkout, which builds the Session from the price config. The price
 * shown is the price for the picks in the posted form, because the posted
 * form carries only those picks as hidden fields.
 */

const ERRORS: Record<string, string> = {
  email: "A work email is needed.",
  keyword: "A keyword target is needed.",
  failed: "The checkout did not open. Please try again, or book a call.",
};

const field: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: "6px",
  padding: "10px 12px",
  fontFamily: "inherit",
  fontSize: "15px",
  color: T.ink,
  background: T.surface,
  border: `1px solid ${T.line}`,
  borderRadius: "10px",
};

const button: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: "15px",
  fontWeight: 600,
  borderRadius: "999px",
  padding: "12px 22px",
  cursor: "pointer",
};

export default async function Checkout({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const params = new URLSearchParams(Object.entries(q).filter((e): e is [string, string] => typeof e[1] === "string"));
  const named = tierFromPlain(q.tier);
  const tier: CheckoutTier = named && (CHECKOUT_TIERS as readonly string[]).includes(named) ? (named as CheckoutTier) : "tracked";
  const sel = parseSelection(params);
  const perCluster = tier !== "tracked";
  const tierPage = TIERS.find((t) => t.key === tier)!.href;

  let price: string | null = null;
  let call = false;
  if (!perCluster) price = `${formatPrice(TRACKED_PRICE[sel.market], sel.market)}/mo`;
  else if (sel.qty > MAX_CLUSTERS) call = true;
  else if (sel.sector) {
    const quote = quoteFor(sel.sector, sel.market, tier, sel.qty);
    if (quote.kind === "call") call = true;
    else price = `${formatPrice(quote.amount, sel.market)}/mo`;
  }
  const error = q.error ? ERRORS[q.error] : undefined;

  return (
    <section style={{ ...SHELL, maxWidth: "640px", paddingTop: "48px", paddingBottom: "96px" }}>
      <div style={MICRO}>Checkout</div>
      <h1 style={{ margin: "10px 0 0", fontSize: "32px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, color: T.ink }}>
        Start <TierName tier={tier} />
      </h1>
      <p style={{ margin: "12px 0 0", fontSize: "15px", lineHeight: 1.7, color: T.soft }}>
        A monthly plan. Payment is taken on Stripe&apos;s own page, which also takes a promotion code.{" "}
        <a href={tierPage} style={{ color: T.accent }}>
          See what the plan includes
        </a>
      </p>

      <form method="get" action="/checkout" style={{ ...CARD, padding: "22px", marginTop: "26px" }}>
        <input type="hidden" id="checkout-pick-tier" name="tier" value={TIER_PLAIN[tier]} maxLength={CHECKOUT_LIMITS.tier} />
        <div style={{ display: "grid", gap: "14px" }}>
          {perCluster ? (
            <>
              <label style={MICRO}>
                Sector
                <select name="sector" defaultValue={sel.sector} style={field}>
                  <option value="">Pick a sector</option>
                  {SECTORS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={MICRO}>
                Clusters
                <select name="clusters" defaultValue={String(Math.min(sel.qty, MAX_CLUSTERS))} style={field}>
                  {Array.from({ length: MAX_CLUSTERS }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <label style={MICRO}>
            Market
            <select name="market" defaultValue={sel.market} style={field}>
              {MARKETS.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginTop: "18px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "22px", fontWeight: 700, color: T.ink }} data-figure="checkout-price">
            {price ?? (call ? "Book a call" : "Pick a sector")}
          </div>
          <button type="submit" style={{ ...button, background: "transparent", color: T.ink, border: `1px solid ${T.line}` }}>
            Update price
          </button>
        </div>
      </form>

      {call ? (
        <p style={{ margin: "22px 0 0", fontSize: "15px", lineHeight: 1.7, color: T.soft }}>
          These picks are priced on a call.{" "}
          <a href={withSelection(contactUrlFor(tier), sel)} style={{ color: T.accent, fontWeight: 600 }}>
            Book a call
          </a>
        </p>
      ) : price ? (
        <form method="post" action="/api/checkout" style={{ ...CARD, padding: "22px", marginTop: "16px" }}>
          <input type="hidden" id="checkout-tier" name="tier" value={tier} maxLength={CHECKOUT_LIMITS.tier} />
          <input type="hidden" id="checkout-market" name="market" value={sel.market} maxLength={CHECKOUT_LIMITS.market} />
          {perCluster ? (
            <>
              <input type="hidden" id="checkout-sector" name="sector" value={sel.sector} maxLength={CHECKOUT_LIMITS.sector} />
              <input type="hidden" id="checkout-quantity" name="quantity" value={String(sel.qty)} maxLength={CHECKOUT_LIMITS.clusters} />
            </>
          ) : null}
          {error ? (
            <p role="alert" style={{ margin: "0 0 14px", fontSize: "14px", color: T.badFg }}>
              {error}
            </p>
          ) : null}
          <div style={{ display: "grid", gap: "14px" }}>
            <label style={MICRO}>
              Work email
              <input type="email" id="checkout-email" name="email" required maxLength={CHECKOUT_LIMITS.email} autoComplete="email" style={field} />
            </label>
            <label style={MICRO}>
              {perCluster ? "Keyword target" : "Keyword target (optional)"}
              <input type="text" id="checkout-keyword" name="keyword" required={perCluster} minLength={perCluster ? CHECKOUT_LIMITS.keyword.min : undefined} maxLength={CHECKOUT_LIMITS.keyword.max} style={field} />
            </label>
          </div>
          <ul style={{ margin: "18px 0 0", paddingLeft: "18px", fontSize: "14px", lineHeight: 1.7, color: T.soft }}>
            <li>Billed monthly, at the price above.</li>
            <li>30 days&apos; notice to cancel{perCluster ? ", because placements may still be in progress" : ""}.</li>
            {perCluster ? <li>A refund if the keyword turns out not to be workable.</li> : null}
          </ul>
          <button type="submit" style={{ ...button, marginTop: "18px", background: T.accent, color: T.surface, border: `1px solid ${T.accent}` }}>
            Continue to payment
          </button>
        </form>
      ) : null}
    </section>
  );
}
