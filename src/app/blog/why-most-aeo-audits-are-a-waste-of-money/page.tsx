import type { Metadata } from "next";
import Link from "next/link";
import CtaSection from "@/components/CtaSection";

export const metadata: Metadata = {
  title: "Why Most AEO Audits Are a Waste of Money",
  description:
    "The agency industry has a new product to sell. Most of it is a report you don't need. If you're being pitched an AEO audit as a standalone deliverable, you're being sold the wrong thing.",
  alternates: {
    canonical:
      "https://alwayscited.com/blog/why-most-aeo-audits-are-a-waste-of-money",
  },
  openGraph: {
    title: "Why Most AEO Audits Are a Waste of Money | AlwaysCited",
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
  author: { "@type": "Organization", name: "AlwaysCited" },
  publisher: {
    "@type": "Organization",
    name: "AlwaysCited",
    url: "https://alwayscited.com",
  },
};

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2
    style={{
      fontFamily: "Georgia, 'Times New Roman', Times, serif",
      color: "#0D1B2A",
      fontSize: "clamp(1.4rem, 2.5vw, 1.75rem)",
      lineHeight: 1.25,
      marginTop: "3rem",
      marginBottom: "1.25rem",
    }}
  >
    {children}
  </h2>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p
    style={{
      color: "#3D3D3A",
      fontSize: "1.0625rem",
      lineHeight: 1.8,
      marginBottom: "1.25rem",
      maxWidth: "44rem",
    }}
  >
    {children}
  </p>
);

export default function BlogPost3() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postSchema) }}
      />

      {/* Hero */}
      <section style={{ background: "linear-gradient(160deg, #0D1B2A 0%, #152636 100%)" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <p style={{ color: "#b4c5d6", fontSize: "0.875rem", marginBottom: "1rem" }}>
            <Link href="/blog" style={{ color: "#b4c5d6", textDecoration: "none" }}>
              Blog
            </Link>{" "}
            · 30 April 2026 · 5 min read
          </p>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#ffffff",
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              lineHeight: 1.15,
              marginBottom: "1.25rem",
              maxWidth: "38rem",
            }}
          >
            Why most AEO audits are a waste of money
          </h1>
          <p style={{ color: "#b4c5d6", fontSize: "1.1rem", lineHeight: 1.6, maxWidth: "34rem" }}>
            The agency industry has a new product to sell. Most of it is a report you don&apos;t need.
          </p>
        </div>
      </section>

      {/* Article body */}
      <article style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-16 md:py-24">
          {/* Opening paragraph */}
          <p
            style={{
              color: "#3D3D3A",
              fontSize: "1.125rem",
              lineHeight: 1.8,
              marginBottom: "2rem",
              maxWidth: "44rem",
              borderLeft: "3px solid #D85A30",
              paddingLeft: "1.5rem",
            }}
          >
            The AI search boom has produced a wave of new agency offerings — and most of them are
            audits. AEO audits, AI visibility scorecards, ChatGPT presence reports. They&apos;re being
            sold for thousands of dollars by agencies that have never engineered a real AI Overview
            citation in their lives. If you&apos;re being pitched an AEO audit as a standalone
            deliverable, you&apos;re being sold the wrong thing.
          </p>

          <H2>What an AEO audit typically contains.</H2>
          <P>
            A list of prompts the agency ran across ChatGPT, Perplexity, and Claude. A summary of
            how often the brand was mentioned. A competitive comparison showing where direct
            competitors are showing up. A set of &ldquo;recommendations&rdquo; — usually generic SEO best
            practices repackaged: improve your schema, write more FAQ content, structure your H2s
            as questions. The deliverable is a slide deck. The cost is typically [[PLACEHOLDER: USD equivalent of the GBP 3,000-15,000 audit range]].
          </P>

          <H2>What&apos;s actually wrong with this.</H2>
          <P>
            The audit tells you what the problem is — you&apos;re not cited by AI — and then hands you
            back the work of fixing it. The recommendations almost universally focus on on-site
            changes: schema, content structure, FAQ pages. These changes matter, but they&apos;re a
            small part of the actual problem.
          </P>
          <P>
            The real cause of zero AI visibility is editorial: your brand isn&apos;t in the listicles
            AI is citing. No amount of on-site optimisation will solve that, because LLMs don&apos;t
            cite vendor websites — they cite editorial publications about vendor websites. An AEO
            audit that focuses exclusively on on-site recommendations has correctly diagnosed the
            symptom and completely missed the cause.
          </P>

          <H2>The audit-to-action gap.</H2>
          <P>
            A typical AEO audit ends at the recommendation stage. Securing the editorial
            placements that would actually move AI citations is &ldquo;out of scope.&rdquo; So the client pays
            for the diagnosis, then has to either hire a separate agency for the cure, or attempt
            the placement work in-house. Most don&apos;t have the publisher relationships to execute.
            The audit becomes a shelf document. The visibility doesn&apos;t change.
          </P>
          <P>
            This isn&apos;t hypothetical — it&apos;s the outcome we see most often when clients come to
            AlwaysCited after buying an AEO audit from another agency. They have a detailed
            document. They don&apos;t have any citations.
          </P>

          <H2>Why this exists.</H2>
          <P>
            AEO audits are an easy product to sell because they require no execution capability —
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

          <H2>The harder question to ask.</H2>
          <P>
            Before you buy an AEO audit, ask the agency a single question: &ldquo;Have you secured an
            AI Overview citation for a client in the last 90 days, and can you show me the
            placement that triggered it?&rdquo;
          </P>
          <P>
            If the answer is yes — they&apos;re real. If the answer is hedged, evasive, or &ldquo;we focus
            on the strategy, not the execution&rdquo; — they&apos;re selling a slide deck. There&apos;s no shame
            in not having execution capability. There&apos;s enormous shame in selling diagnosis as a
            standalone product without it.
          </P>

          <H2>What to buy instead.</H2>
          <P>
            Buy a campaign, not an audit. A real AEO engagement covers: placement secured, on-site
            content built and deployed, ChatGPT/AI Overview citation tracked weekly, and reporting
            on outcomes — not just findings. The deliverable is changed visibility, not a document.
          </P>
          <P>
            The price is comparable — sometimes lower — than a standalone audit, because the
            audit is a free byproduct of the work, not the work itself. An agency that has
            actually engineered AI citations knows exactly what the problem is before they start,
            because they&apos;ve seen the same pattern across multiple clients. The &ldquo;audit&rdquo; takes
            thirty minutes. The work starts immediately.
          </P>

          {/* Closing CTA */}
          <p
            style={{
              color: "#3D3D3A",
              fontSize: "1.0625rem",
              lineHeight: 1.75,
              marginTop: "3rem",
              maxWidth: "44rem",
              borderTop: "1px solid #B4B2A9",
              paddingTop: "2rem",
            }}
          >
            AlwaysCited doesn&apos;t sell AEO audits. We engineer AI citations and report on the
            outcomes.{" "}
            <Link href="/contact" style={{ color: "#D85A30" }}>
              Book a call
            </Link>
            .
          </p>
        </div>
      </article>

      <CtaSection />
    </>
  );
}
