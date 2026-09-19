import { CARD, GRID12, H2, MICRO, SHELL, T } from "@/config/tokens";

/**
 * The evidence. No board covers this - the five homepage boards scope the
 * product and leave evidence to CaseStudies.dc.html - so it is restyled to
 * the tokens rather than removed. Taking the only proof off a sales page
 * because the design files did not happen to include it would be a
 * commercial change dressed up as a design one.
 *
 * The Vibe Retail figures now carry their windows. The #1 reading has a
 * dated source at last: Danny attested it on 19 Sep 2026 as the account
 * owner, which is what the figure was missing. It is shown as a four-month
 * reading beside the eight-week one rather than replacing it - the campaign
 * produced #4 in eight weeks and the keyword carried on climbing, and
 * collapsing the two would claim #1 in eight weeks, which is not what
 * happened.
 *
 * Two things did go: the "listicle went live in the morning" paragraph
 * appeared twice on this page, word for word, and the Nomada provenance line
 * is now at the end of the packages board.
 */

/**
 * Each figure carries its own window, because they are readings from
 * different dates and collapsing them would imply the #1 arrived in eight
 * weeks. The eight-week numbers are what the campaign produced; the #1 is a
 * later reading, attested by Danny as the account owner on 19 Sep 2026.
 */
const FACTS = [
  { label: "Money keyword, at eight weeks", val: "#83 to #4" },
  { label: "Money keyword, at four months", val: "#83 to #1" },
  // One denominator, and it is ChatGPT. This figure was published here as
  // 25% against the full question set and on the case study as 14% against
  // both that and ChatGPT alone - three readings of one number. Danny
  // settled it as the account owner on 19 Sep 2026: ChatGPT brand
  // visibility, 25%. No window, because no window is sourced for it.
  { label: "ChatGPT brand visibility", val: "0% to 25%" },
  { label: "AI Overview citations on commercial questions", val: "3" },
];

export default function Results() {
  return (
    <section id="proof" style={{ ...SHELL, marginTop: "44px" }}>
      <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
        <div style={{ gridColumn: "span 4" }}>
          <div style={MICRO}>Results</div>
          <h2 style={{ ...H2, marginTop: "8px" }}>One placement, one morning.</h2>
        </div>
        <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
          One campaign, one placement. The eight-week readings are what it produced; the money keyword kept
          climbing after that.
        </p>
      </div>

      <div style={{ ...CARD, padding: "24px 26px" }}>
        <p style={{ ...MICRO, color: T.accent, margin: 0 }}>Vibe Retail · US retail SaaS</p>

        <div style={{ marginTop: "14px" }}>
          {FACTS.map((f) => (
            <div
              key={f.label}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "24px",
                alignItems: "baseline",
                padding: "11px 0",
                borderTop: `1px solid ${T.hair}`,
              }}
            >
              <span style={{ fontSize: "14px", color: T.soft }}>{f.label}</span>
              <span style={{ fontSize: "18px", fontWeight: 700, color: T.ink, letterSpacing: "-0.022em", fontVariantNumeric: "tabular-nums" }}>
                {f.val}
              </span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "14px", color: T.ink, lineHeight: 1.65, marginTop: "18px", marginBottom: 0 }}>
          The listicle went live in the morning. By that evening Google&apos;s AI Overview was citing it as the top
          source for the category.
        </p>

        <a
          href="/case-studies/vibe-retail"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: T.accent,
            fontWeight: 600,
            fontSize: "13.5px",
            textDecoration: "none",
            marginTop: "16px",
          }}
        >
          Read the full case study
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      <div className="on-dark" style={{ background: T.ink, borderRadius: "18px", padding: "32px 40px", marginTop: "20px" }}>
        <p style={{ margin: 0, fontSize: "17px", fontWeight: 600, lineHeight: 1.55, letterSpacing: "-0.01em", color: "#ffffff", maxWidth: "680px" }}>
          &ldquo;The goal is not to get a link. The goal is to be inside the source that the buyer, Google, and AI all
          agree to trust.&rdquo;
        </p>
        <p style={{ margin: "12px 0 0", fontSize: "13px", color: T.faint }}>- alwayscited methodology</p>
      </div>
    </section>
  );
}
