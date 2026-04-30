import type { Metadata } from "next";
import CtaSection from "@/components/CtaSection";

export const metadata: Metadata = {
  title: "What is AEO? A Complete Guide to Answer Engine Optimisation",
  description:
    "AEO (Answer Engine Optimisation) is how brands get cited by ChatGPT, Google's AI Overview, and other AI search systems. Here's exactly how it works, how it differs from SEO, and how long it takes.",
  alternates: { canonical: "https://alwayscited.com/what-is-aeo" },
  openGraph: {
    title: "What is AEO? A Complete Guide to Answer Engine Optimisation | AlwaysCited",
    description:
      "AEO is how brands get cited by ChatGPT, Google's AI Overview, and other AI search systems. Here's exactly how it works.",
    url: "https://alwayscited.com/what-is-aeo",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "What is AEO? A complete guide to Answer Engine Optimisation",
  description:
    "AEO (Answer Engine Optimisation) is the practice of optimising content and editorial placements to be cited by AI search systems including Google's AI Overview, ChatGPT, Perplexity, and Claude.",
  url: "https://alwayscited.com/what-is-aeo",
  author: { "@type": "Organization", name: "AlwaysCited" },
  publisher: {
    "@type": "Organization",
    name: "AlwaysCited",
    url: "https://alwayscited.com",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is AEO replacing SEO?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No — AEO is layering on top of SEO. The same placements that drive AI Overview citations are also high-authority backlinks that improve traditional search rankings. The two channels reinforce each other; they don't substitute.",
      },
    },
    {
      "@type": "Question",
      name: "Can I do AEO myself?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Some of it — yes. You can structure your on-site content for AI Overview capture (FAQ schema, question-format H2s, comparison tables, opening paragraphs tuned to query phrasing). What you can't easily do alone is secure listicle placements on high-authority domains in your niche. That's relationship-led editorial work that takes years of publisher network building to do at any scale.",
      },
    },
    {
      "@type": "Question",
      name: "Which AI search systems matter most for B2B?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Google's AI Overview (the largest by traffic share), ChatGPT (the largest by user share among informed buyers), and Perplexity (the smallest of the three by volume but disproportionately used by enterprise researchers). Claude and Gemini matter less for now but the citation mechanics across all five are similar.",
      },
    },
    {
      "@type": "Question",
      name: "How do you measure AEO results?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Across two measurements. First: citation rate across a tracked prompt set — typically 20-30 prompts that buyers in the client's category would actually ask, run weekly across ChatGPT, Perplexity, and Claude. Second: AI Overview citation status on commercial-intent queries — a binary check for whether the client appears as a top citation when the target query is run on Google.",
      },
    },
    {
      "@type": "Question",
      name: "What does AEO cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pricing varies by category and competitive set. As a benchmark, AEO retainers typically start at $3,000-5,000/month for a focused single-product engagement, scaling up to $15,000-30,000/month for multi-product or multi-market campaigns. Most agencies running real AEO work — not audits — operate on a performance-linked basis.",
      },
    },
  ],
};

const faqs = [
  {
    q: "Is AEO replacing SEO?",
    a: "No — AEO is layering on top of SEO. The same placements that drive AI Overview citations are also high-authority backlinks that improve traditional search rankings. The two channels reinforce each other; they don't substitute.",
  },
  {
    q: "Can I do AEO myself?",
    a: "Some of it — yes. You can structure your on-site content for AI Overview capture (FAQ schema, question-format H2s, comparison tables, opening paragraphs tuned to query phrasing). What you can't easily do alone is secure listicle placements on high-authority domains in your niche. That's relationship-led editorial work that takes years of publisher network building to do at any scale.",
  },
  {
    q: "Which AI search systems matter most for B2B?",
    a: "Google's AI Overview (the largest by traffic share), ChatGPT (the largest by user share among informed buyers), and Perplexity (the smallest of the three by volume but disproportionately used by enterprise researchers). Claude and Gemini matter less for now but the citation mechanics across all five are similar.",
  },
  {
    q: "How do you measure AEO results?",
    a: "Across two measurements. First: citation rate across a tracked prompt set — typically 20-30 prompts that buyers in the client's category would actually ask, run weekly across ChatGPT, Perplexity, and Claude. Second: AI Overview citation status on commercial-intent queries — a binary check for whether the client appears as a top citation when the target query is run on Google.",
  },
  {
    q: "What does AEO cost?",
    a: "Pricing varies by category and competitive set. As a benchmark, AEO retainers typically start at $3,000-5,000/month for a focused single-product engagement, scaling up to $15,000-30,000/month for multi-product or multi-market campaigns. Most agencies running real AEO work — not audits — operate on a performance-linked basis.",
  },
];

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2
    style={{
      fontFamily: "Georgia, 'Times New Roman', Times, serif",
      color: "#0D1B2A",
      fontSize: "clamp(1.6rem, 2.8vw, 2rem)",
      lineHeight: 1.2,
      marginBottom: "1.5rem",
    }}
  >
    {children}
  </h2>
);

const Prose = ({ children }: { children: React.ReactNode }) => (
  <p
    style={{
      color: "#3D3D3A",
      fontSize: "1.0625rem",
      lineHeight: 1.75,
      maxWidth: "44rem",
    }}
  >
    {children}
  </p>
);

export default function WhatIsAEOPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section style={{ background: "linear-gradient(160deg, #0D1B2A 0%, #152636 100%)" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24 md:py-32">
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#ffffff",
              fontSize: "clamp(1.9rem, 4vw, 3rem)",
              lineHeight: 1.15,
              marginBottom: "1.25rem",
              maxWidth: "40rem",
            }}
          >
            What is AEO? A complete guide to Answer Engine Optimisation.
          </h1>
          <p style={{ color: "#b4c5d6", fontSize: "1.1rem", lineHeight: 1.6, maxWidth: "36rem" }}>
            AEO is how brands get cited by ChatGPT, Google&apos;s AI Overview, and other AI search
            systems. Here&apos;s exactly how it works.
          </p>
        </div>
      </section>

      {/* Opening paragraph — engineered for AI Overview capture */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-16">
          <p
            style={{
              color: "#3D3D3A",
              fontSize: "1.125rem",
              lineHeight: 1.75,
              maxWidth: "46rem",
              borderLeft: "3px solid #D85A30",
              paddingLeft: "1.5rem",
            }}
          >
            AEO (Answer Engine Optimisation) is the practice of optimising content and editorial
            placements to be cited by AI search systems — including Google&apos;s AI Overview, ChatGPT,
            Perplexity, and Claude. Where traditional SEO targets ranking positions on a search
            results page, AEO targets the citations inside the AI-generated answer itself. The
            mechanics are different: AI systems weight editorial authority and topical relevance
            more heavily than the link equity signals that drive traditional Google rankings. As of
            2026, most B2B buyers research products through AI search before clicking any traditional
            result, which makes AEO a critical visibility channel for brands selling to informed
            buyers.
          </p>
        </div>
      </section>

      {/* Section 1 */}
      <section style={{ background: "#F5F5F4" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H2>How is AEO different from SEO?</H2>
          <Prose>
            SEO and AEO target different surfaces. SEO targets the search engine results page
            (SERP) — the ten blue links and featured snippets that appear when you run a Google
            query. AEO targets the AI-generated response that increasingly appears above or instead
            of those links: Google&apos;s AI Overview, ChatGPT&apos;s answer, Perplexity&apos;s summary. The
            buyer journey is different as a result — SEO assumes the buyer clicks a result and
            lands on your website. AEO assumes the buyer reads the AI&apos;s answer and may never click
            anything at all.
          </Prose>
          <br />
          <Prose>
            The measurement frameworks are different too. SEO is measured in keyword rankings,
            organic traffic, and conversions from organic. AEO is measured in citation rate across
            a tracked prompt set, and AI Overview citation status on commercial-intent queries. A
            #1 Google ranking and a 100% ChatGPT citation rate are both valuable — but they
            measure different things and are pursued through different mechanisms.
          </Prose>
          <br />
          <Prose>
            In practice, the two channels overlap more than they compete. The editorial placements
            that drive AI Overview citations are also high-quality backlinks for SEO purposes. The
            on-site content structured for AEO — question-format H2s, comparison tables, FAQ
            schema — also improves traditional rankings. Both matter, and the most effective
            campaigns move both simultaneously. See{" "}
            <a href="/how-it-works" style={{ color: "#D85A30" }}>
              how we run those campaigns
            </a>
            .
          </Prose>
        </div>
      </section>

      {/* Section 2 */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H2>How do AI systems decide which brands to cite?</H2>
          <Prose>
            LLMs and AI Overviews don&apos;t evaluate products independently. They identify which
            publications they consider authoritative on a given topic, and then surface the brands
            recommended by those publications. When a buyer asks ChatGPT &ldquo;what&apos;s the best retail
            POS system?&rdquo; the AI doesn&apos;t run its own product evaluation — it cites a ranked list
            from a publication it trusts. The brand at position #1 in that list is the brand the
            AI returns.
          </Prose>
          <br />
          <Prose>
            This means topical relevance of the source matters more than raw domain authority. A
            niche trade publication focused on retail technology — even with modest overall
            authority metrics — will outperform a generic high-DA technology publication for retail
            POS queries. AI systems weight specialisation over scale.
          </Prose>
          <br />
          <Prose>
            Recency matters significantly. Content updated within the last 6-12 months is weighted
            more heavily than older content. An authoritative &ldquo;best of&rdquo; listicle that was last
            updated two years ago carries less citation weight than a current one on the same
            domain. This is why placement campaigns need fresh editorial coverage — not just
            historical mentions.
          </Prose>
        </div>
      </section>

      {/* Section 3 */}
      <section style={{ background: "#F5F5F4" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H2>Can AEO results be engineered intentionally?</H2>
          <Prose>
            Yes — by securing placements on the specific publications that AI systems are already
            citing in a given category. This isn&apos;t a vague &ldquo;create good content&rdquo; recommendation.
            It&apos;s a specific mechanism: identify the publications the AI already trusts for the
            target category, secure editorial placements on those publications with the brand
            positioned at or near the top of the ranked list, and structure the surrounding on-site
            content to reinforce the citation pattern.
          </Prose>
          <br />
          <Prose>
            The evidence that this is engineerable: we have secured same-day AI Overview citations
            for clients — a placement goes live in the morning, and by that evening the AI is
            citing it. That velocity doesn&apos;t happen by accident. It happens when the placement is
            on a domain the AI already trusts, in a topic cluster the AI is already attempting to
            answer, with the brand positioned correctly within the editorial structure of the piece.
          </Prose>
          <br />
          <Prose>
            What you can do yourself: on-site AEO work (FAQ schema, question-format H2s, comparison
            tables, structured opening paragraphs). What requires a specialist: identifying the
            right publications, and securing placements on those publications through editorial
            relationships rather than paid placement. See{" "}
            <a href="/" style={{ color: "#D85A30" }}>
              what AlwaysCited does
            </a>
            .
          </Prose>
        </div>
      </section>

      {/* Section 4 */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H2>How long does AEO take to show results?</H2>
          <Prose>
            AEO produces measurable results significantly faster than SEO. The benchmark from our
            client work: 1-4 weeks for the first measurable citations, and 4-8 weeks for sustained
            presence in 50%+ of tracked AI prompts. For context, traditional SEO typically takes
            3-6 months to show meaningful ranking movement on competitive commercial keywords.
          </Prose>
          <br />
          <Prose>
            The reason AEO moves faster is structural. SEO requires building trust over time
            through accumulating link signals, user engagement data, and indexation history. AEO
            works by placing content on publications the AI already considers trustworthy. The
            trust is already there — the placement activates it. As long as the editorial
            placement is correctly structured and on the right domain, the citation can appear
            within hours of publication.
          </Prose>
          <br />
          <Prose>
            One caveat on durability: AEO citation positions can shift as LLM training data and
            citation behaviour evolve. Maintaining citations requires active monitoring of the
            citation landscape and refreshing placements when newer content displaces older ones.
            This is why AlwaysCited operates on retainer rather than one-off engagement.
          </Prose>
        </div>
      </section>

      {/* Section 5 — Comparison table */}
      <section style={{ background: "#F5F5F4" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H2>AEO vs SEO at a glance.</H2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9375rem",
                color: "#3D3D3A",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #0D1B2A" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.75rem 1rem 0.75rem 0",
                      fontFamily: "Georgia, 'Times New Roman', Times, serif",
                      color: "#0D1B2A",
                      fontWeight: "normal",
                      minWidth: "160px",
                    }}
                  >
                    &nbsp;
                  </th>
                  {["SEO", "AEO"].map((col) => (
                    <th
                      key={col}
                      style={{
                        textAlign: "left",
                        padding: "0.75rem 1rem",
                        fontFamily: "Georgia, 'Times New Roman', Times, serif",
                        color: col === "AEO" ? "#D85A30" : "#0D1B2A",
                        fontWeight: "normal",
                        minWidth: "200px",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { row: "Target surface", seo: "Search results page", aeo: "AI-generated answer" },
                  { row: "Primary signal", seo: "Link equity", aeo: "Editorial authority" },
                  { row: "Time to first result", seo: "3-6 months", aeo: "1-4 weeks" },
                  { row: "Measurement", seo: "Keyword rankings", aeo: "Citation rate across tracked prompts" },
                  { row: "Buyer touchpoint", seo: "Click required", aeo: "Information delivered without click" },
                  { row: "Investment compounds", seo: "Yes — slowly", aeo: "Yes — quickly with the right placements" },
                ].map(({ row, seo, aeo }) => (
                  <tr key={row} style={{ borderBottom: "1px solid #B4B2A9" }}>
                    <td
                      style={{
                        padding: "1rem 1rem 1rem 0",
                        fontFamily: "Georgia, 'Times New Roman', Times, serif",
                        color: "#0D1B2A",
                        fontWeight: "normal",
                        fontSize: "0.875rem",
                      }}
                    >
                      {row}
                    </td>
                    <td style={{ padding: "1rem", color: "#5F5E5A" }}>{seo}</td>
                    <td style={{ padding: "1rem", color: "#0D1B2A", fontWeight: 500, background: "#fff" }}>{aeo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 6 — FAQ */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H2>Frequently asked questions about AEO.</H2>
          <div style={{ borderTop: "1px solid #B4B2A9" }}>
            {faqs.map((faq) => (
              <details
                key={faq.q}
                style={{ borderBottom: "1px solid #B4B2A9", padding: "1.5rem 0" }}
              >
                <summary
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    cursor: "pointer",
                    color: "#0D1B2A",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', Times, serif",
                      fontSize: "1.1rem",
                      lineHeight: 1.3,
                    }}
                  >
                    {faq.q}
                  </span>
                </summary>
                <p
                  style={{
                    color: "#3D3D3A",
                    lineHeight: 1.7,
                    marginTop: "1rem",
                    maxWidth: "52rem",
                  }}
                >
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
