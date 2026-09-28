/**
 * A tile's sector, cluster count and market, carried in a URL (R69, danny.md
 * line 70, 28 Sep 2026): a visitor who picks Technology and 3 clusters on the
 * packages table lands on the tier page with the same picks and the same
 * price, and a call CTA takes them to /contact.
 *
 * Only what is set is written - an untouched tile's CTA stays bare. Anything
 * that does not validate on the way back in is dropped silently and the
 * default used: a hand-edited or stale link is never an error.
 *
 * Clusters run 1..MAX_CLUSTERS + 1 - the top value is the stepper's own "11+"
 * state, which prices as a call, so a link from that state reproduces it
 * (Danny's note gives this range; it is the one the stepper can reach).
 */

import { TIER_PLAIN, type TierKey } from "../lib/tier-text.ts";
import { DEFAULT_MARKET, MARKETS, MAX_CLUSTERS, quoteFor, sectorById, type Market, type SectorTier } from "./sector-pricing.ts";

export type Selection = { sector: string; qty: number; market: Market };

export const SELECTION_DEFAULT: Selection = { sector: "", qty: 1, market: DEFAULT_MARKET };

export const SELECTION_PARAMS = { sector: "sector", clusters: "clusters", market: "market" } as const;

/** The picks a URL's query carries, each one validated or defaulted on its own. */
export function parseSelection(params: URLSearchParams): Selection {
  const sector = params.get(SELECTION_PARAMS.sector) ?? "";
  const clusters = params.get(SELECTION_PARAMS.clusters) ?? "";
  const market = params.get(SELECTION_PARAMS.market) ?? "";
  const qty = /^\d{1,3}$/.test(clusters) ? Number(clusters) : NaN;
  return {
    sector: sectorById(sector) ? sector : SELECTION_DEFAULT.sector,
    qty: qty >= 1 && qty <= MAX_CLUSTERS + 1 ? qty : SELECTION_DEFAULT.qty,
    market: (MARKETS as string[]).includes(market) ? (market as Market) : SELECTION_DEFAULT.market,
  };
}

/** `href` with the picks that differ from the default appended; unchanged when none do. */
export function withSelection(href: string, sel: Selection): string {
  const q = new URLSearchParams();
  if (sel.sector) q.set(SELECTION_PARAMS.sector, sel.sector);
  if (sel.qty !== SELECTION_DEFAULT.qty) q.set(SELECTION_PARAMS.clusters, String(sel.qty));
  if (sel.market !== SELECTION_DEFAULT.market) q.set(SELECTION_PARAMS.market, sel.market);
  const s = q.toString();
  if (!s) return href;
  return href + (href.includes("?") ? "&" : "?") + s;
}

/** The tier a `?tier=` value names (its TIER_PLAIN word), or null. */
export function tierFromPlain(value: string | null | undefined): TierKey | null {
  return (Object.keys(TIER_PLAIN) as TierKey[]).find((k) => TIER_PLAIN[k] === value) ?? null;
}

/**
 * The picks as one plain line - "Technology, 3 clusters, US market" - or null
 * when nothing was picked. What /contact shows the visitor and what the
 * enquiry email carries, so the two cannot say different things (R69's
 * follow-up: the call CTA sent the picks and the form dropped them).
 */
export function picksLine(sel: Selection): string | null {
  const parts: string[] = [];
  const sector = sel.sector ? sectorById(sel.sector) : undefined;
  if (sector) parts.push(sector.label);
  if (sel.qty !== SELECTION_DEFAULT.qty) {
    parts.push(sel.qty > MAX_CLUSTERS ? `more than ${MAX_CLUSTERS} clusters` : `${sel.qty} clusters`);
  }
  if (!parts.length && sel.market === SELECTION_DEFAULT.market) return null;
  parts.push(`${sel.market.toUpperCase()} market`);
  return parts.join(", ");
}

/** Whether the picks price as a call: Other, or past the stepper's top. */
export function isCall(tier: SectorTier, sel: Selection): boolean {
  if (sel.qty > MAX_CLUSTERS) return true;
  return sel.sector ? quoteFor(sel.sector, sel.market, tier, sel.qty).kind === "call" : false;
}
