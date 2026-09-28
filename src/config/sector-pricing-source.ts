/**
 * For the censuses that read `pricing.ts` as text (price-claims,
 * price-surfaces, price-schema, video): Node cannot import that file because
 * of its `@/` specifiers, so they regex its literals. Since R50 section 3 the
 * sector tiers' figures are calls - `fromLabel("cited")`, `fromPrice("cited",
 * "us")` - and this writes each call back as the literal it evaluates to, so
 * the parsers read the figure the page will actually draw rather than going
 * blind on a call.
 */
import { fromLabel, fromPrice, type Market, type SectorTier } from "./sector-pricing.ts";

export function inlineSectorPrices(source: string): string {
  return source
    .replace(/fromLabel\("(mentioned|cited)"\)/g, (_, t: SectorTier) => JSON.stringify(fromLabel(t)))
    .replace(/fromPrice\("(mentioned|cited)",\s*"(us|uk)"\)/g, (_, t: SectorTier, m: Market) => String(fromPrice(t, m)));
}
