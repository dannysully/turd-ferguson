import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";

import TierName from "@/components/TierName";
import { BRAND, ORG_REF, SITE_REF, ld } from "@/config/schema";
import { FREE_ANSWERS, FREE_ENGINE_COUNT, QUESTIONS } from "@/config/scan-shape";
import { CARD, MICRO, SHELL, T } from "@/config/tokens";

/**
 * About, from About.dc.html.
 *
 * The measurement rules are the point of the page. Each one exists because it
 * caught a real error in a real client report, and they are the strongest
 * thing we can say about how this is built - stronger than any claim about
 * the team, which is why they sit above it.
 */

export const metadata: Metadata = {
  title: "About us | AI citation placements for agencies",
  description:
    "An agency built the tool it wanted, then sold it to other agencies. Run by the senior team at Nomada Digital, a B2B search agency in York.",
  alternates: { canonical: "https://alwayscited.com/about" },
  openGraph: {
    images: OG_IMAGE,
    title: "About " + BRAND,
    description:
      "An agency built the tool it wanted, then sold it to other agencies. Run by the senior team at Nomada Digital, York.",
    url: "https://alwayscited.com/about",
  },
};

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About " + BRAND,
  description:
    "An agency built the tool it wanted, then sold it to other agencies. Run by the senior team at Nomada Digital, a B2B search agency in York.",
  url: "https://alwayscited.com/about",
  isPartOf: SITE_REF,
  publisher: ORG_REF,
  about: ORG_REF,
};

const RULES = [
  {
    title: "Unmeasured is excluded, never zero",
    body: "An engine that returns no answer is dropped from the denominator. Scoring it as a miss understates a position; averaging it in flatters one.",
  },
  {
    title: "Store the whole answer",
    body: "Full response text and source lists are kept per question, so any figure can be read back to the words that produced it. A score nobody can audit is not evidence.",
  },
  {
    title: "Scope every claim",
    body:
      'An "AI visibility: 24%" reads as a total. We write 24% of ' +
      FREE_ANSWERS +
      ' answers, across ' +
      QUESTIONS +
      ' questions and ' +
      FREE_ENGINE_COUNT +
      ' engines, read on a date. A percentage without its denominator is not a finding.',
  },
  {
    title: "Say what is measured and what is inferred",
    body: "A reading taken from a chart or a screenshot is labelled as such. Solid lines and plain numbers mean measured. Where two tools disagree we report it rather than smooth it.",
  },
];

const TEAM = [
  "Strategy and accounts",
  "Link building and placements",
  "SEO and content",
  "Tracking and analytics",
];

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(aboutSchema) }} />

      <section style={{ ...SHELL, paddingTop: "44px", display: "flex", flexDirection: "column", gap: "30px" }}>
        <div className="confirm-top">
          <div>
            {/* The beat, from globals.css - leaf content, never the wrapper
                around it, so nothing animates twice. */}
            <div className="ac-row" style={MICRO}>Who runs this</div>
            <h1
              className="ac-row"
              style={{
                margin: "10px 0 0",
                fontSize: "36px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.18,
                color: T.ink,
              }}
            >
              An agency built the tool it wanted, then sold it to other agencies.
            </h1>
            <p className="ac-row" style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.7, color: T.soft, maxWidth: "64ch" }}>
              <TierName tier="cited" /> is run by the senior team at{" "}
              <a
                href="https://nomadadigital.co.uk"
                style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}
              >
                Nomada Digital
              </a>
              , a B2B search agency in York. We built the scan because we needed it for our own clients, and the
              placement side because measuring a gap we could not close was not worth charging for.
            </p>
          </div>

          <div className="ac-row" style={{ ...CARD, padding: "24px", alignSelf: "start" }}>
            <div style={MICRO}>Why agencies only</div>
            <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.7, color: T.soft }}>
              Selling direct would put us in front of the clients our partners already have. That is a short-term
              revenue decision with a long-term cost, so we do not make it. Every engagement runs through an agency,
              under their name.
            </p>
          </div>
        </div>

        <section>
          <div className="board-head confirm-head" style={{ marginBottom: "16px" }}>
            <h2 className="ac-row" style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
              How we measure
            </h2>
            <p className="ac-row" style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
              These rules exist because each one caught a real error in a real client report. They are the part worth
              carrying into anything we build.
            </p>
          </div>
          <div className="two-up">
            {RULES.map((r) => (
              <div key={r.title} className="ac-row" style={{ ...CARD, padding: "22px 24px" }}>
                <div style={{ fontSize: "14.5px", fontWeight: 600 }}>{r.title}</div>
                <p style={{ margin: "8px 0 0", fontSize: "14px", lineHeight: 1.65, color: T.soft }}>{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="board-head confirm-head" style={{ marginBottom: "16px" }}>
            <h2 className="ac-row" style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
              Who you deal with
            </h2>
            <p className="ac-row" style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
              Small team, no account managers between you and the people doing the work.
            </p>
          </div>
          <div style={{ ...CARD, display: "flex", overflow: "hidden", flexWrap: "wrap" }}>
            {TEAM.map((role, i) => (
              <div
                key={role}
                className="ac-row"
                style={{
                  flexGrow: 1,
                  flexBasis: "220px",
                  padding: "20px 24px",
                  borderLeft: i ? "1px solid " + T.line : undefined,
                }}
              >
                <div style={{ fontSize: "14.5px", fontWeight: 600 }}>{role}</div>
                <div style={{ fontSize: "13px", color: T.soft, marginTop: "3px" }}>
                  One person, named once you tell us which names go on a public page.
                </div>
              </div>
            ))}
          </div>
          {/* The board carries [CONFIRM which names go on a public page before
              this ships]. Four invented names would be a worse answer than a
              visible gap, so the roles are real and the names wait. */}
          <p style={{ margin: "12px 0 0", fontSize: "12.5px", color: T.soft }}>
            Roles rather than names until Danny confirms which go on a public page.
          </p>
        </section>
      </section>
    </>
  );
}
