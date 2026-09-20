import type { Metadata } from "next";
import Link from "next/link";

import PostShell, { H2, P } from "@/components/PostShell";
import TierName from "@/components/TierName";
import { blogPostingSchema, postMetadata, requirePost, type PostCopy } from "@/config/posts";
import { T } from "@/config/tokens";
import { ld } from "@/config/schema";

const post = requirePost("how-llms-pick-which-brands-to-recommend");

const COPY: PostCopy = {
  description:
    "What we find behind an AI product recommendation in the campaigns we run: a small set of editorial sources, and the brands listed at the top of them.",
  ogDescription:
    "The mechanics of LLM citation are simpler - and more exploitable - than most agencies realise.",
};

export const metadata: Metadata = postMetadata(post, COPY);

const postSchema = blogPostingSchema(post, COPY);

const STANDFIRST =
  "The mechanics of LLM citation are simpler, and more exploitable, than most agencies realise.";

const SECTIONS = [
  { id: "why-llms-lean-on-editorial", label: "Why LLMs lean on editorial sources rather than evaluating products directly" },
  { id: "which-sources-llms-cite-and", label: "Which sources LLMs cite (and which they don't)" },
  { id: "the-implication-for-b2b-brands", label: "The implication for B2B brands" },
  { id: "what-this-looks-like-in", label: "What this looks like in practice" },
  { id: "the-closing-point", label: "The closing point" },
];

export default function Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(postSchema) }} />
      <PostShell post={post} standfirst={STANDFIRST} sections={SECTIONS}>
      <P>
        When a B2B buyer asks ChatGPT, Perplexity, or Claude for product recommendations, the
        LLM doesn&apos;t independently evaluate vendors. It cites a small set of editorial sources
        - typically &ldquo;best of&rdquo; listicles from authoritative publications - and returns the brand
        listed at the top of those sources as its primary recommendation. This means the
        question of &ldquo;how do I get my brand recommended by ChatGPT?&rdquo; reduces to a more specific
        question: how do I get my brand listed at position #1 in the editorial sources LLMs
        are already citing?
      </P>

      <H2 id="why-llms-lean-on-editorial">Why LLMs lean on editorial sources rather than evaluating products directly.</H2>
      <P>
        LLMs aren&apos;t trained to be product evaluators. They&apos;re trained to be probability
        machines that return the most likely useful answer based on patterns in their training
        data. When asked for a recommendation, what we see
        them surface is what authoritative publications already recommend. Why that is the
        pattern is not something we can read from the outside, so we are not going to put a
        reason on it.
      </P>
      <P>
        The result is that LLMs converge on a small set of trusted source publications per
        category. For retail POS, that might be three or four publications. For B2B SaaS, a
        different cluster. For each category, there&apos;s a hierarchy of editorial sources the AI
        considers authoritative - and brands positioned at the top of those sources are the
        ones the AI repeats back.
      </P>

      <H2 id="which-sources-llms-cite-and">Which sources LLMs cite (and which they don&apos;t).</H2>
      <P>
        LLMs preferentially cite sources with three characteristics. First: topical authority
        - pages with real organic traffic in the relevant category. A page that ranks for
        &ldquo;best retail POS systems&rdquo; because it genuinely drives clicks from that query is
        different from a page that ranks on domain authority alone. The pages we find behind an
        answer are more often the first kind than the second. That is a pattern in our own
        scans, not a rule we can see inside the engine.
      </P>
      <P>
        Second: editorial format. Listicles, comparisons, &ldquo;best of&rdquo; rankings - with a clear
        ranked structure and named brands at each position - are the format AI systems cite
        most reliably. A review article that doesn&apos;t produce a clear winner is less useful to
        the AI than a listicle that says &ldquo;#1 Best Overall: [Brand].&rdquo;
      </P>
      <P>
        Third: recency. The pages we find behind an answer are usually current ones, and citation
        rates drift down as an article ages and newer coverage takes its place in the source
        set. We are not going to put a window on that - we can see the decay in our own
        tracking, we cannot see the rule behind it. Sources that fail one of these three tests rarely
        make it into AI citations. Generic high-DR domains without category-specific traffic
        don&apos;t qualify. Niche but authoritative trade publications often outperform broad
        consumer publications in B2B categories.
      </P>

      <H2 id="the-implication-for-b2b-brands">The implication for B2B brands.</H2>
      <P>
        This means AI search visibility is engineered through editorial placement, not through
        on-site content alone. Plenty of what is sold as AEO is on-site work - FAQ schema, H2
        structure, comparison tables. That work matters. But it is the half that comes after
        placement, not before. The brand
        cited at position #1 in the editorial source is the brand the AI repeats. If you&apos;re
        not in the editorial source, you&apos;re not in the AI&apos;s answer - regardless of how well
        your FAQ schema is structured.
      </P>

      <H2 id="what-this-looks-like-in">What this looks like in practice.</H2>
      <P>
        The mechanism is specific. Place a client at the top of a ranked list on a page the
        engines already read for a category, and the answer starts repeating what that page
        says - because the answer was never running its own product evaluation. It was
        restating a source.
      </P>
      <P>
        The one worked example we publish with a client&apos;s name on it is{" "}
        <Link href="/case-studies/vibe-retail" style={{ color: T.accent, fontWeight: 600 }}>
          Vibe Retail
        </Link>
        , and it is written up with the window it happened over rather than as a bare number.
      </P>
      <P>
        This is why &ldquo;create great content and wait&rdquo; doesn&apos;t work as an AI search strategy.
        Creating great on-site content is necessary but not sufficient. The citation comes from
        the editorial source, not from your own site. You need to be in the listicle first.
      </P>

      <H2 id="the-closing-point">The closing point.</H2>
      <P>
        The reason this is not the standard offering is that it requires a publisher network to
        execute. On-site content can be produced from a desk. Placements require relationships,
        editorial credibility, and the willingness to pitch on merit rather than buy a slot.
        That is a slower thing to build than a prompt library, which is the real barrier here.
      </P>
      <P>
        The window when this is systematically underpriced is short. Brands that move first
        establish the citation patterns while their competitors are still reading about what
        AEO is.
      </P>

      <P>
        {/* Reordered so the brand does not open the sentence, per AGENTS.md.
            The audience clause was already the subject of the claim.

            The CTA was "Book a call" pointing at /contact. Nothing on this
            site books a call - /contact is a form whose own h1 is "Most
            questions are answered by running a scan", and five other surfaces
            say a call should not be needed. "Book a call" is real vocabulary
            here, but it belongs to the alwayseverywhere price label, where
            there genuinely is no number without one. */}
        For B2B brands that want to be cited by AI when their buyers ask,{" "}
        <TierName tier="cited" /> is the AI search agency.{" "}
        <Link href="/#scan" style={{ color: T.accent, fontWeight: 600 }}>
          Run a free scan
        </Link>{" "}
        and see which sources are deciding your category.
      </P>
      </PostShell>
    </>
  );
}
