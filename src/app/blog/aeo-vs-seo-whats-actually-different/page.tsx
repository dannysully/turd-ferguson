import type { Metadata } from "next";
import Link from "next/link";

import PostShell, { H2, P } from "@/components/PostShell";
import TierName from "@/components/TierName";
import { blogPostingSchema, postMetadata, requirePost } from "@/config/posts";
import { T } from "@/config/tokens";
import { ld } from "@/config/schema";

const post = requirePost("aeo-vs-seo-whats-actually-different");

export const metadata: Metadata = postMetadata(post, {
  description:
    "AEO and SEO are overlapping channels with different target surfaces, measurement and time horizons. What differs and what does not, from people who do both.",
  ogDescription:
    "The clearest comparison of AEO and SEO you'll read this year - written by people who actually do both.",
});

const postSchema = blogPostingSchema(
  post,
  "The clearest comparison of AEO and SEO you'll read this year - written by people who actually do both.",
);

const STANDFIRST =
  "The clearest comparison of AEO and SEO you will read this year, written by people who do both.";

const SECTIONS = [
  { id: "the-surface-is-different", label: "The surface is different" },
  { id: "the-signals-are-different-mostly", label: "The signals are different (mostly)" },
  { id: "the-time-horizons-are-different", label: "The time horizons are different" },
  { id: "the-measurement-is-different", label: "The measurement is different" },
  { id: "where-they-overlap-and-why", label: "Where they overlap (and why this matters)" },
  { id: "the-strategic-call", label: "The strategic call" },
];

export default function Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(postSchema) }} />
      <PostShell post={post} standfirst={STANDFIRST} sections={SECTIONS}>
      <P>
        AEO (Answer Engine Optimisation) and SEO (Search Engine Optimisation) are often
        discussed as if they&apos;re competing disciplines or sequential trends - first SEO, now
        AEO. They&apos;re neither. AEO and SEO are overlapping channels with different target
        surfaces, different measurement frameworks, and different time horizons. Understanding
        what&apos;s the same and what&apos;s different between them is the first step in deciding how
        to allocate visibility budget in 2026.
      </P>

      <H2 id="the-surface-is-different">The surface is different.</H2>
      <P>
        SEO targets the search engine results page (SERP) - the links, featured snippets, and
        knowledge panels that appear when you run a Google query. AEO targets the AI-generated
        answer that increasingly appears above or instead of those links: Google&apos;s AI Overview,
        ChatGPT&apos;s chat response, Perplexity&apos;s answer block.
      </P>
      <P>
        The buyer journey is different as a result. SEO assumes the buyer clicks a result and
        lands on your website. AEO assumes the buyer reads the AI answer and may never click
        anything at all. The implication: AEO citations are often the only chance to influence
        a buyer&apos;s shortlist before they ever reach a vendor&apos;s website. If your brand isn&apos;t
        in the AI answer, it may not make the shortlist - regardless of how well your website
        converts.
      </P>

      <H2 id="the-signals-are-different-mostly">The signals are different (mostly).</H2>
      <P>
        SEO is driven by link equity, on-page relevance, technical health, and user signals.
        AEO is driven by editorial authority of cited sources, topical relevance, and recency.
        Both care about content quality. But the weight of each signal differs in important
        ways.
      </P>
      <P>
        In the scans we run, the pages behind an answer are more often category-specific titles
        than the biggest domains available. A high-DR domain with no niche relevance can be a
        perfectly good SEO link and still never turn up as a source; a trade publication with
        modest DR and high category relevance is often the inverse. This matters practically: if you&apos;re buying
        links to improve SEO and those links come from generic high-DR domains, they&apos;re
        probably not moving your AEO citations at all.
      </P>

      <H2 id="the-time-horizons-are-different">The time horizons are different.</H2>
      <P>
        SEO compounds slowly: backlinks build, content earns its rankings, and the curve is
        measured in months. AEO can move sooner, because a placement does not have to build
        standing from nothing - it goes onto a page the engine is already reading. How much
        sooner is not a number we will put on this page. A placement is live in weeks,
        citation usually follows the next time the engine reads the page, and a Google
        position moves on its own schedule again. We report those separately rather than
        averaging them into one promise.
      </P>
      <P>
        The trade is durability. SEO investments compound for years; a strong link profile
        from five years ago still contributes. AEO citation positions can shift faster because
        LLM training data and citation behaviour both evolve - a newer, fresher placement on
        the same domain can displace an older one. This is why <TierName tier="cited" /> operates
        on retainer rather than one-off engagements: citation maintenance requires ongoing
        attention.
      </P>

      <H2 id="the-measurement-is-different">The measurement is different.</H2>
      <P>
        SEO is measured in keyword rankings, organic traffic, and conversions from organic.
        AEO is measured as whether the answer named you, across a tracked question set - the
        questions buyers in the client&apos;s category actually ask, run on a weekly cadence -
        plus whether you appear in the AI Overview on a commercial-intent query. The question
        count and the cadence are what the tracking plan is priced on, so they are published
        rather than described as typical.
      </P>
      <P>
        The metrics don&apos;t translate cleanly. A #1 Google ranking and a 100% ChatGPT citation
        rate measure different things. A brand can rank #1 on Google for a commercial term
        and still have zero AI visibility - because the AI is citing a publication that ranks
        #4 on Google, not the brand&apos;s own page. Measuring only SEO metrics gives a
        dangerously incomplete picture of visibility in 2026.
      </P>

      <H2 id="where-they-overlap-and-why">Where they overlap (and why this matters).</H2>
      <P>
        This is the actual punchline. The placements that get you cited - editorial listicles in
        your niche - are ordinary editorial links as well. A &ldquo;best of&rdquo; listicle in your exact
        category, on a page with real organic traffic on the category query, is a link worth
        having on its own terms. We count it once and report the citation and the position
        separately, rather than claiming one of them bought the other.
      </P>
      <P>
        Same placement, two jobs. This is why <TierName tier="cited" /> treats AEO and SEO as one
        campaign with two outcomes rather than two campaigns. If you are paying one agency for SEO and
        another for AEO, it is worth asking what is actually distinct about the second scope -
        or whether you are buying the same placements twice.
      </P>

      <H2 id="the-strategic-call">The strategic call.</H2>
      <P>
        For most B2B brands in 2026, AEO + SEO from a single integrated campaign is the right
        answer. AEO-only campaigns leave too much SEO upside on the table. SEO-only campaigns
        leave the AI search channel completely uncovered - and that channel is where buying
        decisions are increasingly being made before buyers ever click a search result.
      </P>
      <P>
        Two separate retainers with two different agencies is the worst option: duplicate cost,
        conflicting strategies, and no integrated measurement. The editorial work that drives
        both channels should come from one source with one coherent campaign structure.
      </P>

      <P>
        {/* Reordered so the brand does not open the sentence. AGENTS.md calls
            for the rewrite rather than a capital, and the claim is unchanged. */}
        One campaign, two outcomes - that is how <TierName tier="cited" /> runs AEO and SEO.{" "}
        <Link href="/contact" style={{ color: T.accent, fontWeight: 600 }}>
          Book a call
        </Link>
        .
      </P>
      </PostShell>
    </>
  );
}
