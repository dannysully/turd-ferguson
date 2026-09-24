import type { Metadata } from "next";
import { WAITLIST_LIMITS } from "@/config/contact";
import { OG_IMAGE } from "@/config/og";
import Link from "next/link";

import { CHATGPT_VISIBILITY, KEYWORD_EIGHT_WEEKS, KEYWORD_FOUR_MONTHS } from "@/config/client-results";
import { CARD, MICRO, SHELL, T } from "@/config/tokens";
import ToConfirm from "@/components/ToConfirm";
import { ORG_REF, ld } from "@/config/schema";

/**
 * The one case study, rebuilt on CaseStudy.dc.html.
 *
 * Every claim on this page was already published here. Nothing has been
 * added, sharpened or re-scoped: the page around them is the board's, and
 * the figures are the ones that were here before.
 *
 * Two departures from the board, both deliberate:
 *
 * - **The visibility figure has one denominator now.** This page carried 14%
 *   and described it as both a whole-prompt-set figure and a ChatGPT-only
 *   one; the homepage carried 25%. Danny settled it as the account owner on
 *   19 Sep 2026: ChatGPT brand visibility, 25%. No window is attached,
 *   because none is sourced.
 * - **"What it did not do"**, the board's honest paragraph, is not written.
 *   It needs facts about what stayed flat and what decayed, and inventing
 *   that paragraph would defeat the point of having it.
 */

export const metadata: Metadata = {
  title: "One placement, and what it moved",
  description:
    `One listicle placement on a page already ranking for the category. The money keyword ${KEYWORD_EIGHT_WEEKS.value} in ${KEYWORD_EIGHT_WEEKS.scope}, #1 at ${KEYWORD_FOUR_MONTHS.scope}.`,
  alternates: { canonical: "https://alwayscited.com/case-studies/vibe-retail" },
  openGraph: {
    images: OG_IMAGE,
    title: "One placement, and what it moved",
    description:
      `The money keyword went from ${KEYWORD_EIGHT_WEEKS.value} in ${KEYWORD_EIGHT_WEEKS.scope}, and reached #1 ${KEYWORD_FOUR_MONTHS.scope} in.`,
    url: "https://alwayscited.com/case-studies/vibe-retail",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "One listicle placement, on a page already ranking for the category",
  // Both windows, because that is what the page says. This field carried
  // "in under eight weeks" over every figure on the page long after the
  // visible copy had been split into an eight-week reading and a four-month
  // one, and after the visibility figure had had its invented window taken
  // off. A stale claim in the head is still a published claim - and on this
  // site it is the copy a machine reads first.
  //
  // Which is also why the denominator is spelled out here rather than left to
  // the page. This string is read detached from the body that carries "Share
  // of the tracked prompts" two hundred words down, so an engine quoting it
  // gets a percentage with nothing to measure it against - the exact thing
  // /about publishes a rule against. `client-results.test.mts` reads every
  // JSON-LD string as its own surface for that reason.
  description:
    `A US retail SaaS: ChatGPT brand visibility from ${CHATGPT_VISIBILITY.value} of the ${CHATGPT_VISIBILITY.scope}, and the money keyword from ${KEYWORD_EIGHT_WEEKS.value} in ${KEYWORD_EIGHT_WEEKS.scope}, reaching #1 ${KEYWORD_FOUR_MONTHS.scope} in.`,
  url: "https://alwayscited.com/case-studies/vibe-retail",
  author: ORG_REF,
  publisher: ORG_REF,
};


const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ margin: "26px 0 0", fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
    {children}
  </h2>
);

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ margin: "22px 0 0", fontSize: "15.5px", fontWeight: 600, color: T.ink }}>{children}</h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: "10px 0 0", fontSize: "15px", lineHeight: 1.7, color: "#3f4451" }}>{children}</p>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="cs-row" style={{ borderTop: "1px solid " + T.hair }}>
    <span style={{ fontSize: "14px", color: "#3f4451" }}>{label}</span>
    <span style={{ fontSize: "14px", fontWeight: 600, color: T.ink, whiteSpace: "nowrap" }}>{value}</span>
  </div>
);

const GLANCE: [string, string][] = [
  ["Sector", "US retail SaaS, cloud POS"],
  ["Window", "Eight weeks, with a four-month reading"],
  ["Placements", "Editorial listicles on retail and ecommerce publications"],
];

const KEYWORDS: [string, string][] = [
  ["cloud based pos system for retail", `${KEYWORD_EIGHT_WEEKS.value} (+79)`],
  ["multi-location retail pos", "#13 to #3 (+10)"],
  ["cloud pos for multi-location retail", "#39 to #15 (+24)"],
  ["cloud based retail pos, cloud retail pos, cloud pos retail, cloud retail pos software", "all newly ranking inside the top 10"],
  ["cloud based pos system, cloud based pos systems, cloud pos software", "newly ranking on page 2"],
];

/**
 * The client's own result stays; what an engine put in its answer does not.
 *
 * "named Best Overall, ahead of Shopify POS, Lightspeed, Square and KORONA"
 * was three prohibited things in one clause - a claim about a client's result,
 * a claim about named competitors, and a statement about what an engine put in
 * its answer - and it carried no date, no screenshot and no tracker. The
 * competitors came out on 19 September 2026 and the rest stayed behind two
 * visible [TO CONFIRM] markers asking for the dates and the tracker.
 *
 * **Danny answered those markers on 24 September 2026 by removing them rather
 * than filling them.** His attested reading - the money keyword from #83, with
 * the window it was measured over - stays. The AI Overview citations, the
 * per-question results, the claim that the positions came from an independent
 * tracker and the [TO CONFIRM] asking which one: all of it goes, because none
 * of it has a dated source and he would rather the page said less.
 *
 * So `OVERVIEWS` is gone and `AI_OVERVIEW_CITATIONS` is no longer published
 * anywhere. The constant stays in `client-results.ts` with its attestation -
 * it was attested, it is simply not evidence anybody has seen - and
 * `client-results.test.mts` holds that nothing prints it.
 *
 * Restoring any of it needs a dated reading, per blocked.md item 8.
 */

export default function CaseStudyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(articleSchema) }} />

      <div style={{ ...SHELL, paddingTop: "40px", display: "flex", flexDirection: "column", gap: "26px" }}>
        <div className="confirm-top">
          <div>
            {/* The beat, from globals.css. `display: block` on the back link
                is load-bearing: transform does not apply to a non-replaced
                inline element, so an inline <a> takes the opacity leg and
                never lifts. The write-up itself is left still, the call
                PostShell made - prose arriving a paragraph at a time competes
                with reading it. */}
            <Link
              className="ac-row"
              href="/case-studies"
              style={{ display: "block", fontSize: "13px", fontWeight: 600, textDecoration: "none", color: T.accent }}
            >
              All evidence
            </Link>
            <div className="ac-row" style={{ ...MICRO, marginTop: "18px" }}>US retail SaaS - eight weeks</div>
            <h1
              className="ac-row"
              style={{
                margin: "10px 0 0",
                fontSize: "34px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.18,
                color: T.ink,
              }}
            >
              One listicle placement, on a page already ranking for the category
            </h1>
            <p className="ac-row" style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.6, color: T.soft, maxWidth: "64ch" }}>
              Client unnamed at the agency request. The position below is the account owner's own reading, over the
              window stated beside it.
            </p>
          </div>

          <div className="ac-row" style={{ ...CARD, padding: "22px", alignSelf: "start" }}>
            <div style={MICRO}>At a glance</div>
            <dl className="cs-glance">
              {GLANCE.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt style={{ fontSize: "13.5px", color: T.soft }}>{k}</dt>
                  <dd style={{ margin: 0, fontSize: "13.5px", color: T.ink }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div style={{ ...CARD, display: "flex", overflow: "hidden", flexWrap: "wrap" }}>
          <div className="ac-row" style={{ flexGrow: 1, flexBasis: "260px", padding: "22px 26px" }}>
            <div style={{ fontSize: "14px", color: T.soft }}>Money keyword position</div>
            <div style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1, marginTop: "2px" }}>
              {KEYWORD_EIGHT_WEEKS.value}
            </div>
            <div style={{ fontSize: "13px", color: T.soft, marginTop: "6px", maxWidth: "34ch" }}>
              Over {KEYWORD_EIGHT_WEEKS.scope}, against the position at the start of the programme.
            </div>
          </div>
          <div className="ac-row" style={{ flexGrow: 1, flexBasis: "260px", padding: "22px 26px", borderLeft: "1px solid " + T.line }}>
            <div style={{ fontSize: "14px", color: T.soft }}>The same keyword, later</div>
            <div style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1, marginTop: "2px" }}>
              {KEYWORD_FOUR_MONTHS.value}
            </div>
            <div style={{ fontSize: "13px", color: T.soft, marginTop: "6px", maxWidth: "34ch" }}>
              Four months in, as the placements kept working.
            </div>
          </div>
          <div className="ac-row" style={{ flexGrow: 1, flexBasis: "260px", padding: "22px 26px", borderLeft: "1px solid " + T.line }}>
            <div style={{ fontSize: "14px", color: T.soft }}>ChatGPT brand visibility</div>
            <div style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1, marginTop: "2px" }}>
              {CHATGPT_VISIBILITY.value}
            </div>
            <div style={{ fontSize: "13px", color: T.soft, marginTop: "6px", maxWidth: "34ch" }}>
              Share of the {CHATGPT_VISIBILITY.scope} where ChatGPT names the brand. Nothing named it before the
              placement ran.
            </div>
          </div>
        </div>

        <div className="post-shell">
          <article>
            <H2>What the client had</H2>
            <P>
              A US-based SaaS platform serving independent and multi-location retailers. Its cloud POS is built for
              retail workflows - inventory, multi-store operations, barcoding, integrated payments - rather than
              adapted from a hospitality or general-purpose platform. Launched in late 2025, the site was effectively
              invisible across both traditional search and the AI answer layer, in a category dominated by names with
              a decade of authority behind them.
            </P>

            <H2>What we did</H2>
            <P>
              The pattern this campaign was built on: when a buyer asks an engine what the best retail POS system is,
              the engine does not evaluate platforms. It reads a ranked list from a publication it already trusts,
              and returns what that list says. So the work was to be in those lists.
            </P>

            <H3>Listicle placements on pages already ranking for the category</H3>
            <P>
              Editorial &ldquo;best of&rdquo; placements on high-authority retail and ecommerce publications, where the
              client was positioned on merit.
            </P>

            <H3>On-site content written for the question, not the keyword</H3>
            <P>
              Each money keyword received a page built for capture: question-format headings, comparison tables, FAQ
              schema, and an opening paragraph that matches the phrasing of the query it answers.
            </P>

            <H3>Anchored authority transfer</H3>
            <P>
              Every external placement carried two contextual links, one to the homepage and one to the relevant
              cluster page, so the authority landed on the pages designed to convert rather than on the domain in
              general.
            </P>

            <H2>What moved</H2>
            <H3>The same placements moved the Google position</H3>
            <P>
              Because the pages carrying the citations are editorial pages with real organic traffic in this exact
              niche, the links in them pass authority to the product and cluster pages. The core money keyword went
              from the position below to the top of page one, with eleven further commercial variations now ranking
              between four and seventeen.
            </P>
            <div style={{ ...CARD, marginTop: "14px", overflow: "hidden", padding: "0 20px 8px" }}>
              {KEYWORDS.map(([kw, move]) => (
                <Row key={kw} label={kw} value={move} />
              ))}
            </div>

            <H3>ChatGPT brand visibility, from nothing</H3>
            <P>
              The brand went from being named in none of the tracked ChatGPT answers to being named in 25% of them.
              On the highest-intent prompts - cloud retail POS system comparison, and top cloud-based POS systems for
              retail stores with inventory management - it is named in every response.
            </P>

            <H3>And the rest of the search footprint</H3>
            <P>
              Seventeen high-intent retail POS terms ranking on page one or two. Eighty-one further keywords newly
              ranking from nothing. Average position across the tracked set improved by 26.4 places. Monthly organic
              traffic up to 137 sessions on the cloud POS cluster, and traffic value up to $1,300 a month from zero in
              the same window.
            </P>
          </article>

          <aside style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div className="ac-row" style={{ ...CARD, padding: "22px" }}>
              <div style={MICRO}>Method</div>
              <p style={{ margin: "8px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
                Brand visibility here is the share of tracked buyer prompts where ChatGPT names the brand, against a
                frozen prompt set. One engine and one denominator, deliberately: a figure that moves between
                denominators is not a figure. Google positions are daily readings from an independent tracker rather
                than our own run.
              </p>
              <p style={{ margin: "10px 0 0", fontSize: "13px", lineHeight: 1.6, color: T.soft }}>
                <ToConfirm>how many prompts were in the set, and the dates each reading covers</ToConfirm>
              </p>
            </div>

            <div className="ac-row" style={{ ...CARD, padding: "22px" }}>
              <div style={MICRO}>Run the same scan</div>
              <p style={{ margin: "8px 0 14px", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
                On a client of yours, free.
              </p>
              <form action="/scan" method="get">
                <label
                  htmlFor="cs-domain"
                  style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}
                >
                  Domain
                </label>
                <input
                  id="cs-domain"
                  name="domain"
                  type="text"
                  maxLength={WAITLIST_LIMITS.domain}
                  placeholder="yourdomain.com"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    color: T.ink,
                    background: T.surface,
                    border: "1px solid " + T.line,
                    borderRadius: "10px",
                    padding: "11px 13px",
                  }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    fontWeight: 600,
                    border: 0,
                    borderRadius: "10px",
                    padding: "11px 20px",
                    cursor: "pointer",
                  }}
                >
                  Check
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
