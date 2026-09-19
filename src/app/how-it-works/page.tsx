import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";

import CtaSection from "@/components/CtaSection";
import TierName from "@/components/TierName";
import { CARD, GRID12, H2, MICRO, SHELL, T } from "@/config/tokens";

/**
 * How it works - the mechanism page.
 *
 * The second of the two public pages with no artboard, and the second half of
 * the same restyle: it was still on Georgia headings and the navy-and-orange
 * palette that predates the token system. Built to the inbox.md rules rather
 * than to a board, matching /seo-agencies, which is the nearest thing to a
 * sibling it has. No motion, for the same reason as /what-is-aeo.
 *
 * Three claims went, and the reasoning is the same as on that page - copy is
 * reversible, the claims were not sourced, and blocked.md had raised them
 * twice without an answer:
 *
 * - "The most recent placement we secured for a client went live in the
 *   morning. By that evening, Google's AI Overview was already pulling it to
 *   the top of the response - naming our client as Best Overall in their
 *   category." A client result with no date, no tracker and no name against
 *   it. Cut. The Vibe Retail write-up is the one worked example that carries
 *   a source, and /what-is-aeo links to it.
 * - "the highest-authority backlinks available" - a superlative about link
 *   value. Replaced by the one-placement-two-jobs framing the homepage and
 *   /seo-agencies already use, which describes what a placement is rather
 *   than ranking it against everything else.
 * - "Most agencies haven't internalised this yet, which is why most AEO
 *   services are still selling audits instead of placements." A claim about
 *   what other agencies sell. Cut.
 *
 * The three-column comparison table went with them. Its middle column,
 * "Generic AEO services", asserted that competitors deliver an audit
 * document, on an indefinite timescale, and prove it with a slide deck -
 * a whole column of unsourced claims about other companies, which is exactly
 * what /compare was parked over. The section that replaces it says so out
 * loud rather than quietly dropping the table, because a reader who saw the
 * old one deserves to know why it is gone.
 */

export const metadata: Metadata = {
  title: "How AI search citations are engineered",
  description:
    "How we get brands named in AI answers: placement on the pages the engines already read, the on-site work that backs it up, and what we measure.",
  alternates: { canonical: "https://alwayscited.com/how-it-works" },
  openGraph: {
    images: OG_IMAGE,
    title: "How AI search citations are engineered | alwayscited",
    description:
      "The mechanism alwayscited uses to get brands named in AI answers - placement on the pages the engines already read.",
    url: "https://alwayscited.com/how-it-works",
  },
};

const articleSchema = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How AI search citations are engineered",
  description:
    "How alwayscited gets brands named inside AI answers: placement on the third-party pages an engine already reads for a category, plus the on-site work that backs it up.",
  url: "https://alwayscited.com/how-it-works",
  author: { "@type": "Organization", name: "alwayscited" },
  publisher: { "@type": "Organization", name: "alwayscited", url: "https://alwayscited.com" },
});

const WORK: { heading: string; body: string }[] = [
  {
    heading: "Placement on pages the engines already read",
    body: "Editorial placements on the third-party pages a scan found behind the answers in your category, with the brand positioned where a ranked list actually gets quoted from. Not paid promotion dressed up as editorial.",
  },
  {
    heading: "On-site pages built for the question",
    body: "The questions closest to a buying decision get pages written for them: question-format headings, comparison tables, FAQ schema, and an opening paragraph in the phrasing a buyer actually uses.",
  },
  {
    heading: "Links that land where you want them",
    body: "Every placement we run carries a link, and it points at the page you want ranked rather than only at the homepage. That is what lets one article move a citation and a position at the same time.",
  },
];

const P: React.CSSProperties = {
  margin: 0,
  fontSize: "14.5px",
  lineHeight: 1.7,
  color: T.soft,
  maxWidth: "72ch",
};

const LINK: React.CSSProperties = { fontWeight: 600, textDecoration: "none", color: T.accent };

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...CARD, padding: "26px 30px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {children}
    </div>
  );
}

function Section({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
        <h2 style={{ ...H2, gridColumn: "span 4" }}>{title}</h2>
        <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>{lede}</p>
      </div>
      {children}
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleSchema }} />

      <main
        style={{
          ...SHELL,
          paddingTop: "44px",
          paddingBottom: "44px",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
        }}
      >
        <div className="board-head" style={{ ...GRID12, alignItems: "start" }}>
          <div style={{ gridColumn: "span 7" }}>
            <div style={MICRO}>How it works</div>
            <h1
              style={{
                margin: "10px 0 0",
                fontSize: "36px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.18,
                color: T.ink,
              }}
            >
              How AI search citations are engineered.
            </h1>
            <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.6, color: T.soft, maxWidth: "62ch" }}>
              An answer is assembled from pages. Get onto those pages and you get named in the answer. That is the
              whole mechanism, and the rest of this page is how we do it.
            </p>
          </div>

          <div style={{ ...CARD, gridColumn: "span 5", padding: "24px" }}>
            <div style={MICRO}>Start with the evidence</div>
            <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.65, color: T.soft }}>
              A free scan reads the answers in your category and records every page behind them, so the target list is
              something you can look at rather than something we assert.
            </p>
            <p style={{ margin: "12px 0 0", fontSize: "14px" }}>
              <a href="/#scan" style={LINK}>
                Run a free scan
              </a>
            </p>
          </div>
        </div>

        <Section
          title="Why engines cite what they cite"
          lede="What follows is what our own scans record. Nobody outside these companies can see the mechanism itself."
        >
          <Body>
            <p style={P}>
              When somebody asks an engine which tool is best in a category, the answer that comes back is rarely an
              independent evaluation. It reads like a ranked list restated from a page the engine treats as a source
              for that topic - and every scan we run records those pages alongside the answer, so this is something we
              read rather than something we infer.
            </p>
            <p style={P}>
              That is what makes the outcome addressable. If the answer is assembled from a knowable set of pages, the
              work is getting onto those pages rather than guessing at what an engine rewards.
            </p>
            <p style={P}>
              <a href="/what-is-aeo" style={LINK}>
                The longer version, with what we can and cannot claim about it
              </a>
            </p>
          </Body>
        </Section>

        <Section
          title="One placement, two jobs"
          lede="This is why it is not a second service to staff. The same article does both pieces of work."
        >
          <div className="two-up">
            <div style={{ ...CARD, padding: "24px" }}>
              <div style={MICRO}>Google reads a link</div>
              <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
                Authority passes to the page the anchor points at, and the article itself ranks for the term. Measured
                as a position, with a note on whether an AI Overview sits above it.
              </p>
            </div>
            <div style={{ ...CARD, border: "1px solid " + T.accent, padding: "24px" }}>
              <div style={{ ...MICRO, color: T.accent }}>The engines read a source</div>
              <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.ink }}>
                The article becomes one of the pages an answer is assembled from, so the brand gets named. Measured
                across the question set, on every engine.
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="What we actually do"
          lede="Three pieces of work. The first is the one nobody else is selling."
        >
          <div className="seq-three">
            {WORK.map((w) => (
              <div key={w.heading} style={{ ...CARD, padding: "24px" }}>
                <div style={{ fontSize: "14.5px", fontWeight: 600, color: T.ink, lineHeight: 1.4 }}>{w.heading}</div>
                <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.65, color: T.soft }}>{w.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="What we will not put on this page"
          lede="A comparison table is only worth reading if every cell in it has a date against it."
        >
          <Body>
            <p style={P}>
              This page used to carry a three-column table setting us against traditional SEO and against generic AEO
              services, with cells reading things like an audit document, indefinite and a slide deck. We had no
              source for any of it. It has gone, and it is not coming back until somebody has sourced each cell with
              a date - being wrong in public about a competitor is the expensive kind of wrong.
            </p>
            <p style={P}>
              What we will say is what we do and what it costs, both of which are ours to state. Every price is
              published, from tracking alone up to <TierName tier="everywhere" />, and the placement counts are on the
              package pages rather than behind a call.
            </p>
            <p style={P}>
              <a href="/compare" style={LINK}>
                What we do and what it costs
              </a>
            </p>
          </Body>
        </Section>
      </main>

      <CtaSection />
    </>
  );
}
