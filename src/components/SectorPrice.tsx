"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import type { TierKey } from "@/components/TierName";
import { D } from "@/components/home/dark";
import { splitPriceLabel } from "@/config/price-label";
import { TIERS, TRACKED_PRICE, TRACKING_PACK_PRICE, trackingPackLine } from "@/config/pricing";
import {
  DEFAULT_MARKET,
  MARKETS,
  MAX_CLUSTERS,
  SECTORS,
  formatPrice,
  fromLabel,
  quoteFor,
  type Market,
  type SectorTier,
} from "@/config/sector-pricing";
import { T } from "@/config/tokens";

/**
 * The price tiles' live half - section 4 of docs/pricing-spec-2026-09-27.md
 * and Danny's note of 27 Sep (docs/danny.md line 56): on the packages section
 * and every tier page, each alwaysmentioned and alwayscited tile gets its own
 * sector select and a 1-10 stepper, the price follows them, and one US/UK
 * toggle per page sets the market, US first and default.
 *
 * Progressive enhancement, all of it. The server renders every label as the
 * US "from" string pricing.ts holds, which is what a visitor with no script
 * reads and what the price censuses sweep. The controls only render after
 * mount, so there is never a select on the page that does nothing.
 *
 * The market is one value per page shared by every island on it, held in a
 * module store rather than a provider, so the tiles can stay inside server
 * components. It is not persisted: a reload is US again, as the spec says.
 */

let market: Market = DEFAULT_MARKET;
const listeners = new Set<() => void>();
function setMarket(next: Market) {
  market = next;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function useMarket(): Market {
  return useSyncExternalStore(subscribe, () => market, () => DEFAULT_MARKET);
}
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const CALL = "Book a call";
const LABEL: Record<Market, string> = { us: "US $", uk: "UK £" };

/** A tier's "from" in a market. Never typed: pricing.ts and sector-prices.json only. */
export function tierFromLabel(tier: TierKey, m: Market): string {
  if (tier === "mentioned" || tier === "cited") return fromLabel(tier, m);
  if (tier === "tracked") return `from ${formatPrice(TRACKED_PRICE[m], m)}/mo`;
  return TIERS.find((x) => x.key === tier)?.priceLabel ?? CALL;
}

function Parts({ label, per }: { label: string; per: React.CSSProperties }) {
  const { prefix, figure, suffix } = splitPriceLabel(label);
  return (
    <>
      {prefix ? <span style={per}>{prefix}</span> : null}
      {figure}
      {suffix ? <span style={per}>{suffix}</span> : null}
    </>
  );
}

/** The one toggle on a page. Renders nothing until there is script to run it. */
export function MarketToggle({ tone = "light", style }: { tone?: "light" | "dark"; style?: React.CSSProperties }) {
  const m = useMarket();
  const mounted = useMounted();
  if (!mounted) return null;
  const line = tone === "dark" ? D.cardLine : T.line;
  return (
    <div role="group" aria-label="Prices in" style={{ display: "inline-flex", gap: "4px", fontSize: "12.5px", fontWeight: 600, ...style }}>
      {MARKETS.map((x) => (
        <button
          key={x}
          type="button"
          aria-pressed={m === x}
          onClick={() => setMarket(x)}
          style={{
            fontFamily: "inherit",
            fontSize: "inherit",
            fontWeight: "inherit",
            borderRadius: "999px",
            padding: "4px 12px",
            cursor: "pointer",
            border: "1px solid " + (m === x ? T.accent : line),
            background: m === x ? T.accent : "transparent",
            color: m === x ? T.surface : "inherit",
          }}
        >
          {LABEL[x]}
        </button>
      ))}
      {m === "uk" ? <span style={{ alignSelf: "center", marginLeft: "6px", fontWeight: 500, opacity: 0.8 }}>ex VAT</span> : null}
    </div>
  );
}

/** A "from" label that follows the page's market. No controls. */
export function MarketPrice({ tier, fallback, per }: { tier: TierKey; fallback: string; per?: React.CSSProperties }) {
  const m = useMarket();
  const mounted = useMounted();
  const label = mounted ? tierFromLabel(tier, m) : fallback;
  return per ? <Parts label={label} per={per} /> : <>{label}</>;
}

/** The extra tracking pack in the page's market, one currency at a time (R61). */
export function PackLine() {
  const m = useMarket();
  const mounted = useMounted();
  const at = mounted ? m : DEFAULT_MARKET;
  return <>{trackingPackLine(formatPrice(TRACKING_PACK_PRICE[at], at))}</>;
}

/**
 * The tile price with its sector select and stepper, for the two tiers sold
 * per cluster. `fallback` is the server's label, drawn until mount.
 */
export function SectorPrice({
  tier,
  fallback,
  per,
  priceStyle,
  compact = false,
  basis,
}: {
  tier: SectorTier;
  fallback: string;
  per: React.CSSProperties;
  priceStyle: React.CSSProperties;
  compact?: boolean;
  /** Drawn between the price and the controls, so the basis line sits
   *  directly under the price in every column (Danny, 28 Sep, R56). */
  basis?: React.ReactNode;
}) {
  const m = useMarket();
  const mounted = useMounted();
  const [sector, setSector] = useState("");
  const [qty, setQty] = useState(1);

  let label = mounted ? fromLabel(tier, m) : fallback;
  if (mounted && sector) {
    const q = quoteFor(sector, m, tier, qty);
    label = q.kind === "call" ? CALL : `${formatPrice(q.amount, m)}/mo`;
  } else if (mounted && qty > MAX_CLUSTERS) {
    label = CALL;
  }

  const id = `sp-${tier}`;
  const control: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: "12.5px",
    color: "inherit",
    background: "transparent",
    border: "1px solid " + T.line,
    borderRadius: "8px",
    minHeight: compact ? "36px" : "32px",
  };

  return (
    <>
      <div style={priceStyle} aria-live="polite">
        <Parts label={label} per={per} />
      </div>
      {basis}
      {mounted ? (
        // Wraps rather than widens: at 390 the select and the stepper on one row
        // pushed the card 29px past the viewport (28 Sep 2026). In compact's
        // column a `1 1 150px` basis is read as a height, which drew the select
        // as a tall box (R56), so compact sizes both controls explicitly.
        <div style={{ display: "flex", flexDirection: compact ? "column" : "row", flexWrap: "wrap", gap: "6px", marginTop: "10px", minWidth: 0 }}>
          <label htmlFor={id} className="sr-only">
            Sector
          </label>
          <select
            id={id}
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            style={{
              ...control,
              ...(compact ? { flex: "0 0 auto", height: "36px", width: "100%" } : { flex: "1 1 150px" }),
              minWidth: 0,
              maxWidth: "100%",
              padding: "0 8px",
            }}
          >
            <option value="">Pick your sector</option>
            {SECTORS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <div role="group" aria-label="Keyword clusters" style={{ display: "inline-flex", alignItems: "center", gap: "2px", ...(compact ? { flex: "0 0 auto", height: "36px" } : { flexShrink: 0 }) }}>
            <button type="button" aria-label="One fewer cluster" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ ...control, width: "32px", cursor: "pointer" }}>
              −
            </button>
            <span style={{ minWidth: "58px", textAlign: "center", fontSize: "12.5px", fontWeight: 600 }} aria-live="polite">
              {qty > MAX_CLUSTERS ? `${MAX_CLUSTERS + 1}+` : qty} {qty === 1 ? "cluster" : "clusters"}
            </span>
            <button type="button" aria-label="One more cluster" disabled={qty > MAX_CLUSTERS} onClick={() => setQty((q) => Math.min(MAX_CLUSTERS + 1, q + 1))} style={{ ...control, width: "32px", cursor: "pointer" }}>
              +
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
