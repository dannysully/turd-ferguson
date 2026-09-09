import type { Metadata } from "next";
import DarkTrustFlow from "@/components/DarkTrustFlow";
import DarkComparisonSection from "@/components/DarkComparisonSection";
import SectorPricing from "@/components/SectorPricing";
import ScanForm from "@/components/ScanForm";
import TierName from "@/components/TierName";
import { CONTACT_URL } from "@/config/pricing";

export const metadata: Metadata = {
  title: "White-Label AI Citation Placements for Agencies | alwayscited",
  description:
    "White-label AI citation placements for agencies. Track the coverage and links you have already earned free, then buy placements in the third-party articles AI engines cite. Prices on the page.",
  alternates: { canonical: "https://alwayscited.com" },
  openGraph: {
    title: "White-Label AI Citation Placements for Agencies | alwayscited",
    description: "White-label AI citation placements for agencies. Free placement tracking, four tiers, prices on the page.",
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

/* ── listicle article mockup ── */
function ListicleMockup() {
  const items = [
    { text: "Competitor A - enterprise scale, deep integrations", highlighted: false },
    { text: "Your client - best for [their differentiator]", highlighted: true },
    { text: "Competitor B - budget-friendly, good for early-stage", highlighted: false },
    { text: "Competitor C - strong for technical SEO workflows", highlighted: false },
  ];

  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: "20px",
      padding: "1.5rem",
      boxShadow: "0 4px 28px rgba(11,18,32,0.09)",
      maxWidth: "440px",
    }}>
      {/* Browser chrome */}
      <div style={{
        background: "#F3F4F6",
        borderRadius: "8px",
        padding: "0.5rem 0.75rem",
        marginBottom: "1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}>
        <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
          {["#EF4444", "#F59E0B", "#22C55E"].map((c) => (
            <div key={c} style={{ width: "8px", height: "8px", borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div style={{
          flex: 1,
          background: C.white,
          borderRadius: "4px",
          padding: "0.2rem 0.625rem",
          fontSize: "0.65rem",
          color: "#9CA3AF",
        }}>
          roundup.com/best-[category]-platforms-2026
        </div>
      </div>

      {/* Article header */}
      <p style={{ fontSize: "0.65rem", color: "#9CA3AF", marginBottom: "0.375rem" }}>
        roundup.com · cited by the engines for this topic · 3,400 monthly visitors
      </p>
      <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: C.navy, marginBottom: "1.125rem", lineHeight: 1.3 }}>
        Best [Category] Platforms for 2026
      </p>

      {/* List items */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {items.map(({ text, highlighted }) => (
          <div
            key={text}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
              padding: "0.5rem 0.625rem",
              borderRadius: "9px",
              background: highlighted ? "rgba(124,58,237,0.06)" : "transparent",
              border: highlighted ? "1px solid rgba(124,58,237,0.18)" : "1px solid transparent",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ marginTop: "2px", flexShrink: 0 }}>
              <circle cx="7" cy="7" r="6" stroke={highlighted ? C.purple : "#D1D5DB"} strokeWidth="1.5" />
              <path d="M4.5 7l2 2 3-3" stroke={highlighted ? C.purple : "#D1D5DB"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{
              fontSize: "0.75rem",
              color: highlighted ? C.navy : "#6B7280",
              fontWeight: highlighted ? 600 : 400,
              lineHeight: 1.5,
            }}>
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}




/* ══════════════════════════════════════════════════════════════ */

export default function HomePage() {
  return (
    <>
      {/* ═══ HERO ═══════════════════════════════════════════════ */}
      <section id="scan" style={{ padding: "5.5rem 1.5rem 4rem", position: "relative", overflow: "hidden" }}>
        {/* Ambient glow */}
        <div
          className="gradient-orb"
          style={{
            position: "absolute", width: "700px", height: "700px",
            background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)",
            top: "-250px", right: "-150px", pointerEvents: "none",
          }}
          aria-hidden="true"
        />

        <div style={{ ...wrap, maxWidth: "760px", position: "relative" }}>
          <SectionLabel text="For SEO and PR agencies" />

          <h1 style={{
            fontWeight: 800,
            fontSize: "clamp(2.25rem, 4.5vw, 3.375rem)",
            color: C.navy,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            marginBottom: "1.375rem",
          }}>
            Be the brand <span style={grad}>AI recommends.</span>
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 1.5vw, 1.125rem)",
            color: C.body,
            lineHeight: 1.7,
            marginBottom: "2rem",
            maxWidth: "540px",
          }}>
            Start by finding out whether your client already is. Enter their domain.
          </p>

          <ScanForm />

          <p style={{ fontSize: "0.8125rem", color: "#9CA3AF", marginTop: "1.25rem" }}>
            Free. No card, no account.
          </p>
        </div>
      </section>

      {/* ═══ FREE TOOL - primary conversion path (Task 2) ═══════ */}
      <section id="free-tool" style={{ padding: "5rem 1.5rem", background: C.soft }}>
        <div style={wrap}>
          <div style={{ maxWidth: "680px", marginBottom: "3rem" }}>
            <SectionLabel text="Free forever, launching soon" />
            <h2 style={{
              fontWeight: 800, fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)",
              color: C.navy, lineHeight: 1.12, letterSpacing: "-0.03em", marginBottom: "1.25rem",
            }}>
              One scan. Three things most agencies have never seen.
            </h2>
            <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>
              Enter a client domain and their category. We build the questions their buyers ask, run them, and show you where your client sits against competitors - and which sources the engines drew on to answer. Then upload the coverage you have already earned and see which pieces are doing the work.
            </p>
            <p style={{ color: C.body, fontSize: "0.9375rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>
              AI Overview history goes back to August 2025, so you see a trend on day one rather than an empty chart. Where an engine has no history, we say so instead of drawing a line.
            </p>
            <p style={{ color: C.navy, fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1.65, marginBottom: "1.75rem" }}>
              Free, no card, no expiry.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
              
              <a
                href="/alwaystracked"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                  color: C.navy, fontWeight: 600, fontSize: "1rem",
                  textDecoration: "none", padding: "0.875rem 0",
                }}
              >
                How it works
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>

          {/* Three points */}
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}
            className="stack-mobile"
          >
            {[
              {
                title: "Who the engines name",
                body: "Every brand Google AI Overviews and ChatGPT mention when buyers ask about your client's topic, ranked by share of voice, with history back to August 2025.",
              },
              {
                title: "What they drew on to say it",
                body: "The exact sources cited in those answers, ranked by how often. This is the list that decides whether your client exists in an AI answer.",
              },
              {
                title: "Which of your coverage is in that list",
                body: "Upload a campaign's coverage and we match it URL for URL against the cited sources. The pieces doing the work, the pieces doing nothing, and the sources you are not in yet.",
              },
            ].map(({ title, body }) => (
              <div
                key={title}
                className="card-hover"
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: "16px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 12px rgba(11,18,32,0.05)",
                }}
              >
                <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: C.navy, marginBottom: "0.5rem" }}>
                  {title}
                </p>
                <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.7, marginTop: "1.5rem", maxWidth: "620px" }}>
            If we did not measure it, the field is blank. We never fill a gap with a model, and anything illustrative on this site is labelled as such.
          </p>
        </div>
      </section>

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

          <div className="dark-trust-flow">
            <DarkTrustFlow />
          </div>
        </div>
      </section>

      {/* ═══ ONE PLACEMENT, THREE OUTCOMES ══════════════════════ */}
      <section style={{ padding: "6rem 1.5rem", background: C.soft }}>
        <div style={wrap}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <SectionLabel text="What you get" />
            <h2 style={{
              fontWeight: 800, fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
              color: C.navy, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1rem",
            }}>
              One placement.{" "}
              <span style={grad}>Three outcomes that compound.</span>
            </h2>
            <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.65, maxWidth: "520px", margin: "0 auto" }}>
              Every placement we secure sits inside a real article with real traffic - read by the people buying in your category.
            </p>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start" }}
            className="stack-mobile"
          >
            {/* Left: article mockup */}
            <ListicleMockup />

            {/* Right: outcome cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", paddingTop: "0.5rem" }}>
              {[
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 15V3M3 9l6-6 6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: "The engines start citing your client",
                  body: "They enter the pool the engines extract from. Once cited in a trusted source, brands tend to be cited again across engines.",
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 2l2 5.5H17l-5 3.5 1.9 5.5L9 13.2 4.1 16.5 6 11 1 7.5h6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: "Rankings move",
                  body: "The host article already ranks for its own terms. Your client&apos;s page is linked from it, and the tracker shows where that page sat before and where it sits now.",
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3 9h12M9 3l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: "Readers arrive already researching",
                  body: "Visitors from a category roundup are choosing a provider. They arrive pre-qualified.",
                },
              ].map(({ icon, title, body }) => (
                <div
                  key={title}
                  className="card-hover"
                  style={{
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    borderRadius: "16px",
                    padding: "1.375rem 1.5rem",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "flex-start",
                    boxShadow: "0 2px 12px rgba(11,18,32,0.06)",
                  }}
                >
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "11px",
                    background: "rgba(124,58,237,0.08)",
                    border: "1px solid rgba(124,58,237,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.purple, flexShrink: 0,
                  }}>
                    {icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: C.navy, marginBottom: "0.375rem" }}>{title}</p>
                    <p style={{ fontSize: "0.825rem", color: C.body, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: body }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding: "6rem 1.5rem" }}>
        <div style={wrap}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <SectionLabel text="How it works" />
            <h2 style={{
              fontWeight: 800, fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
              color: C.navy, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1rem",
            }}>
              Scan. Place. Track.
            </h2>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", position: "relative" }}
            className="stack-mobile"
          >
            {[
              {
                n: "01",
                title: "You scan the topic, free",
                body: "Enter the domain and the topic. In a minute you know where your client sits, who is ahead of them, and exactly which sources the engines are citing to decide it.",
              },
              {
                n: "02",
                title: "We place your client in those sources",
                body: "Not a list of high-DA sites. The specific publications the scan just showed you being cited for this topic. Editorial coverage, contextual placements and link insertions, approached through editors we already work with.",
              },
              {
                n: "03",
                title: "You track what moved, and show the client",
                body: "Weekly readings on the same questions. Which questions your client is newly named in, which sources now cite them, how share of voice changed against the competitors you named. In a report with your logo, not ours.",
              },
            ].map(({ n, title, body }, i) => (
              <div
                key={n}
                className="card-hover"
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: "20px",
                  padding: "2rem",
                  boxShadow: "0 2px 16px rgba(11,18,32,0.06)",
                  position: "relative",
                }}
              >
                {/* Step connector arrow (desktop only, not last item) */}
                {i < 2 && (
                  <div
                    className="hide-mobile"
                    style={{
                      position: "absolute",
                      right: "-1.25rem",
                      top: "2rem",
                      zIndex: 10,
                      color: C.purple,
                      fontSize: "1.25rem",
                      fontWeight: 300,
                    }}
                    aria-hidden="true"
                  >
                    →
                  </div>
                )}
                <div style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: C.purple,
                  letterSpacing: "0.08em",
                  marginBottom: "1rem",
                  fontFamily: "monospace",
                }}>
                  {n}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "1.0625rem", color: C.navy, marginBottom: "0.75rem", lineHeight: 1.3 }}>
                  {title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
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

      {/* ═══ GUARANTEE BAND ═══════════════════════════════════════ */}
      <section style={{ background: C.soft, padding: "4rem 1.5rem" }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          {/* Task 9 - DA/DR figures removed; the screen is stated as criteria,
              not as a marketplace metric. */}
          <h2 style={{ fontWeight: 700, fontSize: "clamp(1.5rem, 2.5vw, 2rem)", color: C.navy, marginBottom: "0.875rem", letterSpacing: "-0.02em" }}>
            Every placement passes the same three-part screen.
          </h2>
          <p style={{ color: C.body, fontSize: "1rem", lineHeight: 1.65, maxWidth: "540px", margin: "0 auto 2rem" }}>
            A placement that fails the screen is replaced, not counted. You are buying placements that passed, not attempts.
          </p>
          <div style={{ display: "flex", gap: "2rem", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { icon: "✓", text: "Already cited by the engines for the topic" },
              { icon: "✓", text: "Real organic traffic, verified not claimed" },
              { icon: "✓", text: "Contextual to the topic" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: "rgba(34,197,94,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontSize: "0.875rem", fontWeight: 500, color: C.navy }}>{text}</span>
              </div>
            ))}
          </div>
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
            Prices on the page.
          </h2>

          {/* Task 5 - replaces the retainer-hostile line */}
          <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.65, maxWidth: "520px", margin: "0 auto 1.5rem" }}>
            Order when you want it. No scoping call to find out what it costs.
          </p>

          {/* Task 3 - per-keyword framing above the table */}
          <p style={{ color: C.body, fontSize: "0.9375rem", lineHeight: 1.7, maxWidth: "560px", margin: "0 auto 3rem" }}>
            Pricing is per target topic. You name the topic, we build the question set buyers actually ask around it - the longer-tail questions people use when they are choosing a provider.
          </p>

          <SectorPricing />

          {/* Task 3 - tier differentiation */}
          <div style={{
            maxWidth: "720px",
            margin: "3rem auto 0",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}>
            <p style={{ fontSize: "0.9375rem", color: C.body, lineHeight: 1.7 }}>
              The <TierName tier="mentioned" /> plan puts you in the third-party articles AI engines draw on when someone asks who to use. The focus is recommendations and brand mentions for one topic. Rankings improve as a side effect.
            </p>
            <p style={{ fontSize: "0.9375rem", color: C.body, lineHeight: 1.7 }}>
              The <TierName tier="cited" /> plan does all of that, then goes after the ranking directly - schema work on your pages and link insertions from the placements, so the same coverage that wins the AI answer also moves the keyword. This is the one most agencies buy.
            </p>
          </div>
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
                a: "Google AI Overview and ChatGPT mention data going back to August 2025, aggregated across the questions buyers ask about a topic. It runs no live model calls, which is why it is free and fast. Live readings across all four engines start when you open an account.",
              },
              {
                q: "How is this different from a standard link building agency?",
                a: "Most link building agencies target any available page with a high DA. We only target pages that already rank and receive real traffic - because that's what transfers authority to your page and gets extracted by AI systems. The source matters more than the metric.",
              },
              {
                q: "How long does it take to see results?",
                a: "Ranking movement typically appears within 60-90 days of a placement going live, and AI citations within 90-120 days as the engines refresh what they draw on. The tracker shows you the sequence as it happens rather than a projection - where the page sat before, where it sits now, and the date the coverage went live.",
              },
              {
                q: "How do you screen a placement?",
                a: "Three things. Already cited by the engines for the topic - the scan shows which sources Google AI Overviews and ChatGPT draw on, and we place there rather than on a DA list. Real organic traffic, verified not claimed. And contextual to the topic, so the mention reads as editorial to a person and to a model. A placement that fails the screen is replaced, not counted.",
              },
              {
                q: "Will the placement look natural?",
                a: "Yes. We work with real editors at real publications, and every placement is a genuine editorial contribution rather than a link farm or an automated outreach blast. On the alwayscited plan we also place contextual links inside existing high-authority articles - agreed with the publisher, agreed with you, and always inside content that already ranks and gets read.",
              },
              {
                q: "Can you show what my coverage did before I signed up?",
                a: "For AI Overviews, yes - back to August 2025. For the other engines, no: nobody holds that data, so your first scan is the baseline. Where an engine has no history we say so rather than drawing a line.",
              },
              {
                q: "Do I need links, or do mentions count?",
                a: "Mentions count. Most citations we see come from coverage with no link in it at all. Links do a different job - they move rankings. The tracker reports which one happened.",
              },
              {
                q: "Will the free tool tell me to buy placements?",
                a: "The source list is ranked by how often the engines cite it, and nothing else. If your own coverage is already doing the work, the report says so.",
              },
              {
                q: "Is this for PR or SEO?",
                a: "Both. The thing being measured is the same either way - an off-site mention or link, and whether you are present in the sources that decide the answer.",
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
                q: "How many placements do I get per month?",
                a: "The alwaysmentioned plan includes three. A placement that fails the three-part screen is replaced, not counted - you are buying placements that passed, not attempts.",
              },
              {
                q: "Which industries do you work with?",
                a: "We work with B2B SaaS, professional services, fintech, and specialist e-commerce. We don't work with industries where high-authority editorial placements are difficult to secure (gambling, adult, crypto).",
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
                <ScanForm compact />
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
