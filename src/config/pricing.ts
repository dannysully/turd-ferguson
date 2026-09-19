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

/**
 * How many questions the tracking base price covers.
 *
 * Declared here because it is half of what $99 buys, and a number that says
 * what a price includes is a claim to a buyer in the same way the price is.
 * It was typed on four surfaces - the basis line under the homepage card, the
 * tier journey's lead, the package page gloss and the footer line on
 * /seo-agencies - and the four did not agree: three said "20 questions,
 * checked weekly" and the fourth said "20 questions a week", which is a
 * different offer. An agency reads one of those to a client.
 *
 * `priceBasis` below is built from it rather than repeating it, so the number
 * and the sentence that qualifies it cannot come apart.
 */
export const TRACKED_QUESTIONS = 20;

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
  /**
   * What the headline price actually buys, shown under it.
   *
   * A bare "$99/mo" is not quotable: an agency puts it in front of a client,
   * then finds the price moves with prompt count and check frequency. The
   * basis travels with the number so that cannot happen.
   */
  priceBasis?: string;
  positioning: string;
  /** The package page this tier links to. */
  href: string;
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
    priceLabel: "from $99/mo",
    priceBasis: `${TRACKED_QUESTIONS} questions, checked weekly. More questions or a tighter cadence moves the price.`,
    positioning: "Know what your coverage did",
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
 * The headline price as a sentence says it, for every context that cannot
 * carry the UI label: meta descriptions, OG and Twitter text, plain-text
 * email. "$995/mo" is a price tag; "$995 a month" is prose.
 *
 * It exists because all three priced pages typed their own price into
 * `metadata.description` on the line below the one that resolves the tier.
 * A price in a meta description is the claim a buyer reads in a search result
 * before they ever reach the page, so it is the worst of the three places for
 * a number nothing keeps in step - and `c2bf546` is this same mistake made
 * once already, in copy rather than in config, when the homepage sold a floor
 * as a flat price.
 *
 * Derived from `priceLabel` rather than rebuilt from `basePrice`, so the
 * "from" on a tier whose price moves with volume travels with the number.
 * Dropping it is the one bug the deleted `priceFor` had already been fixed
 * for; the note at the bottom of this file records that, and this is the
 * function that would otherwise have rediscovered it.
 *
 * A tier with no numeric price gets null rather than a string. Its label is a
 * call to action - "Book a call" - and a sentence about money is the one place
 * that must not be dropped into. The caller leaves the clause out instead.
 */
export function priceProse(tier: Tier): string | null {
  if (tier.basePrice === null) return null;
  return tier.priceLabel.replace("/mo", " a month");
}

/**
 * Sector pricing - removed, not forgotten. Still outstanding on D4 (the sector
 * list, and the alwaysmentioned and alwayscited price for each).
 *
 * This file used to carry `Sector`, an empty `SECTORS`, `formatUsd`,
 * `priceFor` and a `sectorPriced` flag on every tier, all of it feeding
 * `SectorPricing.tsx`. That component went in the redesign, and nothing has
 * imported any of it since - so what was left was a types-and-helpers block
 * whose doc comment told the next reader that "the selector below renders
 * only once this is populated". There is no selector below. A comment that
 * sends somebody looking for a component that was deleted costs more than the
 * code it documents.
 *
 * The decision it was really recording is the part worth keeping, so it is
 * stated here instead: **per-sector prices are not known and are not to be
 * invented.** Until Danny supplies the sector list with a price for
 * alwaysmentioned and alwayscited in each, every tier shows its base price
 * and no sector selector exists anywhere on the site.
 *
 * Bringing it back is a small job against a populated list - one entry per
 * sector, `{ id, label, prices: { mentioned, cited } }` - plus a resolver that
 * keeps a label saying more than its number ("from $99/mo") rather than
 * rebuilding the string from `basePrice` and silently dropping the "from".
 * That last detail is the one bug the old `priceFor` had already been fixed
 * for, and it is recorded here so it is not rediscovered the hard way.
 */
