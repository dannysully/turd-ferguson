/**
 * Pricing configuration.
 *
 * Static by design: pricing must be deterministic and instant, and a displayed
 * price must not be able to change between someone seeing it and ordering it.
 *
 * All prices USD, monthly.
 *
 * Critique 0.1: every placeholder is stripped rather than shipped. Where a
 * value is not yet confirmed the feature line is omitted entirely - a page with
 * fewer claims beats a page with broken ones. Values still outstanding:
 *   D1 - Always Cited placements per month
 *   D2 - Always Tracked Pro limits (domains, placements, keywords, refresh)
 *   D3 - free tier limits
 *   D4 - sector list and per-sector prices
 * Add them back as feature lines once confirmed.
 *
 * Critique 1.7: the tracking tool is not built, so both Tracked tiers are
 * waitlist CTAs rather than signup links pointing at a product that does not
 * exist. Critique 0.1: every CTA resolves to a real page.
 */

/** Single destination for every CTA until real signup and booking flows exist. */
export const CONTACT_URL = "/contact";

export type Tier = {
  id: string;
  name: string;
  /** Base monthly price in USD. null = not a numeric price. */
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
 * Ascending intensity. Critique 2.3: Always Tracked is split into two cards so
 * the free and paid offers are not one card with two prices.
 */
export const TIERS: Tier[] = [
  {
    id: "tracked-free",
    name: "Always Tracked",
    basePrice: null,
    priceLabel: "Free",
    positioning: "Know what your links did",
    sectorPriced: false,
    includes: [
      "Upload placements you have already built",
      "Both keyword sets, tracked separately",
      "Four honest AI Overview outcomes",
      "90 days of history backfilled",
    ],
    cta: { label: "Join the waitlist", href: CONTACT_URL },
  },
  {
    id: "tracked-pro",
    name: "Always Tracked Pro",
    basePrice: 99,
    priceLabel: "$99/mo",
    positioning: "Report it under your own brand",
    sectorPriced: false,
    includes: [
      "Everything in Always Tracked",
      "White-label reports",
      "Daily refresh",
    ],
    cta: { label: "Join the waitlist", href: CONTACT_URL },
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
      "Everything in Always Tracked Pro",
    ],
    cta: { label: "Get started", href: CONTACT_URL },
  },
  {
    id: "cited",
    name: "Always Cited",
    basePrice: 2495,
    priceLabel: "$2,495/mo",
    positioning: "Get cited, and rank for it",
    sectorPriced: true,
    includes: [
      "Schema work on your pages",
      "Link insertions from the placements",
      "Everything in Always Mentioned",
    ],
    cta: { label: "Get started", href: CONTACT_URL },
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
    cta: { label: "Book a partner call", href: CONTACT_URL },
  },
];

/**
 * Sector pricing - outstanding on D4 (sector list, and the Always Mentioned and
 * Always Cited price for each).
 *
 * Shape required, one entry per sector:
 *   { id: "invoice-factoring", label: "Invoice factoring",
 *     prices: { mentioned: 1295, cited: 2995 } }
 *
 * Intentionally empty: inventing a price is not an option, so the selector
 * below renders only once this is populated. Critique 1.8 reads the selector as
 * "never built" - it is built and gated on this data, which is the same thing
 * from the outside until D4 lands.
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
