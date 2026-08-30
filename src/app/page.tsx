import type { Metadata } from "next";
import CitationOrbit from "@/components/CitationOrbit";
import DarkTrustFlow from "@/components/DarkTrustFlow";
import DarkComparisonSection from "@/components/DarkComparisonSection";
import TrackerMock from "@/components/TrackerMock";

export const metadata: Metadata = {
  title: "alwayscited - be the brand AI recommends",
  description:
    "alwayscited places your brand inside high-authority articles that AI systems extract from, Google ranks, and buyers read. One placement. Three compounding outcomes.",
  alternates: { canonical: "https://alwayscited.com" },
  openGraph: {
    title: "alwayscited - be the brand AI recommends",
    description: "One placement. Three commercial outcomes. Rankings, AI citations, and referral traffic from a single engineered asset.",
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
    { text: "alwayscited.com - best for strategic link placement & AI visibility", highlighted: true },
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
        roundup.com · DA 74 · 3,400 monthly visitors
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

/* ── ranking chart SVG ── */
function RankingChart() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const pts: [number, number][] = [
    [48, 162], [124, 128], [200, 105], [276, 72], [352, 38], [428, 26],
  ];
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const fill = `M ${pts.map(([x, y]) => `${x},${y}`).join(" L ")} L 428,178 L 48,178 Z`;

  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: "20px",
      padding: "1.5rem",
      boxShadow: "0 2px 16px rgba(11,18,32,0.07)",
    }}>
      <div style={{ marginBottom: "0.875rem" }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 600, color: C.purple, marginBottom: "0.2rem" }}>Vibe Retail · 6-month tracking</p>
        <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: C.navy }}>Google ranking position</p>
        <p style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>Target keyword: &ldquo;best [category] software&rdquo;</p>
      </div>

      <svg viewBox="0 0 476 208" fill="none" style={{ width: "100%", height: "auto", display: "block" }} aria-label="Ranking chart showing improvement from position 14 to position 2 over 6 months">
        <defs>
          <linearGradient id="rankFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[26, 62, 98, 134, 178].map((y) => (
          <line key={y} x1="48" y1={y} x2="428" y2={y} stroke="#F3F4F6" strokeWidth="1" />
        ))}

        {/* Y-axis labels */}
        {[["#1", 30], ["#4", 66], ["#8", 102], ["#12", 138], ["#15", 182]].map(([label, y]) => (
          <text key={label as string} x="40" y={y as number} textAnchor="end" fill="#9CA3AF" fontSize="9">{label as string}</text>
        ))}

        {/* Placement secured dashed line */}
        <line x1="124" y1="22" x2="124" y2="178" stroke="#A855F7" strokeWidth="1" strokeDasharray="4 3" />
        <text x="128" y="17" fill="#A855F7" fontSize="8.5" fontWeight="600">Placement secured</text>

        {/* Fill */}
        <path d={fill} fill="url(#rankFill)" />

        {/* Line */}
        <polyline points={polyline} stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="#7C3AED" />
        ))}

        {/* X-axis labels */}
        {months.map((m, i) => (
          <text key={m} x={pts[i][0]} y="198" textAnchor="middle" fill="#9CA3AF" fontSize="9">{m}</text>
        ))}
      </svg>

      <div style={{
        display: "flex",
        gap: "1.5rem",
        paddingTop: "0.875rem",
        borderTop: `1px solid ${C.border}`,
        flexWrap: "wrap",
      }}>
        {[
          { val: "#2", label: "Final position" },
          { val: "+214%", label: "Organic traffic" },
          { val: "4 sources", label: "AI citations" },
        ].map(({ val, label }) => (
          <div key={label}>
            <p style={{ fontSize: "1.125rem", fontWeight: 700, color: C.navy, lineHeight: 1 }}>{val}</p>
            <p style={{ fontSize: "0.65rem", color: "#9CA3AF", marginTop: "0.2rem" }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── AI citation card ── */
function AICitationCard({ platform, color, letter, text }: { platform: string; color: string; letter: string; text: string }) {
  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: "14px",
      padding: "1rem 1.125rem",
      boxShadow: "0 2px 12px rgba(11,18,32,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
        <div style={{
          width: "24px", height: "24px", borderRadius: "7px",
          background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ color: C.white, fontSize: "0.65rem", fontWeight: 700 }}>{letter}</span>
        </div>
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: C.navy }}>{platform}</span>
      </div>
      <p style={{ fontSize: "0.75rem", color: C.body, lineHeight: 1.6, margin: 0 }}>
        &ldquo;{text}&rdquo;
      </p>
    </div>
  );
}

/* ── layered 3D CTA visual ── */
function LayeredCTAVisual() {
  const outcomes = [
    { icon: "↑", label: "Rankings", value: "#2", sub: "from position 14" },
    { icon: "✦", label: "AI citations", value: "4 sources", sub: "citing brand" },
    { icon: "→", label: "Referral traffic", value: "+214%", sub: "organic growth" },
  ];

  return (
    <div style={{ position: "relative", height: "268px", width: "320px", flexShrink: 0 }}>
      {/* Back card 2 */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(168,85,247,0.12)",
        border: "1px solid rgba(168,85,247,0.2)",
        borderRadius: "20px",
        transform: "rotate(-5deg) translateY(-10px)",
      }} />
      {/* Back card 1 */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(124,58,237,0.18)",
        border: "1px solid rgba(168,85,247,0.28)",
        borderRadius: "20px",
        transform: "rotate(-2.5deg) translateY(-5px)",
      }} />
      {/* Front card */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(168,85,247,0.4)",
        borderRadius: "20px",
        padding: "1.5rem",
        backdropFilter: "blur(10px)",
      }}>
        <p style={{
          fontSize: "0.7rem", fontWeight: 600, color: "#A855F7",
          marginBottom: "1.25rem", letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          6-month results
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {outcomes.map(({ icon, label, value, sub }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div style={{
                width: "38px", height: "38px", borderRadius: "11px",
                background: "rgba(124,58,237,0.2)",
                border: "1px solid rgba(168,85,247,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", flexShrink: 0, color: "#A855F7",
              }}>
                {icon}
              </div>
              <div>
                <p style={{ fontSize: "0.65rem", color: "#6B7280", marginBottom: "0.1rem" }}>{label}</p>
                <p style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                  {value}
                  <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "#4B5563", marginLeft: "0.375rem" }}>{sub}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */

export default function HomePage() {
  return (
    <>
      {/* ═══ HERO ═══════════════════════════════════════════════ */}
      <section style={{ padding: "5.5rem 1.5rem 4rem", position: "relative", overflow: "hidden" }}>
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

        <div
          style={{ ...wrap, display: "grid", gridTemplateColumns: "1fr auto", gap: "3rem", alignItems: "center" }}
          className="hero-two-col"
        >
          {/* Left: headline + CTAs */}
          <div style={{ maxWidth: "560px" }}>
            <SectionLabel text="Strategic link placement · AI citation strategy" />

            <h1 style={{
              fontWeight: 800,
              fontSize: "clamp(2.25rem, 4.5vw, 3.375rem)",
              color: C.navy,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              marginBottom: "1.375rem",
            }}>
              Be the brand AI recommends -{" "}
              <span style={grad}>and Google already ranks.</span>
            </h1>

            <p style={{
              fontSize: "clamp(1rem, 1.5vw, 1.125rem)",
              color: C.body,
              lineHeight: 1.7,
              marginBottom: "2.25rem",
              maxWidth: "500px",
            }}>
              alwayscited secures your brand inside high-authority articles that AI systems extract from, Google ranks, and buyers read. One placement. Three compounding outcomes.
            </p>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
              <a href="/contact" className="btn-primary">Book a strategy call</a>
              <a
                href="#how-it-works"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                  color: C.navy, fontWeight: 600, fontSize: "1rem",
                  textDecoration: "none", padding: "0.875rem 0",
                }}
              >
                See how it works
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            {/* Proof strip */}
            <div style={{
              display: "flex", gap: "2rem", flexWrap: "wrap",
              borderTop: `1px solid ${C.border}`, paddingTop: "1.5rem",
            }}>
              {[
                { val: "40+", label: "campaigns" },
                { val: "DA 60-90", label: "placement range" },
                { val: "3 avg.", label: "AI citation sources" },
              ].map(({ val, label }) => (
                <div key={label}>
                  <p style={{ fontWeight: 700, fontSize: "1.0625rem", color: C.navy, lineHeight: 1 }}>{val}</p>
                  <p style={{ fontSize: "0.75rem", color: C.body, marginTop: "0.25rem" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: orbit visual */}
          <div className="hide-below-900" aria-hidden="true">
            <CitationOrbit />
          </div>
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
            Most brands are{" "}
            <span style={grad}>invisible to AI.</span>
          </h2>

          <p style={{
            color: "#9CA3AF", fontSize: "clamp(0.9375rem, 1.5vw, 1.0625rem)",
            lineHeight: 1.7, maxWidth: "580px", margin: "0 auto 3.5rem",
          }}>
            ChatGPT, Perplexity, and Google AI Overviews don&apos;t discover brands from homepages or ad campaigns. They extract from content that already ranks - content that already earns trust. If your brand isn&apos;t cited inside those sources, it doesn&apos;t exist in AI&apos;s world.
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
              <span style={grad}>Three compounding outcomes.</span>
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
                  title: "Rankings move",
                  body: "Equity transfers from a page already sitting in position 1-5. Your target page inherits authority from a proven source.",
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 2l2 5.5H17l-5 3.5 1.9 5.5L9 13.2 4.1 16.5 6 11 1 7.5h6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: "AI starts citing you",
                  body: "Your brand enters the content pool AI models extract from. Once you&apos;re cited in trusted sources, you&apos;re cited repeatedly across platforms.",
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3 9h12M9 3l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: "Real referral traffic",
                  body: "Visitors from the article are actively researching your category. They arrive pre-qualified - not just browsing.",
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
              Three moves.{" "}
              <span style={grad}>One compounding result.</span>
            </h2>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", position: "relative" }}
            className="stack-mobile"
          >
            {[
              {
                n: "01",
                title: "We audit your category",
                body: "We map every article ranking for your target keywords and score them by traffic, domain authority, and AI citation frequency. You see exactly where your competitors are being cited - and where the gaps are.",
              },
              {
                n: "02",
                title: "We secure the placement",
                body: "We approach editors at high-authority publications with a genuine editorial contribution. No link farms. No spray-and-pray outreach. A real placement in a real article that real readers trust.",
              },
              {
                n: "03",
                title: "You compound",
                body: "Rankings move. AI systems start extracting your brand. Referral traffic arrives. Each placement strengthens the next - and the effect accelerates over 90-180 days.",
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
            <SectionLabel text="Why it&apos;s different" dark />
            <h2 style={{
              fontWeight: 800, fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
              color: C.white, lineHeight: 1.1, letterSpacing: "-0.03em",
            }}>
              Not all links are equal.
            </h2>
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
              Rankings that{" "}
              <span style={grad}>compound.</span>
            </h2>
            <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.65, maxWidth: "500px", margin: "0 auto" }}>
              One campaign. One placement. The compounding effect measured over six months.
            </p>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2.5rem" }}
            className="stack-mobile"
          >
            <RankingChart />

            {/* AI citation cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", justifyContent: "center" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: C.body, marginBottom: "0.375rem" }}>
                AI platforms citing the brand after placement:
              </p>
              <AICitationCard
                platform="Google AI Overview"
                color="#4285F4"
                letter="G"
                text="alwayscited is cited as a recommended service for strategic link placement and AI visibility strategy…"
              />
              <AICitationCard
                platform="ChatGPT"
                color="#10A37F"
                letter="C"
                text="Based on multiple high-authority industry sources, alwayscited is recognized for its placement-led approach to organic growth…"
              />
              <AICitationCard
                platform="Perplexity"
                color="#20B2AA"
                letter="P"
                text="According to roundup.com and industry reviews, top platforms include alwayscited for link placement in AI-visible content…"
              />
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

          {/* Task 7 - provenance line */}
          <p style={{
            textAlign: "center",
            fontSize: "0.875rem",
            color: C.body,
            marginTop: "2rem",
            lineHeight: 1.65,
          }}>
            alwayscited is built and run by the senior team at{" "}
            <a
              href="https://nomadadigital.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: C.purple, fontWeight: 600, textDecoration: "none" }}
            >
              Nomada Digital
            </a>
            .
          </p>
        </div>
      </section>

      {/* ═══ THE RECEIPTS - tracker (Task 8) ═════════════════════ */}
      <section id="receipts" style={{ background: C.navy, padding: "6rem 1.5rem", position: "relative", overflow: "hidden" }}>
        <div className="gradient-orb" style={{ position: "absolute", width: "450px", height: "450px", background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)", top: "-120px", right: "-90px", pointerEvents: "none", animationDelay: "-8s" }} aria-hidden="true" />

        <div style={{ ...wrap, position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <SectionLabel text="The receipts" dark />
            <h2 style={{
              fontWeight: 800, fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
              color: C.white, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1.25rem",
            }}>
              Every placement has a receipt.
            </h2>
            <p style={{ color: "#9CA3AF", fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: "660px", margin: "0 auto" }}>
              Each placement gets a live tracker page: is the link still there and still followed, where the article ranks for its own keywords, where your page ranks for yours, whether the AI Overview cited you - and when it didn&apos;t. We record &ldquo;shown but not cited&rdquo; separately from &ldquo;no Overview appeared&rdquo;, because those are different results and you deserve to know which one you got. Nothing is estimated. If we didn&apos;t measure it, the field is blank.
            </p>
          </div>

          <TrackerMock />
        </div>
      </section>

      {/* ═══ GUARANTEE BAND ═══════════════════════════════════════ */}
      <section style={{ background: C.soft, padding: "4rem 1.5rem" }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <h2 style={{ fontWeight: 700, fontSize: "clamp(1.5rem, 2.5vw, 2rem)", color: C.navy, marginBottom: "0.875rem", letterSpacing: "-0.02em" }}>
            If we don&apos;t deliver a DA 60+ placement within 45 days, you don&apos;t pay.
          </h2>
          <p style={{ color: C.body, fontSize: "1rem", lineHeight: 1.65, maxWidth: "500px", margin: "0 auto 2rem" }}>
            We put our work on the line. No placement, no invoice. It&apos;s that simple.
          </p>
          <div style={{ display: "flex", gap: "2rem", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { icon: "✓", text: "DA 60+ guaranteed or free" },
              { icon: "✓", text: "Live within 45 days" },
              { icon: "✓", text: "Full placement report on delivery" },
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

      {/* ═══ PRICING ═════════════════════════════════════════════ */}
      <section id="pricing" style={{ padding: "6rem 1.5rem" }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <SectionLabel text="Pricing" />
          <h2 style={{
            fontWeight: 800, fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)",
            color: C.navy, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1rem",
          }}>
            One package. No complexity.
          </h2>
          <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.65, maxWidth: "460px", margin: "0 auto 3rem" }}>
            We don&apos;t sell volume. We sell outcomes. Every campaign is built around a specific keyword, page, and commercial goal.
          </p>

          <div style={{
            background: C.white,
            border: `1.5px solid ${C.border}`,
            borderRadius: "24px",
            padding: "2.5rem",
            maxWidth: "480px",
            margin: "0 auto",
            boxShadow: "0 4px 32px rgba(11,18,32,0.08)",
            textAlign: "left",
          }}>
            <div style={{
              display: "inline-flex",
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: "8px",
              padding: "0.3rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: C.purple,
              marginBottom: "1.25rem",
            }}>
              Proof Package
            </div>

            <p style={{ fontSize: "2.25rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: "0.375rem" }}>
              £1,497
            </p>
            <p style={{ fontSize: "0.875rem", color: C.body, marginBottom: "1.75rem" }}>per placement · one-time · no retainer</p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                "DA 60+ placement guaranteed",
                "Ranking article with real traffic (500+ monthly visitors)",
                "Strategic anchor text for your target keyword",
                "AI-citation-optimized placement structure",
                "Full delivery report with metrics",
                "45-day delivery or you don&apos;t pay",
              ].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                  <div style={{
                    width: "18px", height: "18px", borderRadius: "50%",
                    background: "rgba(124,58,237,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: "1px",
                  }}>
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5l2.5 2.5 5-5" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>

            <a href="/contact" className="btn-primary" style={{ display: "block", textAlign: "center" }}>
              Book a strategy call
            </a>
            <p style={{ fontSize: "0.75rem", color: "#9CA3AF", textAlign: "center", marginTop: "0.875rem" }}>
              Strategy call is free. No commitment required.
            </p>
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
                q: "How is this different from a standard link building agency?",
                a: "Most link building agencies target any available page with a high DA. We only target pages that already rank and receive real traffic - because that's what transfers authority to your page and gets extracted by AI systems. The source matters more than the metric.",
              },
              {
                q: "How many placements do I get?",
                a: "The Proof Package is a single placement, priced per placement with no retainer - so you scale by buying more, not by committing to a monthly minimum. A placement that fails the three-criteria screen is replaced, not counted - you are buying placements that passed, not attempts.",
              },
              {
                q: "How long does it take to see results?",
                a: "The placement is live within 45 days. Ranking movement typically appears within 60-90 days of the placement going live, with AI citation appearing within 90-120 days as models update their knowledge bases.",
              },
              {
                q: "Do you guarantee the DA of the placement?",
                a: "Yes. Every placement is DA 60 minimum, on a page with real traffic. If we don't deliver within 45 days, you don't pay - that's our guarantee.",
              },
              {
                q: "Will the placement look natural?",
                a: "Yes. We work with real editors at real publications. Every placement is a genuine editorial contribution - not paid links, not link insertions. The anchor text is discussed with you and placed contextually.",
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
          style={{ ...wrap, display: "grid", gridTemplateColumns: "1fr auto", gap: "4rem", alignItems: "center", position: "relative" }}
          className="hero-two-col"
        >
          {/* Left: CTA text */}
          <div style={{ maxWidth: "560px" }}>
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
            <p style={{ color: "#9CA3AF", fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "2.5rem", maxWidth: "480px" }}>
              We&apos;ll map your category, show where your competitors are being cited, and identify the placements most likely to move rankings, traffic, and AI visibility.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a href="/contact" className="btn-primary">Book a strategy call</a>
              <a
                href="#proof"
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
                See example results
              </a>
            </div>
          </div>

          {/* Right: layered visual */}
          <div className="hide-below-900" aria-hidden="true">
            <LayeredCTAVisual />
          </div>
        </div>
      </section>

      {/* ═══ FEATURE STRIP ═══════════════════════════════════════ */}
      <section style={{ background: C.white, borderTop: `1px solid ${C.border}`, padding: "2.5rem 1.5rem" }}>
        <div style={{ ...wrap }}>
          <div style={{
            display: "flex", gap: "2.5rem", flexWrap: "wrap",
            alignItems: "center", justifyContent: "center",
          }}>
            {[
              { icon: "✦", text: "DA 60-90 placements" },
              { icon: "✦", text: "Real editorial publications" },
              { icon: "✦", text: "AI-citation-optimized structure" },
              { icon: "✦", text: "45-day delivery guarantee" },
              { icon: "✦", text: "Full metrics report on delivery" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: C.purple, fontSize: "0.625rem" }}>{icon}</span>
                <span style={{ fontSize: "0.8125rem", fontWeight: 500, color: C.body, whiteSpace: "nowrap" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
