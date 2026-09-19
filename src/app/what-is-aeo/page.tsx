import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";

import CtaSection from "@/components/CtaSection";
import { TIER_PLAIN } from "@/components/TierName";
import { TIERS } from "@/config/pricing";
import { CARD, GRID12, H2, MICRO, SHELL, T } from "@/config/tokens";
import { ENGINES, ENGINE_SPECS, FREE_ENGINES } from "@/lib/scan/engines";

/**
 * What is AEO - the guide page.
 *
 * This and /how-it-works are the two public pages with no artboard, which is
 * why they were still on the pre-redesign palette - Georgia headings, navy
 * #0D1B2A, orange #D85A30 - after every other surface had moved. The 19 Sep
 * CSS sweep looked for #0B1220 and #F8F7FF and found neither, because this
 * page never used those two. There were two legacy palettes in the tree, and
 * the sweep that declared the token migration finished only knew about one.
 *
 * No board means no board to copy, so the rules in inbox.md stand in for one:
 * tokens only, h1 36px/700/-0.03em, h2 19px, body 14-15px, the 1180 container,
 * sentence case, hyphens. No motion - the one-beat-per-page rule takes its
 * vocabulary from a board's own keyframes, and inventing a beat for a page
 * that has no board is a different thing from following the rule.
 *
 * On the copy: blocked.md listed seven unsourced claims across this page and
 * /how-it-works, twice, and Danny has not answered. AGENTS.md is not ambiguous
 * about the state that leaves the site in - a statement about what an engine
 * does carries [VERIFY] until there is a dated source, and these were
 * published as plain fact. Copy is reversible and explicitly mine, so rather
 * than leave them live for a third session I applied the test blocked.md
 * itself recommended. Every sentence here is now one of: a description of
 * what we do, something our own scans actually observe, or gone.
 *
 * Cut outright, and recoverable from git at 6b473ac: the "most B2B buyers
 * research through AI search" market statistic; the engine market-share
 * ordering, three ranked claims about other companies; the 1-4 week and 4-8
 * week results benchmarks and the "SEO takes 3-6 months" comparison; the
 * 3,000-5,000/month retainer range, which was a claim about what other
 * agencies charge and undercut our own published prices two clicks away; the
 * 6-12 month recency window; and the same-day citation anecdote, which is a
 * client result with no dated source. The full before-and-after is in
 * worklog.md.
 *
 * The mechanism claims are kept but reattributed. We cannot see inside an
 * engine; we can see the sources behind an answer, because every scan records
 * them. That is a smaller claim and it is one we can stand behind.
 */

export const metadata: Metadata = {
  title: "What is AEO? A guide to answer engine optimisation",
  description:
    "AEO is getting a brand named inside an AI-generated answer rather than ranked in the links underneath it. What it is, how it differs from SEO, and how we measure it.",
  alternates: { canonical: "https://alwayscited.com/what-is-aeo" },
  openGraph: {
    images: OG_IMAGE,
    title: "What is AEO? A guide to answer engine optimisation | alwayscited",
    description:
      "AEO is getting a brand named inside an AI-generated answer rather than ranked in the links underneath it.",
    url: "https://alwayscited.com/what-is-aeo",
  },
};

/** One place that knows the JSON-LD envelope, so no block repeats it. */
function jsonLd(type: string, body: Record<string, unknown>): string {
  return JSON.stringify({ "@context": "https://schema.org", "@type": type, ...body });
}

const articleSchema = jsonLd("Article", {
  headline: "What is AEO? A guide to answer engine optimisation",
  description:
    "AEO (answer engine optimisation) is the practice of getting a brand named and cited inside the answer an AI search system generates, rather than ranked in the list of links underneath it.",
  url: "https://alwayscited.com/what-is-aeo",
  author: { "@type": "Organization", name: "alwayscited" },
  publisher: { "@type": "Organization", name: "alwayscited", url: "https://alwayscited.com" },
});

/** "a, b, c and d" - used for the engine lists, which come from config. */
function listOf(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

const freeEngines = listOf(FREE_ENGINES.map((e) => ENGINE_SPECS[e].label));
const otherEngines = listOf(
  ENGINES.filter((e) => !FREE_ENGINES.includes(e)).map((e) => ENGINE_SPECS[e].label),
);

const tracked = TIERS.find((t) => t.id === "tracked");
const mentioned = TIERS.find((t) => t.id === "mentioned");
const cited = TIERS.find((t) => t.id === "cited");

/**
 * The first sentence of a price basis, trimmed for use mid-sentence.
 *
 * Not a lowercase of the whole string: the bases in pricing.ts are two
 * sentences, and lowercasing the lot produced "checked weekly. more questions
 * or a tighter cadence moves the price" in the rendered FAQ and in the
 * FAQPage schema with it.
 */
function firstClause(s: string): string {
  const first = s.split(". ")[0].replace(/[.]+$/, "");
  return first.charAt(0).toLowerCase() + first.slice(1);
}

/**
 * The prices come from pricing.ts so this page cannot contradict the pricing
 * card, which is exactly what the old copy did.
 *
 * Tier names are TIER_PLAIN rather than <TierName>: these strings render into
 * the page and are also serialised into the FAQPage schema below, and JSON-LD
 * is one of the plain-text contexts that must strip the colour.
 */
const priceAnswer = [
  "Ours are published rather than quoted.",
  tracked ? "Tracking is " + tracked.priceLabel + "." + (tracked.priceBasis ? " " + tracked.priceBasis : "") : "",
  mentioned ? "Placements start at " + mentioned.priceLabel + " under " + TIER_PLAIN.mentioned + "." : "",
  cited
    ? "The " + TIER_PLAIN.cited + " plan, which adds the on-site work and the link insertions, is " + cited.priceLabel + "."
    : "",
  "What other agencies charge is not something we can source, so this page does not say.",
]
  .filter(Boolean)
  .join(" ");

type Faq = { q: string; hint: string; a: string };

const FAQS: Faq[] = [
  {
    q: "Is AEO replacing SEO?",
    hint: "No - it sits on top of it",
    a: "No. A placement is an ordinary editorial link as well as a page an engine can read as a source, so one article can move a citation and a Google position. We report the two separately rather than averaging them into one number, because only one of them may have moved and you should be able to tell which.",
  },
  {
    q: "Can I do AEO myself?",
    hint: "The on-site half, yes",
    a: "Some of it. You can structure your own pages for capture - FAQ schema, question-format headings, comparison tables, opening paragraphs written in the phrasing a buyer actually uses. What is harder to do from a desk is getting into the third-party pages the engines are already reading, because that is editorial relationship work rather than a change you can deploy.",
  },
  {
    q: "Which AI systems do you read?",
    hint: FREE_ENGINES.length + " on the free scan",
    a: "A free scan reads " + freeEngines + ". " + otherEngines + " costs materially more per run, so it sits on the tracking plan rather than the free check. We do not publish a ranking of which engine matters most - we have no source for one, and the honest answer is that it depends on who your buyers are.",
  },
  {
    q: "How do you measure results?",
    hint: "Two measures, never averaged",
    a:
      "Two things, kept apart. First: whether you were named in the answer, across a tracked question set" +
      (tracked?.priceBasis ? " - " + firstClause(tracked.priceBasis) : "") +
      ". Second: the Google position for the same question, which comes back in the same response at no extra cost. A citation and a ranking are different outcomes and we never roll them into a single score.",
  },
  {
    q: "What does it cost?",
    hint: "Published, not quoted",
    a: priceAnswer,
  },
];

/** Built from the array the page renders, so the two cannot drift apart. */
const faqSchema = jsonLd("FAQPage", {
  mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

const COMPARISON: { row: string; seo: string; aeo: string }[] = [
  { row: "Target surface", seo: "The list of links", aeo: "The answer written above them" },
  { row: "What is measured", seo: "Your position on a keyword", aeo: "Whether the answer named you" },
  { row: "Where the work lands", seo: "Mostly your own pages", aeo: "Mostly pages the engines already cite" },
  { row: "Who has to say yes", seo: "A ranking system", aeo: "An editor" },
  { row: "Buyer touchpoint", seo: "A click", aeo: "No click needed" },
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

export default function WhatIsAEOPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchema }} />

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
            <div style={MICRO}>Answer engine optimisation</div>
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
              What is AEO? A guide to answer engine optimisation.
            </h1>
            <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.6, color: T.soft, maxWidth: "62ch" }}>
              AEO is getting a brand named inside the answer, rather than ranked in the links underneath it. Same
              buyer, different surface, and a different thing to measure.
            </p>
          </div>

          <div style={{ ...CARD, gridColumn: "span 5", padding: "24px" }}>
            <div style={MICRO}>The short version</div>
            <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.65, color: T.soft }}>
              AEO (answer engine optimisation) is the practice of getting a brand named and cited inside the answer an
              AI search system generates - on Google&apos;s AI Overview, ChatGPT, Perplexity and the rest - rather than
              ranked in the list of links below it. Where SEO targets a position, AEO targets the citation. They are
              measured differently and won differently, which is the whole reason it has its own name.
            </p>
          </div>
        </div>

        <Section
          title="How AEO differs from SEO"
          lede="Two surfaces, two measures. The confusing part is that one piece of work can move both."
        >
          <Body>
            <p style={P}>
              SEO targets the results page: the links and snippets that appear when someone runs a query. AEO targets
              the generated response that sits above those links - Google&apos;s AI Overview, ChatGPT&apos;s answer,
              Perplexity&apos;s summary. The buyer journey differs as a result. SEO assumes the buyer clicks a result
              and lands on your site. AEO assumes they read the answer and may never click anything at all.
            </p>
            <p style={P}>
              The measurements differ too. SEO is counted in keyword positions, organic traffic and conversions from
              organic. AEO is counted in whether you were named in the answer, across a set of questions someone
              actually asks. A first position and a citation are both worth having, but they are not the same finding,
              and a report that averages them hides which one moved.
            </p>
            <p style={P}>
              In practice the two overlap more than they compete. A placement is an ordinary editorial link as well as
              a page an engine can read as a source, so a single article can do both jobs. We report them separately
              rather than claiming one caused the other.
            </p>
            <p style={P}>
              <a href="/how-it-works" style={LINK}>
                How we run those campaigns
              </a>
            </p>
          </Body>
        </Section>

        <Section
          title="How engines decide who to name"
          lede="What follows is what our scans record. Nobody outside these companies can see the mechanism itself."
        >
          <Body>
            <p style={P}>
              We cannot see inside an engine, and anyone who tells you they can is guessing. What we can see is the set
              of pages an answer was assembled from, because every scan we run records them alongside the answer
              itself. Read enough of those and a pattern is hard to miss: the answer is not an independent product
              evaluation. It repeats a ranked list from a page the engine treats as a source for that topic, and the
              brand near the top of that list is usually the brand the answer names.
            </p>
            <p style={P}>
              Topical fit appears to count for more than size. The pages we find behind an answer are more often narrow
              trade titles than the biggest domains in a sector. We would rather put it that way than dress it up as a
              rule about how the engines are built, because the first is something we observed and the second is
              something we would be inventing.
            </p>
            <p style={P}>
              Age shows up as well. Citation rates drift down as an article gets older and newer pages take its place
              in the source set, which is why the programme is a replacement cycle rather than a one-off campaign, and
              why the charts we show clients have dips in them.
            </p>
          </Body>
        </Section>

        <Section
          title="Can this be engineered on purpose?"
          lede="Yes, and the mechanism is specific enough to write down. It is not a content-marketing recommendation."
        >
          <Body>
            <p style={P}>
              The work is placement on the pages an engine is already reading for a category. Identify those pages -
              which is what the free scan does, by reading the answers and recording every source behind them - then
              secure editorial placement on them, with the brand positioned where a ranked list actually gets quoted
              from. Then structure your own pages so a reader arriving from the answer finds the same story.
            </p>
            <p style={P}>
              What you can do yourself is the on-site half. What needs a specialist is identifying the right
              publications and getting into them editorially rather than by buying a slot.
            </p>
            <p style={P}>
              We publish one worked example with a client&apos;s name against it, and it carries the window it happened
              over rather than a bare number.
            </p>
            <p style={P}>
              <a href="/case-studies/vibe-retail" style={LINK}>
                Read the Vibe Retail write-up
              </a>
            </p>
          </Body>
        </Section>

        <Section
          title="How long it takes"
          lede="The honest answer has parts that move on different clocks, so we do not quote one number."
        >
          <Body>
            <p style={P}>
              A placement is live in weeks rather than months. Citation usually follows the next time the engine reads
              the page, which is not a schedule anyone outside the engine controls. A Google position moves on its own
              timetable again. We report the three separately rather than averaging them into a single figure that
              hides which one changed.
            </p>
            <p style={P}>
              The structural reason it can move at all quickly: a placement does not have to build standing from
              nothing. It goes onto a page the engine is already reading. The standing is already there, and the
              placement uses it rather than creating it.
            </p>
            <p style={P}>
              The caveat is durability. Positions inside an answer shift as engines change what they read and as newer
              pages displace older ones. Holding a citation needs monitoring and fresh placements, which is why this
              runs as a retainer rather than a one-off engagement.
            </p>
          </Body>
        </Section>

        <Section
          title="At a glance"
          lede="The differences that change what you do, rather than every difference there is."
        >
          <div style={{ ...CARD, overflow: "hidden" }}>
            <div
              className="board-head"
              style={{
                ...GRID12,
                padding: "13px 26px",
                background: "#fbfbfc",
                borderBottom: "1px solid " + T.line,
              }}
            >
              <div style={{ ...MICRO, gridColumn: "span 4" }}>Difference</div>
              <div style={{ ...MICRO, gridColumn: "span 4" }}>SEO</div>
              <div style={{ ...MICRO, gridColumn: "span 4", color: T.accent }}>AEO</div>
            </div>
            {COMPARISON.map((c, i) => (
              <div
                key={c.row}
                className="board-head"
                style={{ ...GRID12, padding: "16px 26px", borderTop: i ? "1px solid " + T.hair : undefined }}
              >
                <div style={{ gridColumn: "span 4", fontSize: "14px", fontWeight: 600, color: T.ink }}>{c.row}</div>
                <div style={{ gridColumn: "span 4", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>{c.seo}</div>
                <div style={{ gridColumn: "span 4", fontSize: "14px", lineHeight: 1.6, color: T.ink }}>{c.aeo}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Questions we get asked" lede="Answered here rather than on a call.">
          <div style={{ ...CARD, overflow: "hidden" }}>
            {FAQS.map((f) => (
              <details key={f.q} className="faq-row" style={{ borderBottom: "1px solid " + T.hair }}>
                <summary
                  className="board-head faq-summary"
                  style={{ ...GRID12, padding: "17px 26px", cursor: "pointer" }}
                >
                  <span style={{ gridColumn: "span 5", fontSize: "15px", fontWeight: 600, color: T.ink }}>{f.q}</span>
                  <span style={{ gridColumn: "span 7", fontSize: "13.5px", color: T.faint }}>{f.hint}</span>
                </summary>
                <div className="board-head" style={{ ...GRID12, padding: "0 26px 20px" }}>
                  <p style={{ gridColumn: "6 / span 7", margin: 0, fontSize: "14.5px", lineHeight: 1.7, color: T.soft }}>
                    {f.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </Section>
      </main>

      <CtaSection />
    </>
  );
}
