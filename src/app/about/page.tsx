import type { Metadata } from "next";
import CtaSection from "@/components/CtaSection";

export const metadata: Metadata = {
  title: "About alwayscited | AI Citation Placements for Agencies",
  description:
    "alwayscited places brands inside the third-party articles AI engines cite, and tracks what happens next. We work mainly through agencies, white-labelled. A sub-brand of Nomada Digital.",
  alternates: { canonical: "https://alwayscited.com/about" },
  openGraph: {
    title: "About alwayscited | AI Citation Placements for Agencies",
    description:
      "We engineer brand visibility across AI search systems for B2B brands. A sub-brand of Nomada Digital — 5-star Google-reviewed B2B search agency, York, UK.",
    url: "https://alwayscited.com/about",
  },
};

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About alwayscited",
  description:
    "alwayscited places brands inside the third-party articles AI engines cite - Google AI Overviews, ChatGPT, Gemini and Perplexity - and tracks what happens next.",
  url: "https://alwayscited.com/about",
  publisher: {
    "@type": "Organization",
    name: "alwayscited",
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
            About alwayscited.
          </h1>
          <p style={{ color: "#b4c5d6", fontSize: "1.1rem", lineHeight: 1.6, maxWidth: "36rem" }}>
            We place brands inside the third-party articles AI engines cite, and we track what happens next.
          </p>
        </div>
      </section>

      {/* Section 1 — What alwayscited is */}
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
            What alwayscited is.
          </h2>
          <div style={{ maxWidth: "44rem" }}>
            <p style={{ color: "#3D3D3A", fontSize: "1.0625rem", lineHeight: 1.75, marginBottom: "1.25rem" }}>
              We place brands inside the third-party articles that AI engines cite, and we track
              what happens next. That is the whole product.
            </p>
            <p style={{ color: "#3D3D3A", fontSize: "1.0625rem", lineHeight: 1.75, marginBottom: "1.25rem" }}>
              We work mainly through agencies - the ones that earn coverage and the ones that build
              links, because the thing being measured is the same either way. Your clients are asking
              what you are doing about AI search, and most agencies do not yet have a fulfillment
              answer. We are that answer, white-labelled - our work, your brand on the report, no
              contact with your client at any point.
            </p>
            <p style={{ color: "#3D3D3A", fontSize: "1.0625rem", lineHeight: 1.75, marginBottom: "1.25rem", fontWeight: 600 }}>
              Why placements rather than a dashboard.
            </p>
            <p style={{ color: "#3D3D3A", fontSize: "1.0625rem", lineHeight: 1.75 }}>
              AI engines do not evaluate brands independently. They extract from content that
              already ranks and already gets read. Knowing you are not cited does not get you
              cited - so we go and change the source, then show you the sequence: where the page
              ranked before, where it ranks now, and the date the link went live.
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
            Built by Nomada Digital.
          </h2>
          <div style={{ maxWidth: "44rem" }}>
            <p style={{ color: "#3D3D3A", fontSize: "1.0625rem", lineHeight: 1.75, marginBottom: "1.25rem" }}>
              alwayscited is a sub-brand of{" "}
              <a
                href="https://nomadadigital.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#D85A30" }}
              >
                Nomada Digital
              </a>{" "}
, a B2B search agency in York, UK. Nomada has spent the last decade building organic
              visibility for B2B brands in competitive categories - financial services, SaaS,
              professional services and telecoms. alwayscited applies the same publisher network
              and editorial relationships to a new visibility channel: citation by AI.
            </p>
            <p style={{ color: "#3D3D3A", fontSize: "1.0625rem", lineHeight: 1.75 }}>
              We run this on our own clients before we sell it to anyone. That is also why the
              tracker exists.
            </p>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
