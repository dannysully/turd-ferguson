import type { Metadata } from "next";

import TierName from "@/components/TierName";
import { TIERS } from "@/config/pricing";
import { CARD, GRID12, MICRO, SHELL, T } from "@/config/tokens";

export const metadata: Metadata = {
  title: "How we compare | alwayscited",
  description:
    "What alwayscited does and what it costs, set out row by row. No competitor columns: we will not publish a claim about another company's product without a dated source for it.",
  alternates: { canonical: "https://alwayscited.com/compare" },
};

/**
 * Compare.dc.html, without the competitor columns.
 *
 * The board has an 8-row table against Peec, Profound and Ahrefs Brand
 * Radar in which all 24 competitor cells are [VERIFY], and its own sidebar
 * promises each row is taken from that company's public pricing "with the
 * date we read it". That reading has not happened, so those columns are not
 * here - a comparison page is the one place where being wrong is about
 * somebody else's business rather than our own layout.
 *
 * The table is built as a column set rather than a fixed three-column grid,
 * so adding a competitor later is adding an entry to COLUMNS and a value per
 * row, with nothing else to restructure.
 *
 * The best argument on the board survives untouched: the card saying when a
 * tracking tool is the better purchase. That needs nobody else's facts.
 */

type Column = { key: string; label: React.ReactNode; emphasis?: boolean };

/** Add a competitor here, and a value under its key in every ROW, once each
 *  cell has been read from their public material and dated. */
const COLUMNS: Column[] = [{ key: "us", label: <TierName tier="cited" />, emphasis: true }];

const entry = TIERS.find((t) => t.id === "tracked")?.priceLabel ?? "";

const ROWS: { feature: string; values: Record<string, string> }[] = [
  { feature: "Tells you which sources decide the category", values: { us: "Yes" } },
  { feature: "Tracks whether the brand gets named", values: { us: "Yes" } },
  { feature: "Stores the verbatim answer behind every reading", values: { us: "Yes" } },
  { feature: "Places your brand into those source pages", values: { us: "Yes" } },
  { feature: "Reports the Google position alongside the citation", values: { us: "Yes" } },
  { feature: "White label for agencies", values: { us: "Yes" } },
  { feature: "Price published without a call", values: { us: "Yes" } },
  { feature: "Entry price", values: { us: entry } },
];

export default function ComparePage() {
  return (
    <main style={{ ...SHELL, paddingTop: "44px", paddingBottom: "44px", display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="board-head" style={{ ...GRID12, alignItems: "start" }}>
        <div style={{ gridColumn: "span 7" }}>
          <div style={MICRO}>Comparison</div>
          <h1 style={{ margin: "10px 0 0", fontSize: "36px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.18, color: T.ink }}>
            AI visibility tools, and what each one leaves you to do yourself.
          </h1>
          <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.6, color: T.soft, maxWidth: "62ch" }}>
            Most of these are good at what they do. The question is not which dashboard is best - it is what happens
            after it tells you the answer.
          </p>
        </div>

        <div style={{ ...CARD, gridColumn: "span 5", padding: "22px" }}>
          <div style={MICRO}>Why there are no other columns here yet</div>
          <p style={{ margin: "8px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
            A row about somebody else&apos;s product is only worth reading if it was taken from their own pricing and
            documentation, with the date it was read. We have not done that work yet, so rather than publish a grid of
            guesses about other companies, this page sets out what we do and what it costs.
          </p>
          <p style={{ margin: "10px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
            When the columns arrive they will carry that date, and if one goes out of date, tell us and we will correct
            it.
          </p>
        </div>
      </div>

      <div style={{ ...CARD, overflow: "hidden" }}>
        <div className="cmp-row" style={{ padding: "11px 26px", background: "#fbfbfc", borderBottom: `1px solid ${T.line}` }}>
          <div style={MICRO}>&nbsp;</div>
          {COLUMNS.map((c) => (
            <div key={c.key} style={{ ...MICRO, color: c.emphasis ? T.ink : T.soft }}>
              {c.label}
            </div>
          ))}
        </div>
        {ROWS.map((r) => (
          <div key={r.feature} className="cmp-row" style={{ padding: "12px 26px", borderBottom: `1px solid ${T.hair}`, alignItems: "baseline" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: T.ink }}>{r.feature}</div>
            {COLUMNS.map((c) => (
              <div key={c.key} style={{ fontSize: "13.5px", color: T.ink, fontWeight: c.emphasis ? 600 : 400 }}>
                {r.values[c.key] ?? "-"}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="two-up">
        <div style={{ ...CARD, padding: "24px" }}>
          <div style={MICRO}>When a tracking tool is the better buy</div>
          <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            If you have your own outreach team and only need measurement, a pure tracking tool is cheaper than us and
            probably better instrumented. We would rather say that here than three weeks into an engagement.
          </p>
        </div>
        <div style={{ ...CARD, border: `1px solid ${T.accent}`, padding: "24px" }}>
          <div style={{ ...MICRO, color: T.accent }}>When we are</div>
          <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.ink }}>
            When you need the gap closed rather than measured, and you do not have editorial relationships with the
            sites the engines read. That is the whole difference, and it is a supply problem rather than a software one.
          </p>
        </div>
      </div>
    </main>
  );
}
