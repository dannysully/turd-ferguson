import EngineLogo from "@/components/EngineLogo";
import TierName from "@/components/TierName";
import { TRACKED_KEYWORDS, TRACKED_QUESTIONS } from "@/config/pricing";
import { FREE_ENGINE_COUNT } from "@/config/scan-shape";
import { CARD, MICRO, T } from "@/config/tokens";
import { FREE_ENGINES } from "@/lib/scan/engines";

import { LIFT_SOFT } from "./home/dark";

/**
 * The weekly-report beat on /alwaystracked only, from TrackedBeat.dc.html
 * (Danny, 26 Sep 2026, R25): a lens walks the report row by row and stops on
 * the one question that moved this week. The board's engine tiles are the
 * engines' own marks here, dimmed where the engine did not name the brand.
 *
 * The markup is the settled state - lens on the row that moved, its after
 * line showing - so without JS, or with reduced motion, that is what reads.
 * globals.css (.tb-*) runs the walk only under html[data-motion="on"].
 *
 * Every brand, question and figure is made up, and labelled so, as the
 * board labels them.
 */

type Row = { q: string; named: number; rank: string };
const ROWS: Row[] = [
  { q: "best invoicing software for freelancers", named: 2, rank: "#3" },
  { q: "invoicing app with late payment reminders", named: 3, rank: "#2" },
  { q: "cheapest invoicing tool for sole traders", named: 0, rank: "#11" },
  { q: "recurring invoices for contractors", named: 1, rank: "#6" },
  { q: "invoicing software that syncs with bank feeds", named: 0, rank: "#9" },
  { q: "best invoicing app for designers", named: 0, rank: "#14" },
];
/** The row that moved, and what it moved to. */
const MOVED = 4;
const AFTER = { named: 2, rank: "#7" };

function Marks({ named }: { named: number }) {
  return (
    <>
      {FREE_ENGINES.map((e, i) => (
        <span key={e} className={i < named ? undefined : "tb-off"} style={{ display: "flex" }}>
          <EngineLogo engine={e} size={16} />
        </span>
      ))}
    </>
  );
}

const COLS = "tb-cols";

export default function TrackedBeat() {
  return (
    <div className="tb-grid ac-row">
      <div className="tb-report" style={{ ...CARD, boxShadow: LIFT_SOFT, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", padding: "18px 24px", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: T.ink, flex: "none" }}>Weekly report</div>
          <div className="tb-meta" style={{ fontSize: "13px", color: T.soft }}>
            tallyroo.com · {TRACKED_QUESTIONS} questions · week 14
          </div>
          <div style={{ flexGrow: 1 }} />
          <div style={{ fontSize: "12px", fontWeight: 600, color: T.soft }}>Illustrative</div>
        </div>
        <div className={COLS} style={{ padding: "10px 24px", fontSize: "12px", fontWeight: 600, color: T.soft, borderBottom: `1px solid ${T.hair}` }}>
          <span>Question</span>
          <span>Engines naming you</span>
          <span>Google</span>
        </div>

        <div style={{ position: "relative", padding: "0 12px 12px" }}>
          <div
            className="tb-lens"
            aria-hidden="true"
            style={{ position: "absolute", left: "12px", right: "12px", top: 0, height: "54px", borderRadius: "12px", background: T.wash, boxShadow: `inset 0 0 0 1.5px ${T.accent}` }}
          />
          {ROWS.map((r, i) => (
            <div
              key={r.q}
              className={`${COLS} tb-row tb-r${i + 1}${i === MOVED ? " tb-was" : ""}`}
              style={{ position: "relative", alignItems: "center", height: "54px", padding: "0 12px" }}
            >
              <span style={{ fontSize: "14px", fontWeight: 500, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.q}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Marks named={r.named} />
                <span style={{ marginLeft: "6px", fontSize: "13px", color: T.soft, whiteSpace: "nowrap" }}>
                  {r.named} of {FREE_ENGINE_COUNT}
                </span>
              </span>
              <span style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>{r.rank}</span>
            </div>
          ))}

          {/* The row that moved: its after-state, laid over it. */}
          <div
            className={`${COLS} tb-now`}
            // Inset inside the lens ring, so the settled frame shows the ring whole.
            style={{ position: "absolute", left: "24px", right: "24px", top: `${MOVED * 54 + 2}px`, height: "50px", alignItems: "center", background: T.surface, pointerEvents: "none" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {ROWS[MOVED].q}
              </span>
              <span className="tb-pill" style={{ flexShrink: 0, fontSize: "11.5px", fontWeight: 700, color: T.accentHover, background: T.wash, borderRadius: "999px", padding: "2px 9px" }}>
                Named this week
              </span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Marks named={AFTER.named} />
              <span style={{ marginLeft: "6px", fontSize: "13px", fontWeight: 600, color: T.accentHover, whiteSpace: "nowrap" }}>
                {AFTER.named} of {FREE_ENGINE_COUNT}
              </span>
            </span>
            <span style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink, whiteSpace: "nowrap" }}>
              {AFTER.rank}{" "}
              <span className="tb-was-rank" style={{ fontSize: "12px", fontWeight: 600, color: T.accentHover }}>was {ROWS[MOVED].rank}</span>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 24px", borderTop: `1px solid ${T.hair}`, fontSize: "12.5px", color: T.soft }}>
          <span>Cited this week for that question:</span>
          <span style={{ fontWeight: 600, color: T.accentHover, background: T.wash, borderRadius: "999px", padding: "2px 10px" }}>solodesk.io</span>
        </div>
      </div>

      <div className="tb-argument" style={{ paddingTop: "8px" }}>
        <div style={MICRO}>
          What <TierName tier="tracked" /> sends you
        </div>
        <h2 style={{ margin: "10px 0 0", fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15, color: T.ink }}>
          {TRACKED_QUESTIONS} questions and {TRACKED_KEYWORDS} keywords, every day. One line tells you what moved.
        </h2>
        <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.6, color: T.soft }}>
          The same questions, re-asked every day, reported question by question: which engines named the brand, the
          Google position beside it, and the pages the engines cited.
        </p>
        <div style={{ marginTop: "22px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            <>A citation and a ranking, side by side, never averaged</>,
            <>Every answer kept, with the sources behind it</>,
            <>
              {/* Not a link: no tier name sits inside one on this site (the lockup census). */}
              Reporting only. Winning the placements is <TierName tier="mentioned" />
            </>,
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", fontSize: "14px", lineHeight: 1.5, color: T.ink }}>
              <span style={{ flexShrink: 0, width: "6px", height: "6px", borderRadius: "999px", background: T.accent, marginTop: "8px" }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="tb-note" style={{ fontSize: "12px", color: T.soft }}>
        Illustrative. Tallyroo and every brand and figure shown are made up.
      </div>
    </div>
  );
}
