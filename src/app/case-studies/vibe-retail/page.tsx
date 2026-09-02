import type { Metadata } from "next";
import CtaSection from "@/components/CtaSection";

export const metadata: Metadata = {
  title: "Case Study: US Retail SaaS - AI Overview Top Citations in Under Eight Weeks",
  description:
    "How a US retail SaaS became the most cited cloud POS brand on AI search in under eight weeks. Three AI Overview top citations. Same-day citation engineering. Page-one Google rankings on the money keyword.",
  alternates: { canonical: "https://alwayscited.com/case-studies/vibe-retail" },
  openGraph: {
    title: "Case Study: US Retail SaaS - AI Overview Top Citations in Under Eight Weeks",
    description:
      "Three AI Overview top citations. 0 → 14% ChatGPT visibility in one week. #83 → #4 on the money keyword. Same-day citation engineering.",
    url: "https://alwayscited.com/case-studies/vibe-retail",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "How a US retail SaaS became the most cited cloud POS brand on AI search in under eight weeks",
  description:
    "A US retail SaaS went from zero AI search visibility to three AI Overview top citations, 14% ChatGPT brand visibility, and page-one Google rankings in under eight weeks through AlwaysCited's AEO campaign.",
  url: "https://alwayscited.com/case-studies/vibe-retail",
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
      fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)",
      lineHeight: 1.2,
      marginBottom: "1.5rem",
    }}
  >
    {children}
  </h2>
);

const H3 = ({
  children,
  coral,
}: {
  children: React.ReactNode;
  coral?: boolean;
}) => (
  <h3
    style={{
      fontFamily: "Georgia, 'Times New Roman', Times, serif",
      color: coral ? "#D85A30" : "#0D1B2A",
      fontSize: "1.2rem",
      lineHeight: 1.3,
      marginBottom: "0.75rem",
    }}
  >
    {children}
  </h3>
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

const ImagePlaceholder = ({ label }: { label: string }) => (
  // IMAGE: drop screenshot here before publication
  <div
    style={{
      aspectRatio: "16 / 9",
      border: "1px dashed #B4B2A9",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#F5F5F4",
      marginTop: "2rem",
      marginBottom: "2rem",
    }}
    aria-hidden="true"
  >
    <span style={{ color: "#5F5E5A", fontSize: "0.875rem" }}>{label}</span>
  </div>
);

export default function CaseStudyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Hero */}
      <section style={{ background: "linear-gradient(160deg, #0D1B2A 0%, #152636 100%)" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24 md:py-32">
          <p
            style={{
              color: "#D85A30",
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "1.25rem",
            }}
          >
            SaaS | B2B (Retail Technology)
          </p>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#ffffff",
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              lineHeight: 1.15,
              marginBottom: "1.25rem",
              maxWidth: "40rem",
            }}
          >
            How a US retail SaaS became the most cited cloud POS brand on AI search in under eight weeks.
          </h1>
          <p style={{ color: "#b4c5d6", fontSize: "1.1rem", lineHeight: 1.6, maxWidth: "38rem" }}>
            Three AI Overview top citations. Same-day citation engineering. Page-one Google rankings on the money keyword. One integrated campaign.
          </p>
        </div>
      </section>

      {/* Results snapshot */}
      <section style={{ background: "#F5F5F4" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-16">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {[
              { stat: "3", label: "AI Overview top citations on commercial-intent retail POS queries" },
              { stat: "0 → 14%", label: "ChatGPT brand visibility, one week of tracking" },
              { stat: "#83 → #4", label: "Movement on the client's primary money keyword" },
              { stat: "Same-day", label: "Time from listicle going live to AI Overview citing the brand as Best Overall" },
            ].map(({ stat, label }) => (
              <div
                key={stat}
                style={{ background: "#ffffff", borderRadius: "8px", padding: "1.75rem" }}
              >
                <p
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', Times, serif",
                    color: "#D85A30",
                    fontSize: stat.length > 5 ? "2.5rem" : "3.5rem",
                    lineHeight: 1,
                    marginBottom: "0.75rem",
                  }}
                >
                  {stat}
                </p>
                <p style={{ color: "#3D3D3A", fontSize: "0.875rem", fontWeight: 500 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Task 7 - denominator for the visibility percentage. Blocked on D5.
              Draft pending verification, do not publish as-is:
              "the share of tracked buyer prompts across ChatGPT, Gemini and
              Perplexity where the brand is named or cited, measured against a
              frozen prompt set." */}
          <p style={{ color: "#6B6B66", fontSize: "0.8125rem", lineHeight: 1.6, maxWidth: "44rem", marginTop: "1.5rem" }}>
            ChatGPT brand visibility: [[D5]]
          </p>
        </div>
      </section>

      {/* Goals */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H2>The goals.</H2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "2rem",
            }}
          >
            {[
              {
                heading: "AI search visibility",
                body: "Establish the brand as a default recommendation when retailers research POS platforms via Google's AI Overview and large language models.",
              },
              {
                heading: "Category authority",
                body: "Become the most-cited cloud-based retail POS brand in editorial \"best of\" placements that buyers and AI systems both rely on.",
              },
              {
                heading: "Commercial-intent traffic",
                body: "Convert AI search visibility into qualified organic traffic on commercial keywords, not just brand impressions.",
              },
            ].map(({ heading, body }) => (
              <div
                key={heading}
                style={{
                  borderLeft: "3px solid #D85A30",
                  paddingLeft: "1.5rem",
                }}
              >
                <H3>{heading}</H3>
                <Prose>{body}</Prose>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Challenge */}
      <section style={{ background: "#F5F5F4" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H2>The challenge.</H2>
          <Prose>
            When the client engaged AlwaysCited, they had a strong product but no organic
            footprint. Launched in late 2025, the site was effectively invisible across both
            traditional search and the emerging AI-driven discovery layer. Competitive visibility
            for &ldquo;cloud based POS&rdquo; and &ldquo;retail POS&rdquo; queries was dominated by entrenched names with
            a decade of authority - Lightspeed, Shopify POS, Square, Clover. The challenge was
            clear: build search authority from scratch in a competitive SaaS category, and
            simultaneously establish the brand as one that LLMs and Google&apos;s AI Overview would
            cite - at a moment when most B2B buyers now research through AI before clicking
            anything.
          </Prose>
          <div
            style={{
              marginTop: "2rem",
              padding: "1.5rem 2rem",
              background: "#ffffff",
              borderRadius: "8px",
            }}
          >
            <p
              style={{
                fontFamily: "Georgia, 'Times New Roman', Times, serif",
                color: "#0D1B2A",
                fontSize: "0.875rem",
                fontWeight: "normal",
                marginBottom: "0.5rem",
              }}
            >
              Client background
            </p>
            <p style={{ color: "#5F5E5A", fontSize: "0.9375rem", lineHeight: 1.7 }}>
              A US-based SaaS platform serving independent and multi-location retailers across the
              US. Their cloud-based POS system is built specifically for retail workflows -
              inventory management, multi-store operations, barcoding, integrated payment
              processing - rather than adapted from a hospitality or general-purpose platform.
            </p>
          </div>
        </div>
      </section>

      {/* Strategy */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H2>The strategy.</H2>

          <div style={{ marginBottom: "3rem" }}>
            <H3>AEO strategy: Engineering AI Overview and LLM citations on demand.</H3>
            <Prose>
              Most &ldquo;AEO&rdquo; services on the market today are SEO repackaged with new terminology. We
              took a different angle: identifying the specific content patterns that LLMs and
              Google&apos;s AI Overview consistently cite, and engineering a campaign that targeted them
              deliberately. The pattern: LLMs and AI Overviews lean heavily on up-to-date &ldquo;best
              of&rdquo; listicles published on high-authority domains. When a buyer asks ChatGPT or
              Google&apos;s AI Overview &ldquo;what&apos;s the best retail POS system?&rdquo; the AI doesn&apos;t
              independently evaluate platforms - it cites a ranked list from a publication it
              considers authoritative.
            </Prose>
            <br />
            <Prose>
              This produces a deliberate two-pronged outcome. The same listicle placements that
              capture AI Overview citations are the highest-authority backlinks money can buy -
              pages with real organic traffic in the client&apos;s exact niche carry significantly more
              ranking weight than generic high-DR placements. Every listicle does two jobs: gets
              the brand cited by AI search, and pulls product pages up Google&apos;s traditional
              rankings.
            </Prose>
            <ul
              style={{
                marginTop: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                listStyle: "none",
                padding: 0,
              }}
            >
              {[
                {
                  heading: "Listicle placement strategy.",
                  body: "We leveraged our network of editorial publishers to secure \"best of\" listicles on high-DA retail and ecommerce publications, where the client was positioned as the top-ranked cloud POS provider on merit.",
                },
                {
                  heading: "AEO-structured on-site content.",
                  body: "Each money keyword received a dedicated on-site piece engineered for AI Overview capture: question-format H2s, comparison tables, structured FAQ schema, and opening paragraphs tuned to match the exact phrasing of the target query.",
                },
                {
                  heading: "Anchored authority transfer.",
                  body: "Every external placement carried two contextual links - one to the homepage, one to the relevant on-site cluster page - ensuring authority flowed into the pages designed to convert.",
                },
              ].map(({ heading, body }) => (
                <li
                  key={heading}
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: "#D85A30",
                      fontSize: "1.25rem",
                      lineHeight: 1,
                      flexShrink: 0,
                      marginTop: "0.2rem",
                    }}
                  >
                    →
                  </span>
                  <p style={{ color: "#3D3D3A", lineHeight: 1.7, fontSize: "0.9375rem" }}>
                    <strong
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', Times, serif",
                        color: "#0D1B2A",
                        fontWeight: "normal",
                      }}
                    >
                      {heading}
                    </strong>{" "}
                    {body}
                  </p>
                </li>
              ))}
            </ul>
            <br />
            <Prose>
              The strongest evidence that this playbook works on demand: the most recent listicle we
              placed went live in the morning, and Google&apos;s AI Overview was citing it as the top
              source by that same evening - naming the client as Best Overall in their category.
              That&apos;s not a side effect of traditional SEO. That&apos;s an engineered outcome.
            </Prose>
          </div>

          <div>
            <H3>SEO strategy: Topical clusters built for retail buyers.</H3>
            <Prose>
              Alongside the AEO play, we built out a content cluster strategy mapping product
              features to retail verticals - pairing capabilities like inventory management and
              multi-location operations with the specific industries the client serves. Each cluster
              article reinforced topical authority and created additional surfaces for AI citation.
            </Prose>
          </div>
        </div>
      </section>

      {/* Business impact */}
      <section style={{ background: "#F5F5F4" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H2>The business impact.</H2>

          {/* Impact 1 */}
          <div style={{ marginBottom: "4rem" }}>
            <H3 coral>Top-cited brand across Google&apos;s AI Overview on three commercial queries.</H3>
            <Prose>
              The client is now the top recommendation inside Google&apos;s AI Overview for three of the
              highest-intent buyer queries in the category:
            </Prose>
            <ul
              style={{
                marginTop: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                listStyle: "none",
                padding: 0,
              }}
            >
              {[
                {
                  query: '"best retail pos systems"',
                  result: 'named Best Overall, ahead of Shopify POS, Lightspeed, Square, and KORONA',
                },
                {
                  query: '"best pos system for retail 2026"',
                  result: 'featured as Rated best for growing retailers',
                },
                {
                  query: '"pos systems with inventory management 2026"',
                  result: 'named Best Overall POS with Inventory Management for 2026',
                },
              ].map(({ query, result }) => (
                <li
                  key={query}
                  style={{
                    background: "#ffffff",
                    borderRadius: "8px",
                    padding: "1.25rem 1.5rem",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: "#D85A30",
                      flexShrink: 0,
                      fontSize: "1.1rem",
                      marginTop: "0.1rem",
                    }}
                  >
                    ✓
                  </span>
                  <p style={{ color: "#3D3D3A", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                    <strong style={{ color: "#0D1B2A" }}>{query}</strong> - {result}
                  </p>
                </li>
              ))}
            </ul>
            <p
              style={{
                color: "#5F5E5A",
                fontSize: "0.9375rem",
                lineHeight: 1.7,
                marginTop: "1.5rem",
                maxWidth: "44rem",
              }}
            >
              The third citation appeared inside Google&apos;s AI Overview the same day the supporting
              listicle went live. That kind of citation velocity isn&apos;t accidental - it&apos;s only
              possible when the underlying placement is engineered for AI consumption from the outset.
            </p>

            {/* IMAGE PLACEHOLDER: AI Overview screenshots */}
            {/* IMAGE: drop AI Overview screenshot here before publication */}
            <ImagePlaceholder label="AI Overview screenshots - three citations" />
          </div>

          {/* Impact 2 */}
          <div style={{ marginBottom: "4rem" }}>
            <H3 coral>Direct keyword ranking gains from the same placements.</H3>
            <Prose>
              Because the listicle placements driving AI Overview citations are themselves
              high-authority editorial pages with real organic traffic in the retail POS niche, the
              contextual links they carry pass significant authority directly to product and cluster
              pages. The same placements that won the AI Overview citations also pulled the
              client&apos;s core money keyword from position{" "}
              <strong style={{ color: "#0D1B2A" }}>#83 to #4</strong> on Google for &ldquo;cloud based pos
              system for retail,&rdquo; with eleven additional commercial-intent variations now ranking
              between positions 4 and 17. One investment, two channels moved.
            </Prose>
          </div>

          {/* Impact 3 */}
          <div>
            <H3 coral>0 to 14% ChatGPT brand visibility in one week.</H3>
            <Prose>
              Across the tracked prompt set, the client&apos;s ChatGPT mention rate climbed from 0% to
              14% in seven days. On the highest-intent prompts - &ldquo;cloud retail POS system
              comparison&rdquo; and &ldquo;top cloud-based POS systems for retail stores with inventory
              management&rdquo; - the brand now achieves{" "}
              <strong style={{ color: "#0D1B2A" }}>100% visibility</strong>, mentioned in every AI
              response.
            </Prose>
          </div>
        </div>
      </section>

      {/* Testimonial placeholder */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-16">
          {/* CLIENT TESTIMONIAL - to be confirmed before publication */}
          <blockquote
            style={{
              borderLeft: "3px solid #D85A30",
              paddingLeft: "2rem",
              maxWidth: "44rem",
            }}
          >
            <p
              style={{
                fontFamily: "Georgia, 'Times New Roman', Times, serif",
                color: "#5F5E5A",
                fontSize: "1.1rem",
                lineHeight: 1.7,
                fontStyle: "italic",
              }}
            >
              [Client testimonial - to be confirmed before publication]
            </p>
          </blockquote>
        </div>
      </section>

      {/* SEO Impact */}
      <section style={{ background: "#F5F5F4" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <H2>The SEO impact.</H2>

          <div style={{ marginBottom: "3rem" }}>
            <H3>Performance summary.</H3>
            <p
              style={{
                color: "#3D3D3A",
                fontSize: "1.0625rem",
                lineHeight: 1.75,
                maxWidth: "44rem",
                marginBottom: "1.5rem",
              }}
            >
              17 high-intent retail POS terms now ranking on page 1 or 2. 81 additional keywords
              newly ranking from unranked status. Average position across the tracked keyword set
              improved by 26.4 places. Monthly organic traffic up to 137 sessions on the cloud POS
              cluster. Traffic value up to $1,300/month from zero in the same window.
            </p>

            {/* IMAGE PLACEHOLDER: Ahrefs traffic chart */}
            {/* IMAGE: drop Ahrefs traffic chart here before publication */}
            <ImagePlaceholder label="Ahrefs traffic chart" />
          </div>

          <div style={{ marginBottom: "3rem" }}>
            <H3>AI search and brand visibility.</H3>
            <p style={{ color: "#3D3D3A", fontSize: "1.0625rem", lineHeight: 1.75, maxWidth: "44rem" }}>
              The client is now the top-cited cloud POS brand inside Google&apos;s AI Overview for three
              separate high-intent queries. ChatGPT visibility: 100% on the highest-intent
              comparison queries, 75% on broader cloud POS questions.
            </p>
          </div>

          <div>
            <H3>Keyword movement.</H3>
            <ul
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                listStyle: "none",
                padding: 0,
                marginBottom: "2rem",
              }}
            >
              {[
                { kw: "cloud based pos system for retail", move: "#83 → #4 (+79)" },
                { kw: "multi-location retail pos", move: "#13 → #3 (+10)" },
                { kw: "cloud pos for multi-location retail", move: "#39 → #15 (+24)" },
                { kw: "cloud based retail pos, cloud retail pos, cloud pos retail, cloud retail pos software, cloud based pos systems for retail", move: "all newly ranking inside the top 10" },
                { kw: "cloud based pos system, cloud based pos systems, cloud pos software", move: "newly ranking on page 2 with strong upward trajectory" },
              ].map(({ kw, move }) => (
                <li
                  key={kw}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "2rem",
                    padding: "0.875rem 1.25rem",
                    background: "#ffffff",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "#3D3D3A", flex: "1 1 200px" }}>{kw}</span>
                  <span
                    style={{
                      color: "#D85A30",
                      fontWeight: 600,
                      fontFamily: "Georgia, 'Times New Roman', Times, serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {move}
                  </span>
                </li>
              ))}
            </ul>

            {/* IMAGE PLACEHOLDER: Ahrefs keyword movement table */}
            {/* IMAGE: drop Ahrefs keyword movement table here before publication */}
            <ImagePlaceholder label="Ahrefs keyword movement table" />
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
