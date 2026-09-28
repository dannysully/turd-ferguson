import { MarketPrice, MarketToggle, SectorPrice } from "@/components/SectorPrice";
import TierEngines from "@/components/TierEngines";
import TierName, { type TierKey } from "@/components/TierName";
import { ALWAYS_ON, ALWAYS_ON_SUPPORT } from "@/config/always-on";
import { TIERS, contactUrlFor } from "@/config/pricing";
import { CARD, SHELL, T } from "@/config/tokens";

import { D, PACKAGES_WASH } from "./dark";

/**
 * Packages - the tier staircase, from Packages.dc.html ("Home 3", 25 Sep 2026).
 *
 * A dark band where the four tiers climb a drawn staircase, then one table of
 * what each tier adds. It replaces the four package cards and the separate
 * white-label card; "every tier is white-label" is now the table's last row
 * and the line under it.
 *
 * Every price and basis is read off the tier in src/config/pricing.ts, so the
 * homepage cannot quote a number the package pages disagree with. Where the
 * board prints a basis pricing.ts does not hold, the tier's `positioning` from
 * the same file stands in rather than a line typed here. No "Most taken" badge
 * (removed 25 Sep). The emphasised tier carries a "Recommended" pill and no
 * tinted column (Danny, 28 Sep, R58) - never "Most popular", there is no sales
 * data behind it.
 *
 * The staircase draws itself on the board's 10s loop under
 * html[data-motion="on"]; with no script or reduced motion it is drawn, with
 * every step in place.
 */

/** The board's button labels. The everywhere tier's goes to a call, not a page;
 *  the tracked tier's to /contact with the tier carried, as it is set up by
 *  hand (Danny, 26 Sep 2026). */
const CTA: Record<TierKey, { label: string; href?: string }> = {
  tracked: { label: "Start tracking", href: contactUrlFor("tracked") },
  mentioned: { label: "Get placed" },
  cited: { label: "Go for position #1" },
  everywhere: { label: "Talk to us", href: "/contact" },
};

/** 1 = included, 0 = not, a string = the cell's text. One entry per tier, in TIERS order. */
type Cell = 0 | 1 | string;
const ROWS: { what: string; cells: Record<TierKey, Cell> }[] = [
  { what: "Buyer questions across the AI engines and Google keywords, checked daily", cells: { tracked: 1, mentioned: 1, cited: 1, everywhere: 1 } },
  { what: "Every source behind every answer", cells: { tracked: 1, mentioned: 1, cited: 1, everywhere: 1 } },
  { what: "Placement opportunities, scored for difficulty", cells: { tracked: 1, mentioned: 1, cited: 1, everywhere: 1 } },
  { what: "Who runs the outreach", cells: { tracked: "You", mentioned: "Us", cited: "Us", everywhere: "Us" } },
  { what: "Editorial placements in cited pages, links included", cells: { tracked: 0, mentioned: 1, cited: 1, everywhere: 1 } },
  { what: "Citation reporting on every placement", cells: { tracked: 0, mentioned: 1, cited: 1, everywhere: 1 } },
  { what: "Placements chosen to move the Google position too", cells: { tracked: 0, mentioned: 0, cited: 1, everywhere: 1 } },
  { what: "Link insertions and schema work", cells: { tracked: 0, mentioned: 0, cited: 1, everywhere: 1 } },
  { what: "Rank tracking on the money keywords", cells: { tracked: 0, mentioned: 0, cited: 1, everywhere: 1 } },
  // Pricing spec 27 Sep, section 8: the top tier is brand PR, sold to brands
  // direct rather than white-labelled (open decision 5's default).
  { what: "Brand PR for earned media", cells: { tracked: 0, mentioned: 0, cited: 0, everywhere: 1 } },
  { what: "Your dashboards and your branding", cells: { tracked: 1, mentioned: 1, cited: 1, everywhere: 0 } },
];

const PRICE: React.CSSProperties = { fontSize: "24px", fontWeight: 700, letterSpacing: "-0.03em", marginTop: "8px", color: T.ink, lineHeight: 1.2 };
const PER: React.CSSProperties = { fontSize: "13px", color: T.soft, fontWeight: 600, letterSpacing: 0 };
const PILL: React.CSSProperties = {
  alignSelf: "flex-start",
  display: "inline-flex",
  alignItems: "center",
  boxSizing: "border-box",
  height: "22px",
  marginBottom: "8px",
  padding: "0 9px",
  borderRadius: "999px",
  background: T.wash,
  color: T.accent,
  fontSize: "11.5px",
  fontWeight: 600,
  lineHeight: 1.5,
};

/** The basis or positioning line, directly under the price in every column. */
function Basis({ text }: { text: string }) {
  return <div style={{ fontSize: "12px", lineHeight: 1.45, color: T.soft, marginTop: "4px", minHeight: "35px" }}>{text}</div>;
}

function CellMark({ v }: { v: Cell }) {
  if (v === 1) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Included">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    );
  }
  if (v === 0) {
    return (
      <span role="img" aria-label="Not included" style={{ width: "10px", height: "1.5px", background: T.faint, display: "block", margin: "8px 0" }} />
    );
  }
  return <span>{v}</span>;
}

export default function Packages() {
  return (
    <section id="packages" style={{ marginTop: "72px", scrollMarginTop: "5rem" }}>
      <div
        className="on-dark"
        style={{
          background: `${PACKAGES_WASH}, ${D.ground}`,
          color: T.surface,
          padding: "72px 0 56px",
        }}
      >
        <div style={SHELL}>
          <div className="ways-head">
            <h2 style={{ margin: 0, fontSize: "clamp(26px, 3.4vw, 34px)", fontWeight: 700, letterSpacing: "-0.03em", color: T.surface, flexShrink: 0 }}>
              Packages
            </h2>
            <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.6, color: D.muted, maxWidth: "56ch" }}>
              Monthly, no minimum term. The price is here because you should not have to sit through a
              call to find out.
            </p>
          </div>
          <div style={{ marginTop: "20px" }}>
            <p style={{ margin: 0, fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: T.surface }}>{ALWAYS_ON.packages}</p>
            <p style={{ margin: "4px 0 0", fontSize: "14px", lineHeight: 1.6, color: D.muted, maxWidth: "64ch" }}>{ALWAYS_ON_SUPPORT}</p>
          </div>
          {/* One market toggle for the section, US first (pricing spec
              section 4; Danny, 27 Sep). Drawn only once script runs. */}
          <MarketToggle tone="dark" style={{ marginTop: "20px", color: D.muted }} />

          {/* In the order pricing.ts lists them, which is ascending intensity. */}
          <div className="stair" style={{ marginTop: "40px" }}>
            <svg className="stair-line" viewBox="0 0 1132 250" preserveAspectRatio="none" fill="none" aria-hidden="true">
              <path
                pathLength={1}
                d="M0 232 H250 V172 H530 V112 H810 V52 H1132"
                stroke={T.accent}
                strokeWidth="2"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {TIERS.map((t, i) => (
              <li key={t.id} className="stair-step" style={{ ["--stair-i" as string]: i }}>
                <span style={{ display: "block", fontSize: "clamp(20px, 2.1vw, 26px)", fontWeight: 700, letterSpacing: "-0.025em" }}>
                  <TierName tier={t.key} />
                </span>
                <span style={{ display: "block", fontSize: "14px", color: D.muted, marginTop: "4px" }}>
                  <MarketPrice tier={t.key} fallback={t.priceLabel} />
                </span>
                <TierEngines tier={t.key} size={14} colour={D.muted} style={{ marginTop: "8px" }} />
              </li>
            ))}
            </ol>
          </div>
        </div>
      </div>

      <div style={{ ...SHELL, paddingTop: "48px" }}>
        {/* Below 860px the table scrolls sideways and read as one tier of
            four (Danny, 26 Sep 2026, R28). The label says so; the right-edge
            fade in globals.css says so again and clears at the end. */}
        <p className="pkg-cue" style={{ margin: "0 0 10px", fontSize: "12.5px", fontWeight: 600, color: T.soft }}>
          Swipe for all four tiers <span aria-hidden="true">→</span>
        </p>
        <div className="pkg-scroll" style={{ ...CARD, overflow: "hidden" }}>
          <table className="pkg-table">
            <caption className="sr-only">What each tier adds</caption>
            <colgroup>
              <col className="pkg-col-what" />
              {TIERS.map((t) => (
                <col key={t.id} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {/* The table's visible heading, top-aligned with the tier names (R57). */}
                <td style={{ padding: "20px 24px", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25, color: T.ink, verticalAlign: "top" }}>What each tier adds</td>
                {TIERS.map((t) => (
                  // height: 1px lets the inner column fill the row, so the engine
                  // marks and the CTA share one bottom line in all four (R56).
                  <th key={t.id} scope="col" style={{ height: "1px", padding: "20px 18px", borderLeft: `1px solid ${T.line}`, textAlign: "left", fontWeight: 400, verticalAlign: "top" }}>
                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    {/* Every column keeps the pill's row, so the names stay on one line (R56, R58). */}
                    {t.emphasis ? (
                      <span style={PILL}>Recommended</span>
                    ) : (
                      <span aria-hidden="true" style={{ height: PILL.height, marginBottom: PILL.marginBottom }} />
                    )}
                    <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.02em", color: T.ink }}>
                      <TierName tier={t.key} />
                    </div>
                    {t.key === "mentioned" || t.key === "cited" ? (
                      <SectorPrice tier={t.key} fallback={t.priceLabel} compact per={PER} priceStyle={PRICE} basis={<Basis text={t.priceBasis ?? t.positioning} />} />
                    ) : (
                      <>
                        <div style={PRICE}>
                          <MarketPrice tier={t.key} fallback={t.priceLabel} per={PER} />
                        </div>
                        <Basis text={t.priceBasis ?? t.positioning} />
                      </>
                    )}
                    <TierEngines tier={t.key} size={14} colour={T.soft} style={{ marginTop: "auto", paddingTop: "10px", minHeight: "18px" }} />
                    <a
                      href={CTA[t.key].href ?? t.href}
                      className="pkg-btn"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: "12px",
                        fontSize: "13.5px",
                        fontWeight: 600,
                        borderRadius: "9px",
                        textDecoration: "none",
                        minHeight: "40px",
                        boxSizing: "border-box",
                        // Flat accent, the header's "Free scan" exactly - not
                        // .btn-primary's gradient, and no black (R59).
                        ...(t.emphasis
                          ? { background: T.accent, color: "#ffffff" }
                          : { background: T.surface, color: T.ink, border: `1px solid ${T.line}` }),
                      }}
                    >
                      {CTA[t.key].label}
                    </a>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.what}>
                  <th scope="row" style={{ padding: "13px 24px", fontSize: "14px", fontWeight: 400, textAlign: "left", color: T.ink, borderTop: `1px solid ${T.hair}` }}>
                    {r.what}
                  </th>
                  {TIERS.map((t) => (
                    <td
                      key={t.id}
                      style={{
                        padding: "13px 18px",
                        borderLeft: `1px solid ${T.hair}`,
                        borderTop: `1px solid ${T.hair}`,
                        fontSize: "13px",
                        fontWeight: 600,
                        color: T.soft,
                      }}
                    >
                      <span style={{ display: "flex", justifyContent: "center" }}>
                        <CellMark v={r.cells[t.key]} />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* id="white-label" marks the end of the priced grid for price-surfaces.test.mts. */}
        <div id="white-label" className="pkg-foot" style={{ marginTop: "18px", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
          <span>
            <TierName tier="tracked" /> to <TierName tier="cited" /> are white-label;{" "}
            <TierName tier="everywhere" /> is sold to brands direct.{" "}
            <a href="/white-label" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
              How the line sits
            </a>
          </span>
          <span>
            <TierName tier="cited" /> is built and run by the senior team at{" "}
            <a href="https://nomadadigital.co.uk" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
              Nomada Digital
            </a>
            .
          </span>
        </div>
      </div>
    </section>
  );
}
