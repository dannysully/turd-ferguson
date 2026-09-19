import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";
import Link from "next/link";

import TierName from "@/components/TierName";
import { TIERS } from "@/config/pricing";
import { CARD, GRID12, H2, MICRO, SHELL, T } from "@/config/tokens";

export const metadata: Metadata = {
  title: "For PR agencies",
  description:
    "You already place the coverage. We tell you which of it the engines actually read, so a placement has a measurable outcome and the report says who got named.",
  openGraph: { url: "https://alwayscited.com/pr-agencies", images: OG_IMAGE },
  alternates: { canonical: "https://alwayscited.com/pr-agencies" },
};

/**
 * PRAgencies.dc.html, including its beat.
 *
 * The board animates the four coverage cards in with staggered .in classes
 * and draws the flow lines. Only the lines are built here. A staggered card
 * reveal starts text at opacity 0, which is the one thing the design review
 * checks for - nothing on the page should be hidden at rest - and the cards
 * argue nothing by arriving in sequence. The lines are the argument: this
 * piece fed an answer, that one went nowhere.
 *
 * The dead piece is distinguishable without any motion at all, by its border
 * and its dashed line, so the page reads identically with animation off.
 *
 * The board's coverage-checker card is here now that /coverage-check
 * exists. That page says plainly the benchmark is not running yet.
 */

const priceOf = (id: string) => TIERS.find((t) => t.id === id)?.priceLabel ?? "";

const PIECES: { outlet: string; title: string; live: boolean }[] = [
  { outlet: "[Trade title]", title: "[Brand] launches [product]", live: true },
  { outlet: "[National]", title: "The startups changing [category]", live: true },
  { outlet: "[Regional press]", title: "[City] firm announces 40 roles", live: false },
  { outlet: "[Vertical blog]", title: "Why [Brand] rebuilt onboarding", live: true },
];

const ANSWERS: { k: string; q: string }[] = [
  { k: "Brand question", q: "what does [Brand] do" },
  { k: "Category question", q: "best [category] providers" },
  { k: "Objection question", q: "is [Brand] easy to set up" },
];

const CHANGES: { label: string; body: string }[] = [
  {
    label: "Target list",
    body: "The scan names the exact pages the engines assemble answers from in your client's category. Some will be titles you already have relationships with. Those move first.",
  },
  {
    label: "Reporting",
    body: '"Named in 22 of 56 AI answers, from nothing before the campaign" is a sentence a marketing director can take to their board. Reach and AVE are not.',
  },
  {
    label: "Retention",
    body: "A measure that moves gives the retainer a reason to continue. Placements decay as articles age, so replacement is maintenance, not repetition.",
  },
];

export default function PrAgenciesPage() {
  return (
    <main style={{ ...SHELL, paddingTop: "44px", paddingBottom: "44px", display: "flex", flexDirection: "column", gap: "32px" }}>
      <div className="board-head" style={{ ...GRID12, alignItems: "start" }}>
        <div style={{ gridColumn: "span 7" }}>
          <div style={MICRO}>For PR agencies</div>
          <h1 style={{ margin: "10px 0 0", fontSize: "36px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.18, color: T.ink }}>
            You already place the coverage. We tell you which of it the engines actually read.
          </h1>
          <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.6, color: T.soft, maxWidth: "62ch" }}>
            Coverage proves reach. It rarely proves revenue. AI answers give a PR placement a measurable outcome for
            the first time - either the engines cite it and name your client, or they do not.
          </p>
        </div>

        <div style={{ ...CARD, gridColumn: "span 5", padding: "24px" }}>
          <div style={MICRO}>Free scan</div>
          <p style={{ margin: "8px 0 16px", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Run it on a client you already have coverage for. See whether any of it came back.
          </p>
          <form action="/scan" method="get">
            <label htmlFor="pr-domain" style={{ ...MICRO, display: "block", marginBottom: "6px" }}>
              Domain
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                id="pr-domain"
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

          {/* The board's coverage-checker card. It has a destination now. */}
          <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${T.hair}` }}>
            <div style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>Already have a campaign to check?</div>
            <p style={{ margin: "5px 0 10px", fontSize: "13px", lineHeight: 1.55, color: T.soft }}>
              See which pieces the engines are actually reading, and what the answers said before you started.
            </p>
            <Link
              href="/coverage-check"
              style={{
                display: "inline-block",
                background: T.surface,
                border: `1px solid ${T.line}`,
                color: T.ink,
                fontSize: "13.5px",
                fontWeight: 600,
                padding: "9px 16px",
                borderRadius: "10px",
                textDecoration: "none",
              }}
            >
              Open the coverage checker
            </Link>
          </div>
        </div>
      </div>

      <section>
        <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
          <h2 style={{ ...H2, gridColumn: "span 4" }}>What a campaign looks like to an engine</h2>
          <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Coverage is not one thing. Some of it becomes the source behind an answer a buyer reads. Some of it is
            published, indexed, and never drawn on. Until now there was no way to tell which was which.
          </p>
        </div>

        <div style={{ ...CARD, padding: "26px 30px" }}>
          <div className="coverage-flow">
            <div>
              <div style={{ ...MICRO, marginBottom: "10px" }}>Your campaign coverage</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {PIECES.map((c) => (
                  <div
                    key={c.title}
                    style={{
                      background: c.live ? T.surface : "#fbfbfc",
                      border: `1px solid ${c.live ? T.accent : T.line}`,
                      borderRadius: "12px",
                      padding: "9px 13px",
                      minHeight: "52px",
                      boxSizing: "border-box",
                      opacity: c.live ? 1 : 0.7,
                    }}
                  >
                    <div style={{ fontSize: "12px", color: T.faint }}>{c.outlet}</div>
                    <div style={{ fontSize: "13px", color: T.ink, marginTop: "2px", lineHeight: 1.35 }}>{c.title}</div>
                  </div>
                ))}
              </div>
            </div>

            <svg viewBox="0 0 120 236" width="120" height="236" fill="none" aria-hidden="true" className="coverage-flow__svg" style={{ display: "block", marginTop: "26px" }}>
              <path className="flow-line" pathLength={1} d="M2 26 C 60 26, 60 34, 118 34" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
              <path className="flow-line flow-line--2" pathLength={1} d="M2 86 C 60 86, 60 118, 118 118" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
              {/* The regional piece stops. Dashed and grey at rest, so the
                  point survives with animation off. */}
              <path d="M2 146 H 46" stroke="#d6d8dd" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" />
              <circle cx="54" cy="146" r="2.5" fill="#d6d8dd" />
              <path className="flow-line flow-line--3" pathLength={1} d="M2 206 C 60 206, 60 202, 118 202" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
            </svg>

            <div>
              <div style={{ ...MICRO, marginBottom: "10px" }}>Answers it is now the source for</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {ANSWERS.map((a) => (
                  <div
                    key={a.q}
                    style={{
                      background: T.wash,
                      border: `1px solid ${T.accent}`,
                      borderRadius: "12px",
                      padding: "12px 15px",
                      minHeight: "68px",
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: T.accent, fontWeight: 600 }}>{a.k}</div>
                    <div style={{ fontSize: "13px", color: T.ink, marginTop: "3px", lineHeight: 1.4 }}>{a.q}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p style={{ margin: "20px 0 0", paddingTop: "16px", borderTop: `1px solid ${T.hair}`, fontSize: "13.5px", lineHeight: 1.65, color: T.soft }}>
            The regional piece is not a failure - it did a job reach can measure. But it is not evidence an engine will
            reach for, and a report that treats the four as equal is a report that cannot tell you what to do next.
          </p>
        </div>
      </section>

      <section>
        <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
          <h2 style={{ ...H2, gridColumn: "span 4" }}>What changes for a PR team</h2>
          <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Nothing about how you work. What changes is which titles you go after, and what you can put in the report.
          </p>
        </div>

        <div className="three-up">
          {CHANGES.map((c) => (
            <div key={c.label} style={{ ...CARD, padding: "24px" }}>
              <div style={MICRO}>{c.label}</div>
              <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
          <h2 style={{ ...H2, gridColumn: "span 4" }}>Where we fit</h2>
          <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Two ways PR agencies use this, depending on whether you want the outreach or just the measure.
          </p>
        </div>

        <div className="wl-terms" style={{ ...CARD, overflow: "hidden" }}>
          <div className="wl-term" style={{ padding: "24px 26px" }}>
            <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>Measurement only</div>
            <div style={{ fontSize: "13px", color: T.soft, marginTop: "4px" }}>
              <TierName tier="tracked" />, {priceOf("tracked")}
            </div>
            <p style={{ margin: "12px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
              We run and track the questions, and hand you the source list - which pages decide the answers and what
              kind of publication each one is. Your team does the outreach against it. The reporting carries your
              branding.
            </p>
          </div>
          <div className="wl-term" style={{ padding: "24px 26px", borderLeft: `1px solid ${T.line}` }}>
            <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
              Measurement and placement
            </div>
            <div style={{ fontSize: "13px", color: T.soft, marginTop: "4px" }}>
              <TierName tier="mentioned" /> {priceOf("mentioned")}
            </div>
            <p style={{ margin: "12px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
              We place into the source pages your team does not cover - listicles, comparison pages, category round-ups
              - and leave the editorial relationships to you.
            </p>
          </div>
        </div>
      </section>

      <p style={{ margin: 0, fontSize: "13.5px", color: T.soft, lineHeight: 1.65 }}>
        White-labelled throughout.{" "}
        <Link href="/#packages" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
          See all packages
        </Link>
      </p>
    </main>
  );
}
