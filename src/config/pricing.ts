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
 *   D1 - alwayscited placements per month
 *   D4 - sector list and per-sector prices
 *
 * D2 and D3 are settled. Per the v2 audit's decision 1, the free permanent
 * surface is the ungated scan, and alwaystracked itself is a 30-day trial that
 * starts when someone gives an email. The tile reads "free for 30 days"
 * accordingly - if alwaystracked becomes free forever instead, only this tile
 * and the gate copy change.
 *
 * Currency: USD throughout, per the repositioning brief and the audit's own
 * tile table. The internal GBP 100 figure is a cost input, not a list price -
 * flagged for Danny rather than converted here.
 * Add them back as feature lines once confirmed.
 *
 * Critique 1.7: the tracking tool is not built, so both Tracked tiers are
 * waitlist CTAs rather than signup links pointing at a product that does not
 * exist. Critique 0.1: every CTA resolves to a real page.
 */

import { TIER_PLAIN, type TierKey } from "@/components/TierName";

/** Single destination for every CTA until real signup and booking flows exist. */
export const CONTACT_URL = "/contact";

export type Tier = {
  id: string;
  /** Which lockup the TierName component renders. */
  key: TierKey;
  /** Plan variant, rendered outside the brand word. */
  qualifier?: string;
  /** Unstyled one-word form for plain-text contexts (meta, alt, JSON-LD). */
  plainName: string;
  /** Base monthly price in USD. null = not a numeric price. */
  basePrice: number | null;
  priceLabel: string;
  /** Trial or qualifier shown under the price. */
  priceNote?: string;
  positioning: string;
  /** True where the sector selector adjusts this tier's price. */
  sectorPriced: boolean;
  includes: string[];
  cta: { label: string; href: string };
  emphasis?: boolean;
};

/**
 * Ascending intensity. Critique 2.3: alwaystracked is split into two cards so
 * the free and paid offers are not one card with two prices.
 */
export const TIERS: Tier[] = [
  {
    id: "tracked-free",
    key: "tracked",
    plainName: TIER_PLAIN.tracked,
    basePrice: null,
    priceLabel: "Free for 30 days",
    positioning: "See what AI already says",
    sectorPriced: false,
    includes: [
      "AI visibility only",
      "One client, one market, four engines, ten questions a day",
      "Category leaderboard and cited sources",
      "Coverage matching",
      "13 months of AI Overview history",
    ],
    cta: { label: "Join the waitlist", href: CONTACT_URL },
  },
  {
    id: "tracked-pro",
    key: "tracked",
    qualifier: "pro",
    plainName: `${TIER_PLAIN.tracked} pro`,
    basePrice: 99,
    priceLabel: "$99/mo",
    positioning: "Add Google rankings and your logo",
    sectorPriced: false,
    includes: [
      `Everything in ${TIER_PLAIN.tracked}`,
      "The article's and the client page's Google positions, tracked separately",
      "The four AI Overview outcomes",
      "Unlimited clients, both markets, eight engines",
      "White-label reports, daily readings",
    ],
    cta: { label: "Join the waitlist", href: CONTACT_URL },
  },
  {
    id: "mentioned",
    key: "mentioned",
    plainName: TIER_PLAIN.mentioned,
    basePrice: 995,
    priceLabel: "$995/mo",
    positioning: "Get named when AI recommends",
    sectorPriced: true,
    includes: [
      "3 placements a month on one topic",
      `Everything in ${TIER_PLAIN.tracked} pro`,
    ],
    cta: { label: "Get started", href: CONTACT_URL },
  },
  {
    id: "cited",
    key: "cited",
    plainName: TIER_PLAIN.cited,
    basePrice: 2495,
    priceLabel: "$2,495/mo",
    positioning: "Get cited, and rank for it",
    sectorPriced: true,
    includes: [
      "Schema work on your pages",
      "Link insertions from the placements",
      `Everything in ${TIER_PLAIN.mentioned}`,
    ],
    cta: { label: "Get started", href: CONTACT_URL },
    emphasis: true,
  },
  {
    id: "everywhere",
    key: "everywhere",
    plainName: TIER_PLAIN.everywhere,
    basePrice: null,
    priceLabel: "Book a call",
    positioning: "Every market, every brand, every surface",
    sectorPriced: false,
    includes: [
      `Everything in ${TIER_PLAIN.cited}`,
      "Dedicated strategy",
      "Multi-market and multi-brand coverage",
    ],
    cta: { label: "Book a partner call", href: CONTACT_URL },
  },
];

/**
 * Sector pricing - outstanding on D4 (sector list, and the alwaysmentioned and
 * alwayscited price for each).
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
