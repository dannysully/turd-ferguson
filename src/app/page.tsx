import type { Metadata } from "next";
import Link from "next/link";
import FrameworkDiagram from "@/components/FrameworkDiagram";
import CtaSection from "@/components/CtaSection";

export const metadata: Metadata = {
  title: "AlwaysCited — The AI Search Agency",
  description:
    "Be the brand AI recommends. AlwaysCited engineers citations across Google's AI Overview, ChatGPT, and Perplexity for B2B brands. Same-day AI Overview citations. One investment, two channels.",
  alternates: { canonical: "https://alwayscited.com" },
  openGraph: {
    title: "AlwaysCited — The AI Search Agency",
    description:
      "Be the brand AI recommends. We engineer AI citations across Google's AI Overview, ChatGPT, and Perplexity.",
    url: "https://alwayscited.com",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AlwaysCited",
  url: "https://alwayscited.com",
  description:
    "AlwaysCited is the AI Search Agency that engineers brand visibility across Google's AI Overview, ChatGPT, Perplexity, Claude, and other LLMs for B2B brands.",
  logo: "https://alwayscited.com/logo.png", // PLACEHOLDER: replace with real logo URL before launch
  sameAs: [
    // PLACEHOLDER: add LinkedIn, X (Twitter), and other social profile URLs
  ],
  parentOrganization: {
    "@type": "Organization",
    name: "Nomada Digital",
    url: "https://nomadadigital.co.uk",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is AEO and how is it different from SEO?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AEO (Answer Engine Optimisation) is the practice of getting your brand cited by AI search systems — Google's AI Overview, ChatGPT, Perplexity, Claude. Where SEO targets search rankings on a results page, AEO targets the citations inside the AI-generated response itself. The mechanics are different: AI systems lean heavily on editorial 'best of' content from authoritative publications, not on the same ranking signals that drive traditional Google results.",
      },
    },
    {
      "@type": "Question",
      name: "Can you guarantee AI Overview citations?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We can guarantee an AEO-engineered campaign. AI Overview citations themselves depend on Google's AI surfacing the placements we secure — but our most recent client engagement produced same-day AI Overview citations from a single placement, and three top-citation positions across commercial-intent queries inside eight weeks. We bring receipts to every conversation.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to be cited by ChatGPT?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends on the category, but our client benchmark is one to four weeks for the first measurable mentions, and four to eight weeks for sustained presence in 50%+ of tracked prompts. The mechanism — high-authority editorial placements — works fast because LLMs cite from sources they already consider trusted, not from sources that need to earn trust over years.",
      },
    },
    {
      "@type": "Question",
      name: "Do you also do traditional SEO?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — and so does every AEO campaign we run. The placements that drive AI Overview citations are also high-authority backlinks that pull our clients' product pages up Google's traditional rankings. We don't sell SEO and AEO as two retainers because they're the same campaign with two channel outcomes.",
      },
    },
    {
      "@type": "Question",
      name: "What does an AI search agency cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We don't list pricing publicly because every campaign is scoped to the client's category, current visibility, and competitive set. As a benchmark: our retainers start at $5,000/month and most engagements run on a 3-month minimum performance basis. Book a call and we'll quote against your specifics.",
      },
    },
  ],
};

const faqs = [
  {
    q: "What is AEO and how is it different from SEO?",
    a: "AEO (Answer Engine Optimisation) is the practice of getting your brand cited by AI search systems — Google's AI Overview, ChatGPT, Perplexity, Claude. Where SEO targets search rankings on a results page, AEO targets the citations inside the AI-generated response itself. The mechanics are different: AI systems lean heavily on editorial \"best of\" content from authoritative publications, not on the same ranking signals that drive traditional Google results.",
  },
  {
    q: "Can you guarantee AI Overview citations?",
    a: "We can guarantee an AEO-engineered campaign. AI Overview citations themselves depend on Google's AI surfacing the placements we secure — but our most recent client engagement produced same-day AI Overview citations from a single placement, and three top-citation positions across commercial-intent queries inside eight weeks. We bring receipts to every conversation.",
  },
  {
    q: "How long does it take to be cited by ChatGPT?",
    a: "It depends on the category, but our client benchmark is one to four weeks for the first measurable mentions, and four to eight weeks for sustained presence in 50%+ of tracked prompts. The mechanism — high-authority editorial placements — works fast because LLMs cite from sources they already consider trusted, not from sources that need to earn trust over years.",
  },
  {
    q: "Do you also do traditional SEO?",
    a: "Yes — and so does every AEO campaign we run. The placements that drive AI Overview citations are also high-authority backlinks that pull our clients' product pages up Google's traditional rankings. We don't sell SEO and AEO as two retainers because they're the same campaign with two channel outcomes.",
  },
  {
    q: "What does an AI search agency cost?",
    a: "We don't list pricing publicly because every campaign is scoped to the client's category, current visibility, and competitive set. As a benchmark: our retainers start at $5,000/month and most engagements run on a 3-month minimum performance basis. Book a call and we'll quote against your specifics.",
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(160deg, #0D1B2A 0%, #152636 100%)",
        }}
      >
        <div className="mx-auto max-w-[1100px] px-6 py-28 md:py-36">
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#ffffff",
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: 1.15,
              marginBottom: "1.5rem",
              maxWidth: "36rem",
            }}
          >
            Be the brand AI recommends.
          </h1>
          <p
            style={{
              color: "#b4c5d6",
              fontSize: "1.25rem",
              lineHeight: 1.6,
              marginBottom: "2.5rem",
              maxWidth: "32rem",
            }}
          >
            We&apos;ve taken brand new sites to the top of Google — and the top of ChatGPT — in less than a week.
          </p>
          <Link
            href="/contact"
            style={{
              display: "inline-block",
              background: "#D85A30",
              color: "#ffffff",
              padding: "1rem 2rem",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Book a call
          </Link>
        </div>
      </section>

      {/* The shift section */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#0D1B2A",
              fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
              lineHeight: 1.2,
              marginBottom: "2rem",
            }}
          >
            Search isn&apos;t just Google anymore.
          </h2>
          <p
            style={{
              color: "#3D3D3A",
              fontSize: "1.125rem",
              lineHeight: 1.7,
              maxWidth: "42rem",
            }}
          >
            Your buyers are researching across six platforms before they ever click a result. Google.
            ChatGPT. Reddit. YouTube. Bing. LinkedIn. Most agencies are still optimising for one of
            them. AI Overviews intercept clicks before they happen. ChatGPT and Perplexity make
            recommendations off the back of editorial coverage their users never see. If your
            visibility strategy isn&apos;t cross-platform, you&apos;re invisible exactly where buying decisions
            are being made.
          </p>
        </div>
      </section>

      {/* Framework section */}
      <section style={{ background: "#F5F5F4" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#0D1B2A",
              fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
              lineHeight: 1.2,
              marginBottom: "2rem",
            }}
          >
            One play. Two channels moved.
          </h2>
          <p
            style={{
              color: "#3D3D3A",
              fontSize: "1.125rem",
              lineHeight: 1.7,
              maxWidth: "42rem",
              marginBottom: "3rem",
            }}
          >
            Most agencies sell SEO and AEO as separate retainers. We don&apos;t, because they shouldn&apos;t be.
            The same listicle placements that capture AI Overview citations are also the
            highest-authority backlinks money can buy in SEO terms — pages with real organic traffic
            in your exact niche carry more ranking weight than generic high-DR placements. So every
            campaign moves both channels: AI search citations <em>and</em> Google rankings on your
            product keywords. One investment, two channels.
          </p>
          <div style={{ overflowX: "auto" }}>
            <FrameworkDiagram />
          </div>
        </div>
      </section>

      {/* Proof section */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#0D1B2A",
              fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
              lineHeight: 1.2,
              marginBottom: "3rem",
            }}
          >
            Engineered, not earned.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "2rem",
              marginBottom: "2.5rem",
            }}
          >
            {[
              { stat: "3", label: "AI Overview top citations on commercial-intent queries" },
              { stat: "0 → 14%", label: "ChatGPT brand visibility, one week of tracking" },
              { stat: "Same-day", label: "Time from listicle going live to AI Overview citing the brand as Best Overall" },
            ].map(({ stat, label }) => (
              <div
                key={stat}
                style={{
                  background: "#F5F5F4",
                  padding: "2rem",
                  borderRadius: "8px",
                }}
              >
                <p
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', Times, serif",
                    color: "#D85A30",
                    fontSize: stat.length > 3 ? "3rem" : "4.5rem",
                    lineHeight: 1,
                    marginBottom: "0.75rem",
                  }}
                >
                  {stat}
                </p>
                <p style={{ color: "#3D3D3A", fontSize: "0.875rem", fontWeight: 500 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
          <p style={{ color: "#5F5E5A", fontSize: "1rem", marginBottom: "1.5rem" }}>
            From a single client engagement, in under eight weeks, in a category dominated by
            Lightspeed, Shopify POS, and Square.
          </p>
          <Link
            href="/case-studies/vibe-retail"
            style={{ color: "#D85A30", fontWeight: 500 }}
          >
            Read the case study →
          </Link>
        </div>
      </section>

      {/* How we're different */}
      <section style={{ background: "#F5F5F4" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#0D1B2A",
              fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
              lineHeight: 1.2,
              marginBottom: "3rem",
              maxWidth: "42rem",
            }}
          >
            Most &ldquo;AEO&rdquo; services are SEO with new terminology. We do the actual work.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "3rem",
            }}
          >
            {[
              {
                heading: "We engineer citations, we don’t audit them.",
                body: "Most AEO services produce a report. We secure the placements that make AI cite you.",
              },
              {
                heading: "We work in days, not quarters.",
                body: "Same-day AI Overview citations are a real outcome, not an aspirational metric.",
              },
              {
                heading: "One play, two channels.",
                body: "Every campaign moves both AI search and traditional Google rankings — same investment, double the outcome.",
              },
            ].map(({ heading, body }) => (
              <div key={heading}>
                <h3
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', Times, serif",
                    color: "#0D1B2A",
                    fontSize: "1.2rem",
                    lineHeight: 1.3,
                    marginBottom: "1rem",
                  }}
                >
                  {heading}
                </h3>
                <p style={{ color: "#3D3D3A", lineHeight: 1.7 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ section */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#0D1B2A",
              fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
              lineHeight: 1.2,
              marginBottom: "3rem",
            }}
          >
            Common questions about AI search visibility.
          </h2>
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
                    color: "#0D1B2A",
                    cursor: "pointer",
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

      {/* Final CTA */}
      <CtaSection />
    </>
  );
}
