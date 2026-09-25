import TierName, { type TierKey } from "@/components/TierName";
import { TIERS } from "@/config/pricing";
import { splitPriceLabel } from "@/config/price-label";
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
 * (removed 25 Sep); the emphasised tier is marked by its tinted column only.
 *
 * The staircase draws itself on the board's 10s loop under
 * html[data-motion="on"]; with no script or reduced motion it is drawn, with
 * every step in place.
 */

function priceNode(label: string, per: React.CSSProperties): React.ReactNode {
  const { prefix, figure, suffix } = splitPriceLabel(label);
  return (
    <>
      {prefix ? <span style={per}>{prefix} </span> : null}
      {figure}
      {suffix ? <span style={per}>{suffix}</span> : null}
    </>
  );
}

/** The board's button labels. The everywhere tier's goes to a call, not a page. */
const CTA: Record<TierKey, { label: string; href?: string }> = {
  tracked: { label: "Start tracking" },
  mentioned: { label: "Get placed" },
  cited: { label: "Go for position #1" },
  everywhere: { label: "Talk to us", href: "/contact" },
};

/** 1 = included, 0 = not, a string = the cell's text. One entry per tier, in TIERS order. */
type Cell = 0 | 1 | string;
const ROWS: { what: string; cells: Record<TierKey, Cell> }[] = [
  { what: "Buyer questions across the AI engines, every week", cells: { tracked: 1, mentioned: 1, cited: 1, everywhere: 1 } },
  { what: "Every source behind every answer", cells: { tracked: 1, mentioned: 1, cited: 1, everywhere: 1 } },
  { what: "Placement opportunities, scored for difficulty", cells: { tracked: 1, mentioned: 1, cited: 1, everywhere: 1 } },
  { what: "Who runs the outreach", cells: { tracked: "You", mentioned: "Us", cited: "Us", everywhere: "Us" } },
  { what: "Editorial placements in cited pages, links included", cells: { tracked: 0, mentioned: 1, cited: 1, everywhere: 1 } },
  { what: "Citation reporting on every placement", cells: { tracked: 0, mentioned: 1, cited: 1, everywhere: 1 } },
  { what: "Placements chosen to move the Google position too", cells: { tracked: 0, mentioned: 0, cited: 1, everywhere: 1 } },
  { what: "Link insertions and schema work", cells: { tracked: 0, mentioned: 0, cited: 1, everywhere: 1 } },
  { what: "Rank tracking on the money keywords", cells: { tracked: 0, mentioned: 0, cited: 1, everywhere: 1 } },
  { what: "Many clients, priced on volume not seats", cells: { tracked: 0, mentioned: 0, cited: 0, everywhere: 1 } },
  { what: "Your dashboards and your branding", cells: { tracked: 1, mentioned: 1, cited: 1, everywhere: 1 } },
];

const HI = T.wash;
const colBg = (emphasis?: boolean) => (emphasis ? HI : "transparent");

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
              Monthly, white-labelled, no minimum term. The price is here because you should not have to sit through a
              call to find out.
            </p>
          </div>

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
                <span style={{ display: "block", fontSize: "14px", color: D.muted, marginTop: "4px" }}>{t.priceLabel}</span>
              </li>
            ))}
            </ol>
          </div>
        </div>
      </div>

      <div style={{ ...SHELL, paddingTop: "48px" }}>
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
                <td style={{ padding: "20px 24px", fontSize: "13px", color: T.soft, verticalAlign: "bottom" }}>What each tier adds</td>
                {TIERS.map((t) => (
                  <th key={t.id} scope="col" style={{ padding: "20px 18px", borderLeft: `1px solid ${T.line}`, background: colBg(t.emphasis), textAlign: "left", fontWeight: 400, verticalAlign: "top" }}>
                    <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.02em", color: T.ink }}>
                      <TierName tier={t.key} />
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.03em", marginTop: "8px", color: T.ink, lineHeight: 1.2 }}>
                      {priceNode(t.priceLabel, { fontSize: "13px", color: T.soft, fontWeight: 600, letterSpacing: 0 })}
                    </div>
                    <div style={{ fontSize: "12px", lineHeight: 1.45, color: T.soft, marginTop: "4px", minHeight: "32px" }}>
                      {t.priceBasis ?? t.positioning}
                    </div>
                    <a
                      href={CTA[t.key].href ?? t.href}
                      className={t.emphasis ? "pkg-btn pkg-btn--dark" : "pkg-btn"}
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
                        ...(t.emphasis
                          ? { background: T.ink, color: T.surface }
                          : { background: T.surface, color: T.ink, border: `1px solid ${T.line}` }),
                      }}
                    >
                      {CTA[t.key].label}
                    </a>
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
                        background: colBg(t.emphasis),
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
            Every tier is white-label.{" "}
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
