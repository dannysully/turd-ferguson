import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";
import Link from "next/link";

import PostShell, { H2, P } from "@/components/PostShell";
import { requirePost } from "@/config/posts";
import { T } from "@/config/tokens";

export const metadata: Metadata = {
  title: "Why Most AEO Audits Are a Waste of Money",
  description:
    "The agency industry has a new product to sell. Most of it is a report you don't need. If you're being pitched an AEO audit as a standalone deliverable, you're being sold the wrong thing.",
  alternates: {
    canonical:
      "https://alwayscited.com/blog/why-most-aeo-audits-are-a-waste-of-money",
  },
  openGraph: {
    images: OG_IMAGE,
    title: "Why Most AEO Audits Are a Waste of Money | alwayscited",
    description:
      "The agency industry has a new product to sell. Most of it is a report you don't need.",
    url: "https://alwayscited.com/blog/why-most-aeo-audits-are-a-waste-of-money",
  },
};

const postSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Why most AEO audits are a waste of money",
  description:
    "The agency industry has a new product to sell. Most of it is a report you don't need. If you're being pitched an AEO audit as a standalone deliverable, you're being sold the wrong thing.",
  url: "https://alwayscited.com/blog/why-most-aeo-audits-are-a-waste-of-money",
  datePublished: "2026-04-30",
  author: { "@type": "Organization", name: "alwayscited" },
  publisher: {
    "@type": "Organization",
    name: "alwayscited",
    url: "https://alwayscited.com",
  },
};

const post = requirePost("why-most-aeo-audits-are-a-waste-of-money");

const STANDFIRST =
  "The agency industry has a new product to sell. Most of it is a report nobody acts on.";

const SECTIONS = [
  { id: "what-an-aeo-audit-typically", label: "What an AEO audit typically contains" },
  { id: "whats-actually-wrong-with-this", label: "What's actually wrong with this" },
  { id: "the-audit-to-action-gap", label: "The audit-to-action gap" },
  { id: "why-this-exists", label: "Why this exists" },
  { id: "the-harder-question-to-ask", label: "The harder question to ask" },
  { id: "what-to-buy-instead", label: "What to buy instead" },
];

export default function Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(postSchema) }} />
      <PostShell post={post} standfirst={STANDFIRST} sections={SECTIONS}>
      <P>
        The AI search boom has produced a wave of new agency offerings - and most of them are
        audits. AEO audits, AI visibility scorecards, ChatGPT presence reports. They&apos;re being
        sold for thousands of dollars by agencies that have never engineered a real AI Overview
        citation in their lives. If you&apos;re being pitched an AEO audit as a standalone
        deliverable, you&apos;re being sold the wrong thing.
      </P>

      <H2 id="what-an-aeo-audit-typically">What an AEO audit typically contains.</H2>
      <P>
        A list of prompts the agency ran across ChatGPT, Perplexity, and Claude. A summary of
        how often the brand was mentioned. A competitive comparison showing where direct
        competitors are showing up. A set of &ldquo;recommendations&rdquo; - usually generic SEO best
        practices repackaged: improve your schema, write more FAQ content, structure your H2s
        as questions. The deliverable is a slide deck.
      </P>

      <H2 id="whats-actually-wrong-with-this">What&apos;s actually wrong with this.</H2>
      <P>
        The audit tells you what the problem is - you&apos;re not cited by AI - and then hands you
        back the work of fixing it. The recommendations almost universally focus on on-site
        changes: schema, content structure, FAQ pages. These changes matter, but they&apos;re a
        small part of the actual problem.
      </P>
      <P>
        The real cause of zero AI visibility is editorial: your brand isn&apos;t in the listicles
        AI is citing. No amount of on-site optimisation will solve that, because LLMs don&apos;t
        cite vendor websites - they cite editorial publications about vendor websites. An AEO
        audit that focuses exclusively on on-site recommendations has correctly diagnosed the
        symptom and completely missed the cause.
      </P>

      <H2 id="the-audit-to-action-gap">The audit-to-action gap.</H2>
      <P>
        A typical AEO audit ends at the recommendation stage. Securing the editorial
        placements that would actually move AI citations is &ldquo;out of scope.&rdquo; So the client pays
        for the diagnosis, then has to either hire a separate agency for the cure, or attempt
        the placement work in-house. Most don&apos;t have the publisher relationships to execute.
        The audit becomes a shelf document. The visibility doesn&apos;t change.
      </P>
      <P>
        This isn&apos;t hypothetical - it&apos;s the outcome we see most often when clients come to
        alwayscited after buying an AEO audit from another agency. They have a detailed
        document. They don&apos;t have any citations.
      </P>

      <H2 id="why-this-exists">Why this exists.</H2>
      <P>
        AEO audits are an easy product to sell because they require no execution capability -
        only a tracking tool subscription and a prompt library. Any agency with an SEO
        background can run them. They produce a tangible deliverable. They&apos;re invoiceable in
        2-4 weeks. The economics are good for the agency. The economics are not good for the
        client.
      </P>
      <P>
        The fundamental problem is that diagnosis without execution is a product designed to
        serve the agency, not the client. The agency gets paid. The client gets a document
        they can&apos;t act on.
      </P>

      <H2 id="the-harder-question-to-ask">The harder question to ask.</H2>
      <P>
        Before you buy an AEO audit, ask the agency a single question: &ldquo;Have you secured an
        AI Overview citation for a client in the last 90 days, and can you show me the
        placement that triggered it?&rdquo;
      </P>
      <P>
        If the answer is yes - they&apos;re real. If the answer is hedged, evasive, or &ldquo;we focus
        on the strategy, not the execution&rdquo; - they&apos;re selling a slide deck. There&apos;s no shame
        in not having execution capability. There&apos;s enormous shame in selling diagnosis as a
        standalone product without it.
      </P>

      <H2 id="what-to-buy-instead">What to buy instead.</H2>
      <P>
        Buy a campaign, not an audit. A real AEO engagement covers: placement secured, on-site
        content built and deployed, ChatGPT/AI Overview citation tracked weekly, and reporting
        on outcomes - not just findings. The deliverable is changed visibility, not a document.
      </P>
      <P>
        The price is comparable - sometimes lower - than a standalone audit, because the
        audit is a free byproduct of the work, not the work itself. An agency that has
        actually engineered AI citations knows exactly what the problem is before they start,
        because they&apos;ve seen the same pattern across multiple clients. The &ldquo;audit&rdquo; takes
        thirty minutes. The work starts immediately.
      </P>

      <P>
        alwayscited doesn&apos;t sell AEO audits. We engineer AI citations and report on the
        outcomes.{" "}
        <Link href="/contact" style={{ color: T.accent, fontWeight: 600 }}>
          Book a call
        </Link>
        .
      </P>
      </PostShell>
    </>
  );
}
