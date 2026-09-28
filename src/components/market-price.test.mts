// Every tier's price follows the market toggle, not only the two sector tiers
// (Danny, 28 Sep 2026, R77). /alwaystracked drew its big price from the static
// priceLabel, so picking UK left it on $129. The components are client .tsx and
// pricing.ts reads through `@/`, so neither imports under node: the rule is
// held on the source, and the figures on the modules that do import.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { formatPrice, fromLabel, MARKETS } from "../config/sector-pricing.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const page = read("./PackagePage.tsx");
const sectorPrice = read("./SectorPrice.tsx");
const pricing = read("../config/pricing.ts");
const TIER_KEYS = ["tracked", "mentioned", "cited", "everywhere"];

test("the tier page's big price is drawn only by a component that reads the market", () => {
  const card = page.slice(page.indexOf("<MarketToggle"), page.indexOf("<TierEngines", page.indexOf("<MarketToggle")));
  assert.ok(card.length > 200, "the price card was not found between the toggle and the engine marks");
  assert.match(card, /<SectorPrice tier=\{tier\.key\}/, "the sector tiers' price is not SectorPrice");
  assert.match(card, /<MarketPrice tier=\{tier\.key\}/, "the other tiers' price is not MarketPrice");
  assert.doesNotMatch(card, /price\.figure|\{tier\.priceLabel\}\s*</, "the card renders a static price label");
  assert.doesNotMatch(page, /splitPriceLabel\(tier\.priceLabel\)/, "a static split of the label is back");
});

test("the market reader has a branch for every tier, and tracked's reads the market", () => {
  const fn = sectorPrice.slice(sectorPrice.indexOf("export function tierFromLabel"), sectorPrice.indexOf("function Parts"));
  assert.match(fn, /tier === "mentioned" \|\| tier === "cited"\) return fromLabel\(tier, m\)/);
  assert.match(fn, /tier === "tracked"\) return `from \$\{formatPrice\(TRACKED_PRICE\[m\], m\)\}\/mo`/);
  // everywhere is a call in every market: its label is the fallback, deliberately.
  assert.match(fn, /return TIERS\.find\(\(x\) => x\.key === tier\)\?\.priceLabel/);
  assert.match(sectorPrice, /const label = mounted \? tierFromLabel\(tier, m\) : fallback;/, "MarketPrice stopped using the reader");
  for (const k of TIER_KEYS) assert.ok(pricing.includes(`key: "${k}"`), `${k} is no longer a tier in pricing.ts`);
});

test("each priced tier's label differs between markets, so a stuck one would show", () => {
  const declared = /export const TRACKED_PRICE = \{ us: (\d+), uk: (\d+) \}/.exec(pricing);
  assert.ok(declared, "pricing.ts no longer declares TRACKED_PRICE in the shape this reads");
  const tracked = MARKETS.map((m, i) => `from ${formatPrice(Number(declared[i + 1]), m)}/mo`);
  assert.deepEqual(tracked, ["from $129/mo", "from £99/mo"]);
  for (const t of ["mentioned", "cited"] as const) {
    const [us, uk] = MARKETS.map((m) => fromLabel(t, m));
    assert.ok(us.includes("$") && uk.includes("£") && us !== uk, `${t}: ${us} / ${uk}`);
  }
});
