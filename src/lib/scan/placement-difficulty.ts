/**
 * How hard a placement is to land - Danny, 25 September 2026.
 *
 * Every row on "Where to get placed" is a page the engines already cite. What
 * the visitor cannot tell from the list is which of those they could land
 * themselves and which need an editorial pitch or a budget - which is exactly
 * the line between doing it yourself and alwaysmentioned. So each row gets a
 * score out of 100 and a band, from what a link marketplace says the site
 * costs:
 *
 *   listed at $0-300          easy        15-34, rising with price
 *   listed at $300-1,000      moderate    40-64
 *   listed over $1,000        hard        65-85
 *   a review or directory site,
 *     not listed              moderate    50 - organic effort, not a purchase
 *   not listed anywhere       hard        80 - an editorial pitch
 *   DR 80 or more             up to +10, capped at 100
 *
 * The price itself is never shown and the marketplace is never named: the
 * basis line says which band, in words. Pure, so `placement-difficulty.test.mts`
 * executes every edge.
 */

export type Listing = { price: number | null; dr: number | null } | null;

export type Band = "Easy" | "Moderate" | "Hard";

export type Difficulty = { score: number; band: Band; basis: string };

export const EASY_MAX_PRICE = 300;
export const MODERATE_MAX_PRICE = 1000;

export function bandOf(score: number): Band {
  if (score < 35) return "Easy";
  if (score < 65) return "Moderate";
  return "Hard";
}

/** A band edge in words - built from the constants above, so the sentence and the rule cannot disagree. */
const usd = (n: number) => "$" + n.toLocaleString("en-US");

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Linear from `lo` to `hi` as price runs from `from` to `to`. */
function along(price: number, from: number, to: number, lo: number, hi: number): number {
  const t = to > from ? clamp((price - from) / (to - from), 0, 1) : 0;
  return Math.round(lo + t * (hi - lo));
}

export function scoreDifficulty(input: { listing: Listing; kind: string }): Difficulty {
  const { listing, kind } = input;
  let score: number;
  let basis: string;
  const price = listing && typeof listing.price === "number" && listing.price >= 0 ? listing.price : null;

  if (price !== null && price <= EASY_MAX_PRICE) {
    score = along(price, 0, EASY_MAX_PRICE, 15, 34);
    basis = "Listed on link marketplaces under " + usd(EASY_MAX_PRICE);
  } else if (price !== null && price <= MODERATE_MAX_PRICE) {
    score = along(price, EASY_MAX_PRICE, MODERATE_MAX_PRICE, 40, 64);
    basis = "Listed on link marketplaces, " + usd(EASY_MAX_PRICE) + "-" + usd(MODERATE_MAX_PRICE);
  } else if (price !== null) {
    score = along(price, MODERATE_MAX_PRICE, 5000, 65, 85);
    basis = "Listed on link marketplaces, over " + usd(MODERATE_MAX_PRICE);
  } else if (kind === "review") {
    score = 50;
    basis = "Earned through reviews and a listing";
  } else {
    score = 80;
    basis = "Not sold anywhere - an editorial pitch";
  }

  const dr = listing?.dr ?? null;
  if (typeof dr === "number" && dr >= 80) score += Math.round(((clamp(dr, 80, 100) - 80) / 20) * 10);

  score = clamp(score, 0, 100);
  return { score, band: bandOf(score), basis };
}

/** "You could place N of these yourself" - the easy ones, of the scored ones. */
export function selfServeCount(rows: readonly { difficulty?: number | null }[]): { easy: number; scored: number } {
  const scored = rows.filter((r) => typeof r.difficulty === "number");
  return { easy: scored.filter((r) => bandOf(r.difficulty as number) === "Easy").length, scored: scored.length };
}
