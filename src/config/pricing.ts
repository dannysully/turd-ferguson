/**
 * Pricing configuration.
 *
 * Static by design: pricing must be deterministic and instant, and a displayed
 * price must not be able to change between someone seeing it and ordering it.
 *
 * All prices USD, monthly.
 *
 * The free surface is a one-off scan, promoted in the hero. It is not a tier -
 * every plan below is paid, because ongoing checks cost us money per account
 * and "free forever" was never true. There is no free tile.
 *
 * Each tier links to its own page. The homepage gets to the packages; the
 * detail of what is included lives on the package page.
 *
 * Outstanding: D1 (alwayscited placements per month) and D4 (sector list and
 * per-sector prices). Feature lines for those are omitted rather than guessed.
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
  positioning: string;
  /** The package page this tier links to. */
  href: string;
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
    id: "tracked",
    key: "tracked",
    plainName: TIER_PLAIN.tracked,
    basePrice: 99,
    priceLabel: "$99/mo",
    positioning: "Know what your coverage did",
    sectorPriced: false,
    href: "/alwaystracked",
    includes: [
      "Ongoing AI visibility tracking",
      "Category leaderboard and cited sources",
      "Coverage matching, URL for URL",
      "Google positions for the article and the client page",
      "White-label reports",
    ],
    cta: { label: "See what is included", href: "/alwaystracked" },
  },
  {
    id: "mentioned",
    key: "mentioned",
    plainName: TIER_PLAIN.mentioned,
    basePrice: 995,
    priceLabel: "$995/mo",
    positioning: "Get named when AI recommends",
    sectorPriced: true,
    href: "/alwaysmentioned",
    includes: [
      "3 placements a month on one topic",
      "Placed in sources the engines already cite",
      `Everything in ${TIER_PLAIN.tracked}`,
    ],
    cta: { label: "See what is included", href: "/alwaysmentioned" },
  },
  {
    id: "cited",
    key: "cited",
    plainName: TIER_PLAIN.cited,
    basePrice: 2495,
    priceLabel: "$2,495/mo",
    positioning: "Get cited, and rank for it",
    sectorPriced: true,
    href: "/alwayscited",
    includes: [
      "Schema work on your pages",
      "Link insertions from the placements",
      `Everything in ${TIER_PLAIN.mentioned}`,
    ],
    cta: { label: "See what is included", href: "/alwayscited" },
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
    href: "/alwayseverywhere",
    includes: [
      `Everything in ${TIER_PLAIN.cited}`,
      "Dedicated strategy",
      "Multi-market and multi-brand coverage",
    ],
    cta: { label: "See what is included", href: "/alwayseverywhere" },
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
