/**
 * Step 2 of /coverage-check: the draft built from the coverage (Danny, 30 Sep
 * 2026, danny.md lines 128-133; R140).
 *
 * Step 1 takes the coverage and nothing else. The draft route reads each piece
 * and one model call proposes the brand, the claim, who it is for and five
 * prompts; this file is everything around that call that can be decided
 * without the network - which rows are ticked, which market the draft opens
 * on and why, which domain is the client's, which pages could not be read, and
 * whether the draft may be run. Pure, so every rule runs under
 * `draft.test.mts`.
 *
 * No `server-only`: the form imports the pre-tick and the run check too, so
 * the page and the route cannot disagree about either.
 */

import { marketFromEnding } from "../scan/market-pick.ts";
import { decodeEntities } from "../scan/prose.ts";
import { isPlausibleDomain, normalizeDomain, type Market } from "../scan/domain.ts";
import { MAX_COVERAGE_URLS, type CoverageRow } from "./csv.ts";

/** The line step 2 carries when more rows were parsed than one reading reports on. */
export const REPORT_LIMIT_LINE = `We report on ${MAX_COVERAGE_URLS} per reading`;

/** One parsed row as step 2 lists it. Every row is listed; the first five are ticked. */
export type DraftRow = CoverageRow & { ticked: boolean };

/**
 * Every parsed row, the first `MAX_COVERAGE_URLS` ticked and the rest not.
 * Nothing is dropped: a row past the limit is shown unticked, so the visitor
 * can swap it in rather than lose it without a word.
 */
export function pretick(rows: CoverageRow[]): DraftRow[] {
  return rows.map((r, i) => ({ ...r, ticked: i < MAX_COVERAGE_URLS }));
}

/** The rows the run is given: the ticked ones, never more than one reading reports on. */
export function tickedRows(rows: DraftRow[]): CoverageRow[] {
  return rows.filter((r) => r.ticked).slice(0, MAX_COVERAGE_URLS).map(({ url, source_domain }) => ({ url, source_domain }));
}

// ------------------------------------------------------------------- market

export type DraftMarketReason = "domain ending" | "publications" | "currency" | "default";

/**
 * Which market the draft opens on, in market-pick order: the client domain's
 * own ending where it decides it, then the publications' endings, then the
 * currency the pieces are written in, then the US. The visitor's toggle
 * overrides all of it; this is only where it starts.
 *
 * The publications and the currency are counted, and the UK needs more than
 * the US on either to win - a tie says nothing, and says it by falling through.
 */
export function draftMarket(input: {
  clientDomain: string | null;
  rows: CoverageRow[];
  text: string;
}): { market: Market; reason: DraftMarketReason } {
  if (input.clientDomain) {
    const byEnding = marketFromEnding(input.clientDomain);
    if (byEnding) return { market: byEnding, reason: "domain ending" };
  }

  let uk = 0;
  let us = 0;
  for (const r of input.rows) {
    const m = marketFromEnding(r.source_domain);
    if (m === "UK") uk++;
    else if (m === "US") us++;
  }
  if (uk !== us) return { market: uk > us ? "UK" : "US", reason: "publications" };

  const pounds = (input.text.match(/£|\bGBP\b/g) ?? []).length;
  const dollars = (input.text.match(/(?<![A-Z])\$|\bUSD\b/g) ?? []).length;
  if (pounds !== dollars) return { market: pounds > dollars ? "UK" : "US", reason: "currency" };

  return { market: "US", reason: "default" };
}

/** The one line under step 2's market toggle. */
export function draftMarketLine(pick: { market: Market; reason: DraftMarketReason }, clientDomain: string | null): string {
  switch (pick.reason) {
    case "domain ending":
      return `Set from ${clientDomain}'s domain ending.`;
    case "publications":
      return `Most of the publications are ${pick.market === "UK" ? "UK" : "US"} sites.`;
    case "currency":
      return `The coverage prices things in ${pick.market === "UK" ? "pounds" : "dollars"}.`;
    default:
      return "We default to the US - switch if your buyers are in the UK.";
  }
}

// -------------------------------------------------------------- client domain

/**
 * Every link in a piece that leaves the publication, resolved against the
 * page's own address. Entity-decoded for the reason `sameHostLinks` in
 * crawl.ts is: the attribute is encoded, the address is what it decodes to.
 */
export function outboundLinks(html: string, base: string): string[] {
  let own: string;
  try {
    own = normalizeDomain(new URL(base).hostname);
  } catch {
    return [];
  }
  const out = new Set<string>();
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    let url: URL;
    try {
      url = new URL(decodeEntities(m[1]!), base);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    const host = normalizeDomain(url.hostname);
    if (!isPlausibleDomain(host) || host === own || host.endsWith("." + own)) continue;
    url.hash = "";
    out.add(url.toString());
  }
  return [...out];
}

/** Lower case letters and digits only: "Brightbook Ltd." and "brightbook" compare. */
function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** The name part of a domain: "brightbook" for www.brightbook.co.uk. */
function nameOf(domain: string): string {
  return compact(domain.split(".")[0] ?? "");
}

/**
 * The client's domain, from the links in the pieces, or null.
 *
 * A link counts when its domain's name part is the brand, or one contains the
 * other and the shorter is at least four characters ("brightbook" and
 * "brightbookhq"). Links back to any publication in the list never count. The
 * domain linked most wins; a tie between two different domains is null, and
 * null means the field is left blank and required - never guessed.
 */
export function clientDomainFrom(input: { brand: string; links: string[]; publications: string[] }): string | null {
  const brand = compact(input.brand);
  if (brand.length < 2) return null;
  const skip = new Set(input.publications.map((p) => normalizeDomain(p)));

  const votes = new Map<string, number>();
  for (const link of input.links) {
    const domain = normalizeDomain(link);
    if (!isPlausibleDomain(domain) || skip.has(domain)) continue;
    const name = nameOf(domain);
    const shorter = Math.min(name.length, brand.length);
    const matches = name === brand || (shorter >= 4 && (name.includes(brand) || brand.includes(name)));
    if (matches) votes.set(domain, (votes.get(domain) ?? 0) + 1);
  }

  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return null;
  if (ranked.length > 1 && ranked[1]![1] === ranked[0]![1]) return null;
  return ranked[0]![0];
}

// ------------------------------------------------------------------ the run

/**
 * Why step 2 may not be run yet, or null when it may. The client domain is the
 * one field the draft is allowed to leave blank, so it is the one checked
 * first; the run route's own validation is still the one that counts.
 */
export function runBlocker(draft: { clientDomain: string; rows: DraftRow[] }): string | null {
  const domain = normalizeDomain(draft.clientDomain);
  if (!domain) return "Tell us the client's domain. We could not find it in the coverage.";
  if (!isPlausibleDomain(domain)) return "That does not look like a website address. Try example.com.";
  if (!draft.rows.some((r) => r.ticked)) return "Tick at least one piece of coverage to report on.";
  return null;
}
