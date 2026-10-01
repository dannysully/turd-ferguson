import { NEXT_STEPS, NEXT_STEPS_HEADING } from "@/config/onboarding";
import { CARD, MICRO, T } from "@/config/tokens";

/**
 * The 3-step strip (R166, Danny, danny.md line 175): what happens after a
 * plan is bought, on every tier page, /packages and /checkout, in the welcome
 * email's own words (src/config/onboarding.ts). An ordered list, so a screen
 * reader hears three steps in order; the numbers are the list's, drawn.
 */
export default function NextSteps({ style }: { style?: React.CSSProperties }) {
  return (
    <section aria-labelledby="next-steps-h" className="ac-row" style={{ ...CARD, padding: "20px 24px", ...style }}>
      <h2 id="next-steps-h" style={{ margin: 0, fontSize: "15px", fontWeight: 700, letterSpacing: "-0.02em", color: T.ink }}>
        {NEXT_STEPS_HEADING}
      </h2>
      {/* role="list" because Safari drops list semantics with list-style none. */}
      <ol role="list" style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexWrap: "wrap", gap: "12px 24px" }}>
        {NEXT_STEPS.map((step, i) => (
          <li key={step} style={{ flex: "1 1 220px", display: "flex", gap: "10px", alignItems: "baseline" }}>
            <span aria-hidden="true" style={{ ...MICRO, color: T.accent, minWidth: "14px" }}>
              {i + 1}
            </span>
            <span style={{ fontSize: "14px", lineHeight: 1.6, color: T.soft }}>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
