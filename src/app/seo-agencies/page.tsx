import type { Metadata } from "next";

import { TIERS } from "@/config/pricing";
import { CARD, GRID12, H2, MICRO, SHELL, T } from "@/config/tokens";

export const metadata: Metadata = {
  title: "For SEO agencies | alwayscited",
  description:
    "Sell AI visibility without building a second supply chain. The work is placement on third-party pages - the work you already do, aimed at a different target list - run white-label under your name.",
  alternates: { canonical: "https://alwayscited.com/seo-agencies" },
};

/**
 * SEOAgencies.dc.html.
 *
 * The argument the whole page rests on is "one placement, two jobs": the same
 * article Google reads as a link is the article the engines read as a source.
 * That is why it is not a second service for an agency to staff.
 *
 * The entry price comes from src/config/pricing.ts, as everywhere else, so a
 * price change moves every page at once.
 *
 * The scan box is a GET to /scan rather than a second LiveScanChecker, for
 * the same reason as the homepage's closing form: that component hardcodes
 * id="scan-email", so a second instance duplicates a DOM id.
 */

const tracked = TIERS.find((t) => t.id === "tracked");

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "How long before anything moves?",
    a: "A placement is live in weeks, not months. Citation usually follows the next time the engine reads the page. Google position moves on its own schedule, and we report the two separately rather than averaging them into one number.",
  },
  {
    q: "Do I need links, or do mentions count?",
    a: "An unlinked mention can get a brand named in an answer. A link does that and moves the Google position. Every placement we run carries one, which is why the two measures move together.",
  },
  {
    q: "What do I resell this at?",
    a: "Your call. The prices on the packages page are what you pay us, not what your client pays you.",
  },
];

export default function SeoAgenciesPage() {
  return (
    <main style={{ ...SHELL, paddingTop: "44px", paddingBottom: "44px", display: "flex", flexDirection: "column", gap: "32px" }}>
      <div className="board-head" style={{ ...GRID12, alignItems: "start" }}>
        <div style={{ gridColumn: "span 7" }}>
          <div style={MICRO}>For SEO agencies</div>
          <h1 style={{ margin: "10px 0 0", fontSize: "36px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.18, color: T.ink }}>
            Sell AI visibility without building a second supply chain.
          </h1>
          <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.6, color: T.soft, maxWidth: "62ch" }}>
            Your clients are asking about ChatGPT. The honest answer is that the work is placement on third-party
            pages, which is the work you already do - aimed at a different target list. We run it under your name.
          </p>
        </div>

        <div style={{ ...CARD, gridColumn: "span 5", padding: "24px" }}>
          <div style={MICRO}>Free scan</div>
          <p style={{ margin: "8px 0 16px", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Run a client you already rank well for. The gap between position 1 and being named is usually the surprise.
          </p>
          <form action="/scan" method="get">
            <label htmlFor="seo-domain" style={{ ...MICRO, display: "block", marginBottom: "6px" }}>
              Domain
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                id="seo-domain"
                name="domain"
                type="text"
                inputMode="url"
                autoComplete="url"
                placeholder="yourdomain.com"
                style={{
                  flexGrow: 1,
                  minWidth: 0,
                  fontFamily: "inherit",
                  fontSize: "14px",
                  color: T.ink,
                  background: T.surface,
                  border: `1px solid ${T.line}`,
                  borderRadius: "10px",
                  padding: "11px 13px",
                }}
              />
              <button
                type="submit"
                style={{
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#ffffff",
                  background: T.accent,
                  border: 0,
                  borderRadius: "10px",
                  padding: "11px 20px",
                  cursor: "pointer",
                }}
              >
                Check
              </button>
            </div>
          </form>
        </div>
      </div>

      <section>
        <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
          <h2 style={{ ...H2, gridColumn: "span 4" }}>One placement, two jobs</h2>
          <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            This is why the line item is not a new service. The same article Google reads as a link is the article the
            engines read as a source.
          </p>
        </div>

        <div className="two-up">
          <div style={{ ...CARD, padding: "24px" }}>
            <div style={MICRO}>Google reads a link</div>
            <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
              Authority passes to the page the anchor points at, and the article itself ranks for the term. Measured as
              position, daily, with a note on whether an AI Overview sits above it.
            </p>
          </div>
          <div style={{ ...CARD, border: `1px solid ${T.accent}`, padding: "24px" }}>
            <div style={{ ...MICRO, color: T.accent }}>The engines read a source</div>
            <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.ink }}>
              The article becomes one of the pages an answer is assembled from, so the brand gets named. Measured
              across the question set, on every engine.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
          <h2 style={{ ...H2, gridColumn: "span 4" }}>The three questions you are about to ask</h2>
          <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Answered here rather than on a call.
          </p>
        </div>

        <div style={{ ...CARD, overflow: "hidden" }}>
          {QUESTIONS.map((item, i) => (
            <div
              key={item.q}
              className="board-head"
              style={{ ...GRID12, padding: "20px 26px", borderTop: i ? `1px solid ${T.hair}` : undefined }}
            >
              <div style={{ gridColumn: "span 4", fontSize: "14.5px", fontWeight: 600, color: T.ink }}>{item.q}</div>
              <div style={{ gridColumn: "span 8", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      <p style={{ margin: 0, fontSize: "13.5px", color: T.soft, lineHeight: 1.65 }}>
        <a href="/#packages" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
          See all packages
        </a>
        {tracked ? ` - ${tracked.priceLabel} for tracking alone, at 20 questions a week.` : "."}
      </p>
    </main>
  );
}
