import type { Metadata } from "next";
import DarkTrustFlow from "@/components/DarkTrustFlow";
import DarkComparisonSection from "@/components/DarkComparisonSection";
import SectorPricing from "@/components/SectorPricing";
import HeroSection from "@/components/scan/HeroSection";
import ScanChecker from "@/components/scan/ScanChecker";
import TierName from "@/components/TierName";
import { CONTACT_URL } from "@/config/pricing";

export const metadata: Metadata = {
  title: "LLM Visibility Checker | alwayscited",
  description:
    "Check whether AI engines name your client. Run a free scan to see who Google AI Overviews and ChatGPT cite for a topic, then get placed in those sources. White-labelled for agencies, prices on the page.",
  alternates: { canonical: "https://alwayscited.com" },
  openGraph: {
    title: "LLM Visibility Checker | alwayscited",
    description: "Check whether AI engines name your client. Free scan, then white-label placements in the sources they cite. Prices on the page.",
    url: "https://alwayscited.com",
  },
};

/* ── design tokens ── */
const C = {
  navy: "#0B1220",
  purple: "#7C3AED",
  purpleLight: "#A855F7",
  body: "#4B5563",
  soft: "#F8F7FF",
  border: "#E5E7EB",
  white: "#ffffff",
};

const grad: React.CSSProperties = {
  background: `linear-gradient(135deg, ${C.purple} 0%, ${C.purpleLight} 100%)`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const wrap: React.CSSProperties = { maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" };

/* ── shared label badge ── */
function SectionLabel({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      background: dark ? "rgba(168,85,247,0.15)" : "rgba(124,58,237,0.08)",
      border: `1px solid ${dark ? "rgba(168,85,247,0.3)" : "rgba(124,58,237,0.2)"}`,
      borderRadius: "999px",
      padding: "0.25rem 0.875rem",
      fontSize: "0.75rem",
      fontWeight: 600,
      color: dark ? "#A855F7" : C.purple,
      marginBottom: "1.25rem",
    }}>
      {text}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */

export default function HomePage() {
  return (
    <>
      <HeroSection />

      {/* ═══ DARK INSIGHT - why it works ════════════════════════ */}
      <section id="why-it-works" style={{ background: C.navy, padding: "6rem 1.5rem", position: "relative", overflow: "hidden" }}>
        <div className="gradient-orb" style={{ position: "absolute", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", top: "-150px", left: "-100px", pointerEvents: "none" }} aria-hidden="true" />

        <div style={{ ...wrap, textAlign: "center", position: "relative" }}>
          <SectionLabel text="The problem" dark />

          <h2 style={{
            fontWeight: 800,
            fontSize: "clamp(2rem, 4vw, 3rem)",
            color: C.white,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginBottom: "1.25rem",
          }}>
            Your clients are{" "}
            <span style={grad}>invisible to AI.</span>
          </h2>

          <p style={{
            color: "#9CA3AF", fontSize: "clamp(0.9375rem, 1.5vw, 1.0625rem)",
            lineHeight: 1.7, maxWidth: "580px", margin: "0 auto 3.5rem",
          }}>
            ChatGPT, Gemini, Perplexity and Google AI Overviews do not discover brands from homepages or ad campaigns. They extract from third-party content they already trust. If your client is not inside those sources, they do not exist in an AI answer.
          </p>

          <DarkTrustFlow />
        </div>
      </section>

      {/* ═══ DARK COMPARISON ══════════════════════════════════════ */}
      <section style={{ background: C.navy, padding: "6rem 1.5rem", position: "relative", overflow: "hidden" }}>
        <div className="gradient-orb" style={{ position: "absolute", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)", bottom: "-100px", right: "-80px", pointerEvents: "none", animationDelay: "-10s" }} aria-hidden="true" />

        <div style={{ ...wrap, position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <SectionLabel text="The alternative" dark />
            <h2 style={{
              fontWeight: 800, fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
              color: C.white, lineHeight: 1.1, letterSpacing: "-0.03em",
            }}>
              Measurement is where most tools stop.
            </h2>
            <p style={{ color: "#9CA3AF", fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: "620px", margin: "0 auto" }}>
              Ours is where the work starts. The same scan that shows you are not cited also shows which sources are - and we can place you in them.
            </p>
          </div>

          <DarkComparisonSection />
        </div>
      </section>

      {/* ═══ PRICING - four tiers (Tasks 3, 4) ══════════════════ */}
      <section id="pricing" style={{ padding: "6rem 1.5rem" }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <SectionLabel text="Pricing" />
          <h2 style={{
            fontWeight: 800, fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)",
            color: C.navy, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1rem",
          }}>
            The packages.
          </h2>

          {/* Task 5 - replaces the retainer-hostile line */}
          <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.65, maxWidth: "520px", margin: "0 auto 1.5rem" }}>
            Prices on the page. Order when you want it, and no scoping call to find out what it costs. Each package links through to exactly what is included.
          </p>

          {/* Task 3 - per-keyword framing above the table */}
          <p style={{ color: C.body, fontSize: "0.9375rem", lineHeight: 1.7, maxWidth: "560px", margin: "0 auto 3rem" }}>
            Pricing is per target topic. You name the topic, we build the question set buyers actually ask around it - the longer-tail questions people use when they are choosing a provider.
          </p>

          <SectorPricing />

        </div>
      </section>

      {/* ═══ PROOF / CASE STUDIES ════════════════════════════════ */}
      <section id="proof" style={{ padding: "6rem 1.5rem" }}>
        <div style={wrap}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <SectionLabel text="Results" />
            <h2 style={{
              fontWeight: 800, fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
              color: C.navy, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1rem",
            }}>
              One placement, one morning.
            </h2>
            <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.65, maxWidth: "500px", margin: "0 auto" }}>
              One campaign. One placement. The compounding effect measured over six months.
            </p>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2.5rem" }}
            className="stack-mobile"
          >
            {/* Facts only. The illustrative six-month chart and the three
                illustrative citation cards were cut: real numbers next to
                illustrative ones make the real ones look illustrative. */}
            <div style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 2px 16px rgba(11,18,32,0.07)",
            }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: C.purple, marginBottom: "0.375rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Vibe Retail · US retail SaaS · eight weeks
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {[
                  { label: "Money keyword", val: "#83 to #4" },
                  { label: "AI visibility across the full question set", val: "0% to 25%" },
                  { label: "AI Overview citations on commercial questions", val: "3" },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    style={{
                      display: "grid", gridTemplateColumns: "1fr auto", gap: "1.5rem",
                      alignItems: "baseline", padding: "0.875rem 0",
                      borderTop: `1px solid ${C.border}`,
                    }}
                  >
                    <span style={{ fontSize: "0.9375rem", color: C.body }}>{label}</span>
                    <span style={{ fontSize: "1.125rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.02em" }}>{val}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "0.9375rem", color: C.navy, lineHeight: 1.7, marginTop: "1.5rem", fontWeight: 500 }}>
                The listicle went live in the morning. By that evening Google&apos;s AI Overview was citing it as the top source for the category.
              </p>
              <a
                href="/case-studies/vibe-retail"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: C.purple, fontWeight: 600, fontSize: "0.9375rem", textDecoration: "none", marginTop: "1.25rem" }}
              >
                Read the full case study
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quote */}
          <div style={{
            background: C.navy,
            borderRadius: "20px",
            padding: "2.5rem",
            textAlign: "center",
          }}>
            <p style={{
              fontSize: "clamp(1.125rem, 2vw, 1.375rem)",
              color: C.white,
              fontWeight: 600,
              lineHeight: 1.55,
              letterSpacing: "-0.01em",
              maxWidth: "680px",
              margin: "0 auto 1rem",
            }}>
              &ldquo;The goal is not to get a link. The goal is to be inside the source that the buyer, Google, and AI all agree to trust.&rdquo;
            </p>
            <p style={{ fontSize: "0.8125rem", color: "#6B7280" }}>- alwayscited methodology</p>
          </div>

          {/* 2.8 - the case study's best finding belongs on the homepage */}
          <div style={{
            background: C.soft,
            border: `1px solid ${C.border}`,
            borderRadius: "20px",
            padding: "2rem",
            marginTop: "1.5rem",
            textAlign: "center",
          }}>
            <p style={{ fontSize: "clamp(1rem, 1.6vw, 1.125rem)", color: C.navy, fontWeight: 600, lineHeight: 1.6, maxWidth: "640px", margin: "0 auto 1.25rem" }}>
              On one US retail SaaS campaign, the listicle went live in the morning and Google&apos;s AI Overview was citing it as the top source by that evening.
            </p>
            <a
              href="/case-studies/vibe-retail"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: C.purple, fontWeight: 600, fontSize: "0.9375rem", textDecoration: "none" }}
            >
              Read the full case study
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

          {/* Task 9 - provenance. Shipped without client names pending D7. */}
          <p style={{ textAlign: "center", fontSize: "0.875rem", color: C.body, marginTop: "2rem", lineHeight: 1.65 }}>
            alwayscited is built and run by the senior team at{" "}
            <a href="https://nomadadigital.co.uk" target="_blank" rel="noopener noreferrer" style={{ color: C.purple, fontWeight: 600, textDecoration: "none" }}>
              Nomada Digital
            </a>
            .
          </p>
        </div>
      </section>

      {/* ═══ WHITE-LABEL AND NON-POACH (Task 6) ═════════════════ */}
      <section style={{ padding: "0 1.5rem 6rem" }}>
        <div style={{ ...wrap, maxWidth: "760px" }}>
          <div style={{
            background: C.navy,
            borderRadius: "24px",
            padding: "2.75rem 2.5rem",
            position: "relative",
            overflow: "hidden",
          }}>
            <div className="gradient-orb" style={{ position: "absolute", width: "420px", height: "420px", background: "radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 70%)", top: "-150px", right: "-110px", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ position: "relative" }}>
              <h2 style={{
                fontWeight: 800,
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                color: C.white,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                marginBottom: "1rem",
              }}>
                Your brand on everything the client sees.
              </h2>
              <p style={{ color: "#9CA3AF", fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: "580px" }}>
                The tracker, the monthly report, the placement records - your logo, not ours. We never contact your client. No calls, no emails, no name on the report. That is in the partner agreement, not just on this page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ══════════════════════════════════════════════════ */}
      <section id="faq" style={{ padding: "6rem 1.5rem", background: C.soft }}>
        <div style={{ ...wrap, maxWidth: "680px" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <SectionLabel text="FAQ" />
            <h2 style={{ fontWeight: 800, fontSize: "clamp(1.75rem, 3vw, 2.375rem)", color: C.navy, letterSpacing: "-0.02em" }}>
              Common questions
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {[
              {
                q: "What is the free scan based on?",
                a: "Google AI Overview and ChatGPT mention data, aggregated across the questions buyers ask about a topic. It runs no live model calls, which is why the one-off scan is free and fast. Ongoing readings are part of a paid plan.",
              },
              {
                q: "Do I need links, or do mentions count?",
                a: "Mentions count. Most citations we see come from coverage with no link in it at all. Links do a different job - they move rankings. The tracker reports which one happened.",
              },
              {
                q: "Will you approach our clients?",
                a: "No. We have no contact with your client at any point - no calls, no emails, no name on the report. That is in the partner agreement, not just on this page.",
              },
              {
                q: "What does the client see?",
                a: "Your brand. The tracker, the monthly report and the placement records all carry your logo.",
              },
              {
                q: "Can I cancel?",
                a: "Monthly, no notice period. Placements already commissioned are delivered.",
              },
              {
                q: "Is this for PR or SEO?",
                a: "Both. The thing being measured is the same either way - an off-site mention or link, and whether you are present in the sources that decide the answer.",
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                style={{
                  borderBottom: `1px solid ${C.border}`,
                  padding: "1.25rem 0",
                }}
              >
                <summary style={{
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  color: C.navy,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                }}>
                  {q}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M4 6l4 4 4-4" stroke={C.purple} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <p style={{ color: C.body, fontSize: "0.875rem", lineHeight: 1.7, paddingTop: "0.875rem" }}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DARK CTA ════════════════════════════════════════════ */}
      <section style={{ background: C.navy, padding: "6rem 1.5rem", position: "relative", overflow: "hidden" }}>
        <div className="gradient-orb" style={{ position: "absolute", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)", top: "-150px", left: "-100px", pointerEvents: "none" }} aria-hidden="true" />
        <div className="gradient-orb" style={{ position: "absolute", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", bottom: "-100px", right: "-80px", pointerEvents: "none", animationDelay: "-15s" }} aria-hidden="true" />

        <div
          style={{ ...wrap, maxWidth: "640px", textAlign: "center", position: "relative" }}
        >
          <div>
            <h2 style={{
              fontWeight: 800,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: C.white,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: "1.25rem",
            }}>
              Ready to become the brand{" "}
              <span style={grad}>AI recommends?</span>
            </h2>
            <p style={{ color: "#9CA3AF", fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "2.5rem" }}>
              Start with a scan. It takes a minute, it is free, and it tells you exactly which sources decide your client&apos;s category.
            </p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
              <div style={{ background: C.white, borderRadius: "20px", padding: "1.75rem", textAlign: "left" }}>
                <ScanChecker compact />
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
              <a
                href={CONTACT_URL}
                style={{
                  display: "inline-block",
                  background: "transparent",
                  color: C.white,
                  padding: "0.875rem 2rem",
                  borderRadius: "12px",
                  fontWeight: 600,
                  fontSize: "1rem",
                  textDecoration: "none",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                }}
              >
                Book a partner call
              </a>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
