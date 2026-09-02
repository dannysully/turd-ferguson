/**
 * Pricing configuration - Tasks 3 and 4.
 *
 * Static config by design. Task 4: "Sectors and their prices come from D4 as a
 * static config object in the repo. No runtime API call. Pricing needs to be
 * deterministic and instant, and a displayed price must not be able to change
 * between someone seeing it and ordering it."
 *
 * All prices USD, monthly.
 *
 * Unresolved decisions are literal [[Dn]] markers so they grep cleanly and
 * cannot be mistaken for real values. Do not deploy while any remain.
 */

/* ── Blocked decisions ───────────────────────────────────────── */
export const D1_CITED_PLACEMENTS = "[[D1]]";   // Always Cited placements/mo
export const D2_PAID_LIMITS = "[[D2]]";        // Always Tracked $99 limits
export const D3_FREE_LIMITS = "[[D3]]";        // Free tier limits
export const D8_SIGNUP_URL = "[[D8]]";         // Free tool signup destination
export const D9_PARTNER_CALL_URL = "[[D9]]";   // Enterprise booking link

export type Tier = {
  id: string;
  name: string;
  /** Base monthly price in USD. null = not a numeric price (free, or book a call). */
  basePrice: number | null;
  priceLabel: string;
  positioning: string;
  /** True where the sector selector adjusts this tier's price. */
  sectorPriced: boolean;
  includes: string[];
  cta: { label: string; href: string };
  emphasis?: boolean;
};

/**
 * Task 3 tier order is ascending intensity, and Always Cited carries the
 * emphasis treatment because it is the core product.
 */
export const TIERS: Tier[] = [
  {
    id: "tracked",
    name: "Always Tracked",
    basePrice: null,
    priceLabel: "Free, and $99/mo",
    positioning: "Know what your links did",
    sectorPriced: false,
    includes: [
      `Free: ${D3_FREE_LIMITS}`,
      `Paid: ${D2_PAID_LIMITS}`,
      "White-label reports",
      "Daily refresh",
    ],
    cta: { label: "Track your placements free", href: D8_SIGNUP_URL },
  },
  {
    id: "mentioned",
    name: "Always Mentioned",
    basePrice: 995,
    priceLabel: "$995/mo",
    positioning: "Get named when AI recommends",
    sectorPriced: true,
    includes: [
      "3 placements/mo",
      "One target keyword",
      "Everything in Always Tracked",
      "White-label reporting",
    ],
    cta: { label: "Get started", href: D8_SIGNUP_URL },
  },
  {
    id: "cited",
    name: "Always Cited",
    basePrice: 2495,
    priceLabel: "$2,495/mo",
    positioning: "Get cited, and rank for it",
    sectorPriced: true,
    includes: [
      `${D1_CITED_PLACEMENTS} placements/mo`,
      "Schema work on your pages",
      "Link insertions from the placements",
      "Everything in Always Mentioned",
    ],
    cta: { label: "Get started", href: D8_SIGNUP_URL },
    emphasis: true,
  },
  {
    id: "recommended",
    name: "Always Recommended",
    basePrice: null,
    priceLabel: "Book a call",
    positioning: "Multi-market, multi-brand, service-led",
    sectorPriced: false,
    includes: [
      "Everything in Always Cited",
      "Dedicated strategy",
      "Multi-market and multi-brand coverage",
    ],
    cta: { label: "Book a partner call", href: D9_PARTNER_CALL_URL },
  },
];

/**
 * Sector pricing - blocked on D4 (sector list, and the Always Mentioned /
 * Always Cited price for each).
 *
 * Shape required, one entry per sector:
 *   { id: "invoice-factoring", label: "Invoice factoring",
 *     prices: { mentioned: 1295, cited: 2995 } }
 *
 * Prices are whole USD figures, consistent with the base tiers. Intentionally
 * empty: Task 4 forbids inventing a price, and the standing rules forbid
 * inventing any value. The selector below renders only once this is populated,
 * so no fabricated sector price can reach the page.
 */
export type Sector = {
  id: string;
  label: string;
  prices: { mentioned: number; cited: number };
};

export const SECTORS: Sector[] = [];

/** Whole USD, no decimals - matches the base tier presentation. */
export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

/**
 * Resolve a tier's displayed price for the selected sector. Falls back to the
 * base price when no sector is chosen or the tier is sector-independent.
 */
export function priceFor(tier: Tier, sector: Sector | null): string {
  if (tier.basePrice === null) return tier.priceLabel;
  if (!sector || !tier.sectorPriced) return `${formatUsd(tier.basePrice)}/mo`;
  const sectorPrice =
    tier.id === "mentioned" ? sector.prices.mentioned : sector.prices.cited;
  return `${formatUsd(sectorPrice)}/mo`;
}
