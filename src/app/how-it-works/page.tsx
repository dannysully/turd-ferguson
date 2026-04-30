import type { Metadata } from "next";
import CtaSection from "@/components/CtaSection";

export const metadata: Metadata = {
  title: "How AI Search Citations Are Engineered",
  description:
    "The exact mechanism AlwaysCited uses to engineer AI Overview and ChatGPT citations for B2B brands — listicle placements, on-site AEO content, and anchored authority transfer.",
  alternates: { canonical: "https://alwayscited.com/how-it-works" },
  openGraph: {
    title: "How AI Search Citations Are Engineered | AlwaysCited",
    description:
      "The exact mechanism AlwaysCited uses to engineer AI Overview and ChatGPT citations for B2B brands.",
    url: "https://alwayscited.com/how-it-works",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How AI search citations are engineered",
  description:
    "The pattern most agencies haven't seen yet — how AlwaysCited engineers AI Overview and LLM citations through strategic listicle placements and AEO-structured content.",
  url: "https://alwayscited.com/how-it-works",
  author: { "@type": "Organization", name: "AlwaysCited" },
  publisher: {
    "@type": "Organization",
    name: "AlwaysCited",
    url: "https://alwayscited.com",
  },
};

const H = ({ children }: { children: React.ReactNode }) => (
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

const Body = ({ children }: { children: React.ReactNode }) => (
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

export default function HowItWorksPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Hero */}
      <section style={{ background: "linear-gradient(160deg, #0D1B2A 0%, #152636 100%)" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24 md:py-32">
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#ffffff",
              fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
              lineHeight: 1.15,
              marginBottom: "1.25rem",
              maxWidth: "36rem",
            }}
          >
            How AI search citations are engineered.
          </h1>
          <p style={{ color: "#b4c5d6", fontSize: "1.2rem", lineHeight: 1.6, maxWidth: "30rem" }}>
            The pattern most agencies haven&apos;t seen yet.
          </p>
        </div>
      </section>

      {/* Section 1 — The mechanism */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H>Why LLMs cite the sources they cite.</H>
          <Body>
            When a buyer asks ChatGPT or Google&apos;s AI Overview &ldquo;what&apos;s the best [category] tool?&rdquo;,
            the AI doesn&apos;t independently evaluate platforms. It cites a ranked list from a
            publication it considers authoritative. That&apos;s the mechanism — and it&apos;s a deliberately
            exploitable one. LLMs and AI Overviews lean heavily on up-to-date &ldquo;best of&rdquo; listicles
            published on high-authority domains. The brand cited at position #1 in those listicles
            is the brand the AI repeats back to the buyer. Most agencies haven&apos;t internalised this
            yet, which is why most AEO services are still selling audits instead of placements.
          </Body>
        </div>
      </section>

      {/* Section 2 — Two-pronged outcome */}
      <section style={{ background: "#F5F5F4" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H>One placement, two channels.</H>
          <Body>
            The same listicle placements that capture AI Overview citations are the highest-authority
            backlinks available — pages with real organic traffic in your exact niche carry
            significantly more ranking weight than generic high-DR placements without topical
            relevance. Every placement we secure does two jobs: gets the brand cited by AI, and pulls
            product pages up Google&apos;s traditional rankings. One campaign, two outcomes, same investment.
          </Body>
        </div>
      </section>

      {/* Section 3 — Campaign structure */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H>What we actually do.</H>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "2.5rem",
              marginTop: "1rem",
            }}
          >
            {[
              {
                heading: "Listicle placements on high-authority domains in your niche.",
                body: "Editorial placements where your brand is positioned as the top recommendation on merit — not paid promotion dressed up as editorial.",
              },
              {
                heading: "AEO-engineered on-site content.",
                body: "Money keywords get dedicated pages structured for AI Overview capture: question-format H2s, comparison tables, FAQ schema, opening paragraphs tuned to query phrasing.",
              },
              {
                heading: "Anchored authority transfer.",
                body: "Every external placement carries two contextual links — one to your homepage, one to the relevant on-site page — so authority flows where it converts.",
              },
            ].map(({ heading, body }) => (
              <div
                key={heading}
                style={{
                  background: "#F5F5F4",
                  borderRadius: "8px",
                  padding: "2rem",
                }}
              >
                <h3
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', Times, serif",
                    color: "#0D1B2A",
                    fontSize: "1.1rem",
                    lineHeight: 1.35,
                    marginBottom: "1rem",
                  }}
                >
                  {heading}
                </h3>
                <p style={{ color: "#3D3D3A", lineHeight: 1.7, fontSize: "0.9375rem" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Same-day proof */}
      <section style={{ background: "#F5F5F4" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H>We do this on demand.</H>
          <Body>
            The most recent placement we secured for a client went live in the morning. By that
            evening, Google&apos;s AI Overview was already pulling it to the top of the response — naming
            our client as Best Overall in their category. That kind of velocity isn&apos;t a side effect
            of traditional SEO. It&apos;s an engineered outcome. It only works when the placement is
            structured for AI consumption from the outset, on a domain the AI already considers
            authoritative, in a topic cluster the AI is already attempting to answer.
          </Body>
        </div>
      </section>

      {/* Section 5 — Comparison table */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H>How AlwaysCited compares.</H>
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
                      minWidth: "140px",
                    }}
                  >
                    &nbsp;
                  </th>
                  {["Traditional SEO", "Generic AEO services", "AlwaysCited"].map((col) => (
                    <th
                      key={col}
                      style={{
                        textAlign: "left",
                        padding: "0.75rem 1rem",
                        fontFamily: "Georgia, 'Times New Roman', Times, serif",
                        color: col === "AlwaysCited" ? "#D85A30" : "#0D1B2A",
                        fontWeight: "normal",
                        minWidth: "160px",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    row: "What you get",
                    cols: ["Rankings on Google", "An audit document", "Engineered AI citations + Google rankings"],
                  },
                  {
                    row: "Time to first result",
                    cols: ["3-6 months", "Indefinite", "1-4 weeks"],
                  },
                  {
                    row: "Channels moved",
                    cols: ["Google organic", "Reporting only", "Google + ChatGPT + AI Overview"],
                  },
                  {
                    row: "Pricing model",
                    cols: ["Monthly retainer", "One-off audit fee", "Performance-based retainer"],
                  },
                  {
                    row: "Proof points",
                    cols: ["Keyword rankings", "Slide deck", "Same-day AI citations"],
                  },
                ].map(({ row, cols }) => (
                  <tr
                    key={row}
                    style={{ borderBottom: "1px solid #B4B2A9" }}
                  >
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
                    {cols.map((cell, i) => (
                      <td
                        key={i}
                        style={{
                          padding: "1rem",
                          color: i === 2 ? "#0D1B2A" : "#5F5E5A",
                          fontWeight: i === 2 ? 500 : "normal",
                          background: i === 2 ? "#F5F5F4" : "transparent",
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
