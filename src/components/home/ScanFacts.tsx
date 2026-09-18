import { FREE_ENGINES, GATED_ENGINES } from "@/lib/scan/engines";
import { CARD, MICRO, SHELL, T } from "@/config/tokens";

/**
 * "What the scan tells you" - the phone board's compact substitute for the
 * AnswerExplorer panel, which is a two-column layout that a phone cannot do
 * much with. Rendered only below the panel's breakpoint.
 *
 * The engine counts are read from the engine config rather than typed in.
 * Mobile.dc.html says "3 free, 5 on unlock", which was true when the board
 * was drawn and is not true now: 3586cbf moved Perplexity into the free pass
 * and Claude out, so the shipped default is four free and none gated. A
 * number on the site about what the product does has to match what the
 * product does, so it is derived and cannot go stale again.
 */

/** Kept in step with QUESTION_COUNT in lib/scan/anthropic.ts, which is server-only. */
const QUESTIONS = 14;

const facts: { label: string; value: string; note?: string }[] = [
  { label: "Buying questions generated", value: `${QUESTIONS}` },
  {
    label: "Engines the questions run on",
    value: `${FREE_ENGINES.length}`,
    // Only says "free" when there is actually something behind the gate.
    note: GATED_ENGINES.length
      ? `free, ${FREE_ENGINES.length + GATED_ENGINES.length} on unlock`
      : undefined,
  },
  { label: "Sources behind the answers", value: "Every one" },
];

export default function ScanFacts() {
  return (
    <section className="phone-only" style={{ ...SHELL, marginTop: "22px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
        What the scan tells you
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
        Not a score. The questions, who gets named, and the exact pages the answers came from.
      </p>

      <div style={{ ...CARD, borderRadius: "14px", overflow: "hidden" }}>
        {facts.map((f, i) => (
          <div key={f.label} style={{ padding: "16px 18px", borderTop: i ? `1px solid ${T.line}` : undefined }}>
            <div style={{ fontSize: "13px", color: T.soft }}>{f.label}</div>
            <div style={{ fontSize: "27px", fontWeight: 700, lineHeight: 1.15, marginTop: "2px", letterSpacing: "-0.035em", color: T.ink }}>
              {f.value}
              {f.note ? <span style={{ ...MICRO, fontSize: "13px", letterSpacing: 0, marginLeft: "6px" }}>{f.note}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
