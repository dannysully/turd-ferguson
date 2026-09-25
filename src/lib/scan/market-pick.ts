import type { Market } from "./domain.ts";

/**
 * Which market a scan opens on - Danny, 25 September 2026.
 *
 * Every scan used to open on the UK unless the visitor changed it. The product
 * is now sold into the US, and a .com, .ai, .io or .co tells you nothing about
 * where a company's buyers are. So the market is picked, in this order:
 *
 *   1. the visitor's own choice;
 *   2. a country ending that decides it outright (.co.uk is UK, .us is US);
 *   3. where the domain actually ranks on Google - UK when its UK organic
 *      footprint is more than 1.5x its US one, otherwise US;
 *   4. the US, when there is nothing to go on.
 *
 * Pure, so every rule is executed by `market-pick.test.mts`. The ranking read
 * that feeds rule 3 lives in `dataforseo.ts`.
 */

export type MarketReason = "chosen" | "domain ending" | "rankings" | "default";

export type MarketPick = { market: Market; reason: MarketReason };

/** UK is chosen over the US only when its footprint is this many times larger. */
export const UK_OVER_US = 1.5;

const UK_ENDINGS = [".uk"];
const US_ENDINGS = [".us"];

/** Rule 2. Null when the ending says nothing. */
export function marketFromEnding(domain: string): Market | null {
  const d = domain.trim().toLowerCase().replace(/\.$/, "");
  if (UK_ENDINGS.some((e) => d.endsWith(e))) return "UK";
  if (US_ENDINGS.some((e) => d.endsWith(e))) return "US";
  return null;
}

/** How much of a domain's Google footprint sits in one market. */
export type Footprint = { etv: number; count: number } | null;

/**
 * Rule 3. Traffic value first, because a site can rank for a thousand UK
 * phrases nobody searches and forty US ones everybody does; keyword count only
 * when neither side has any traffic value to compare.
 */
export function marketFromRankings(uk: Footprint, us: Footprint): Market | null {
  const ukEtv = uk?.etv ?? 0;
  const usEtv = us?.etv ?? 0;
  if (ukEtv > 0 || usEtv > 0) return ukEtv > usEtv * UK_OVER_US ? "UK" : "US";
  const ukCount = uk?.count ?? 0;
  const usCount = us?.count ?? 0;
  if (ukCount > 0 || usCount > 0) return ukCount > usCount * UK_OVER_US ? "UK" : "US";
  return null;
}

/** The whole decision, given whatever the ranking read returned. */
export function pickMarket(input: {
  chosen?: Market | null;
  domain: string;
  rankings?: { uk: Footprint; us: Footprint } | null;
}): MarketPick {
  if (input.chosen) return { market: input.chosen, reason: "chosen" };
  const byEnding = marketFromEnding(input.domain);
  if (byEnding) return { market: byEnding, reason: "domain ending" };
  const byRankings = input.rankings ? marketFromRankings(input.rankings.uk, input.rankings.us) : null;
  if (byRankings) return { market: byRankings, reason: "rankings" };
  return { market: "US", reason: "default" };
}

/** Does the ranking read need to happen at all? Only when rules 1 and 2 leave it open. */
export function needsRankings(chosen: Market | null | undefined, domain: string): boolean {
  return !chosen && marketFromEnding(domain) === null;
}

/** The one line under the market toggle on the confirm screen. */
export function marketReasonLine(domain: string, pick: { market: Market; reason: MarketReason | null }): string | null {
  const where = pick.market === "UK" ? "UK" : "US";
  switch (pick.reason) {
    case "domain ending":
      return `Set from the ${endingOf(domain)} ending.`;
    case "rankings":
      return `Most of ${domain}'s Google rankings are in the ${where}.`;
    case "default":
      return "We default to the US - switch if your buyers are in the UK.";
    default:
      return null;
  }
}

/** ".co.uk" for acme.co.uk, ".uk" for acme.uk, ".us" for acme.us. */
export function endingOf(domain: string): string {
  const two = /\.(co|org|ltd|plc|me|net)\.[a-z]{2}$/.exec(domain);
  if (two) return two[0];
  const i = domain.lastIndexOf(".");
  return i >= 0 ? domain.slice(i) : domain;
}
