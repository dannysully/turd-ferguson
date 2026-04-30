import type { Metadata } from "next";
import CtaSection from "@/components/CtaSection";

export const metadata: Metadata = {
  title: "About AlwaysCited — The AI Search Agency",
  description:
    "AlwaysCited is a focused AI Search agency. We engineer brand visibility across Google's AI Overview, ChatGPT, Perplexity, and other LLMs for B2B brands. A sub-brand of Nomada Digital.",
  alternates: { canonical: "https://alwayscited.com/about" },
  openGraph: {
    title: "About AlwaysCited | The AI Search Agency",
    description:
      "We engineer brand visibility across AI search systems for B2B brands. A sub-brand of Nomada Digital — 5-star Google-reviewed B2B search agency, York, UK.",
    url: "https://alwayscited.com/about",
  },
};

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About AlwaysCited",
  description:
    "AlwaysCited is a focused AI Search agency. We engineer brand visibility across AI search systems — Google's AI Overview, ChatGPT, Perplexity, Claude, and other LLMs — for B2B brands.",
  url: "https://alwayscited.com/about",
  publisher: {
    "@type": "Organization",
    name: "AlwaysCited",
    url: "https://alwayscited.com",
    parentOrganization: {
      "@type": "Organization",
      name: "Nomada Digital",
      url: "https://nomadadigital.co.uk",
    },
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />

      {/* Hero */}
      <section style={{ background: "linear-gradient(160deg, #0D1B2A 0%, #152636 100%)" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24 md:py-32">
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#ffffff",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              lineHeight: 1.15,
              marginBottom: "1.25rem",
            }}
          >
            About AlwaysCited.
          </h1>
          <p style={{ color: "#b4c5d6", fontSize: "1.1rem", lineHeight: 1.6, maxWidth: "36rem" }}>
            The AI Search Agency for B2B brands that want to be cited by AI when their buyers ask.
          </p>
        </div>
      </section>

      {/* Section 1 — What AlwaysCited is */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#0D1B2A",
              fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)",
              lineHeight: 1.2,
              marginBottom: "1.5rem",
            }}
          >
            What AlwaysCited is.
          </h2>
          <div style={{ maxWidth: "44rem" }}>
            <p style={{ color: "#3D3D3A", fontSize: "1.0625rem", lineHeight: 1.75, marginBottom: "1.25rem" }}>
              AlwaysCited is a focused AI Search agency. We do one thing: we engineer brand
              visibility across AI search systems — Google&apos;s AI Overview, ChatGPT, Perplexity,
              Claude, and other LLMs — for B2B brands whose buyers research through AI before
              clicking any traditional search result.
            </p>
            <p style={{ color: "#3D3D3A", fontSize: "1.0625rem", lineHeight: 1.75 }}>
              We don&apos;t sell AEO audits. We don&apos;t run generic SEO retainers and call them AEO. We
              secure the editorial placements that get our clients cited by AI, and we engineer the
              on-site content that supports those placements. The result is brand visibility on the
              surfaces where buying decisions actually happen — in under eight weeks, on a
              performance-linked retainer.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 — Powered by Nomada Digital */}
      <section style={{ background: "#F5F5F4" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#0D1B2A",
              fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)",
              lineHeight: 1.2,
              marginBottom: "1.5rem",
            }}
          >
            Powered by Nomada Digital.
          </h2>
          <div style={{ maxWidth: "44rem" }}>
            <p style={{ color: "#3D3D3A", fontSize: "1.0625rem", lineHeight: 1.75, marginBottom: "1.25rem" }}>
              AlwaysCited is a sub-brand of{" "}
              <a
                href="https://nomadadigital.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#D85A30" }}
              >
                Nomada Digital
              </a>{" "}
              — a 5-star Google-reviewed B2B search agency in York, UK. Nomada has spent the last
              decade building organic visibility for brands that previously couldn&apos;t compete on
              Google: Hitachi Capital, Devyce, Volunteero, Xpatfone, and others. AlwaysCited is
              the AI Search-specific offering, applying the same publisher network and editorial
              relationships that drove those clients to page 1 of Google to a new visibility
              channel — citation by AI.
            </p>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
