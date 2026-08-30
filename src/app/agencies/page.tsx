import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "White-Label AI Visibility for SEO Agencies | alwayscited",
  description:
    "White-label AI citation placements for SEO agencies. Month-3 AI Overview guarantee your clients can hold you to, live tracker reporting under your brand, wholesale pricing. US, UK, AU.",
  alternates: { canonical: "https://alwayscited.com/agencies" },
  openGraph: {
    title: "White-Label AI Visibility for SEO Agencies | alwayscited",
    description:
      "White-label AI citation placements for SEO agencies. Month-3 AI Overview guarantee your clients can hold you to, live tracker reporting under your brand, wholesale pricing.",
    url: "https://alwayscited.com/agencies",
  },
};

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

const blocks = [
  {
    n: "1",
    title: "Fulfillment, not another tool.",
    body: "We run the entity audit, engineer the placements, and track citations across AI Overviews, ChatGPT, Gemini and Perplexity. You present the results.",
  },
  {
    n: "2",
    title: "A report your client can check themselves.",
    body: "Every placement has a live tracker page - link state, rankings on both keyword sets, AI Overview outcome in four honest states. Nothing estimated. Your logo on top.",
  },
  {
    n: "3",
    title: "Economics that work at resale.",
    body: "Wholesale tiers by client count, stated placement volumes, suggested resale pricing. Most partners resell at 1.7-2x.",
  },
];

export default function AgenciesPage() {
  return (
    <>
      {/* ═══ HERO ═══ */}
      <section style={{ padding: "5.5rem 1.5rem 4rem", position: "relative", overflow: "hidden" }}>
        <div
          className="gradient-orb"
          style={{
            position: "absolute", width: "620px", height: "620px",
            background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)",
            top: "-220px", right: "-140px", pointerEvents: "none",
          }}
          aria-hidden="true"
        />

        <div style={{ ...wrap, maxWidth: "760px", position: "relative" }}>
          <div style={{
            display: "inline-flex", alignItems: "center",
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: "999px",
            padding: "0.25rem 0.875rem",
            fontSize: "0.75rem", fontWeight: 600, color: C.purple,
            marginBottom: "1.25rem",
          }}>
            For SEO agencies
          </div>

          <h1 style={{
            fontWeight: 800,
            fontSize: "clamp(2.25rem, 4.5vw, 3.25rem)",
            color: C.navy,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            marginBottom: "1.375rem",
          }}>
            Your clients are asking about AI search.{" "}
            <span style={grad}>Hand them the answer.</span>
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 1.5vw, 1.125rem)",
            color: C.body,
            lineHeight: 1.7,
            marginBottom: "2.25rem",
            maxWidth: "600px",
          }}>
            White-label AI citation placements with a written month-3 guarantee you pass straight through to your client. Your brand on the report, our name nowhere near it.
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <a href="/contact" className="btn-primary">Book a partner call</a>
            <a
              href="/#receipts"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.375rem",
                color: C.navy, fontWeight: 600, fontSize: "1rem",
                textDecoration: "none", padding: "0.875rem 0",
              }}
            >
              See a live tracker
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ═══ THREE FEATURE BLOCKS ═══ */}
      <section style={{ padding: "4rem 1.5rem 6rem", background: C.soft }}>
        <div style={wrap}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}
            className="stack-mobile"
          >
            {blocks.map(({ n, title, body }) => (
              <div
                key={n}
                className="card-hover"
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: "20px",
                  padding: "2rem",
                  boxShadow: "0 2px 16px rgba(11,18,32,0.06)",
                }}
              >
                <div style={{
                  fontSize: "0.75rem", fontWeight: 700, color: C.purple,
                  letterSpacing: "0.08em", marginBottom: "1rem", fontFamily: "monospace",
                }}>
                  0{n}
                </div>
                <h2 style={{ fontWeight: 700, fontSize: "1.0625rem", color: C.navy, marginBottom: "0.75rem", lineHeight: 1.3 }}>
                  {title}
                </h2>
                <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HIGHLIGHT BOX ═══ */}
      <section style={{ padding: "0 1.5rem 6rem" }}>
        <div style={{ ...wrap, maxWidth: "760px" }}>
          <div style={{
            background: C.navy,
            borderRadius: "24px",
            padding: "3rem 2.5rem",
            position: "relative",
            overflow: "hidden",
          }}>
            <div className="gradient-orb" style={{ position: "absolute", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 70%)", top: "-140px", right: "-100px", pointerEvents: "none" }} aria-hidden="true" />

            <div style={{ position: "relative" }}>
              <h2 style={{
                fontWeight: 800,
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                color: C.white,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                marginBottom: "1rem",
              }}>
                We never contact your client.
              </h2>
              <p style={{ color: "#9CA3AF", fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: "560px" }}>
                NDA standard. Your brand on everything the client sees. If we miss the month-3 guarantee, we work free until it lands - and so does your margin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ background: C.soft, padding: "5rem 1.5rem" }}>
        <div style={{ ...wrap, maxWidth: "620px", textAlign: "center" }}>
          <h2 style={{
            fontWeight: 800, fontSize: "clamp(1.75rem, 3vw, 2.375rem)",
            color: C.navy, lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: "2rem",
          }}>
            Let&apos;s talk partnership.
          </h2>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/contact" className="btn-primary">Book a partner call</a>
            <a
              href="/#receipts"
              style={{
                display: "inline-block",
                background: "transparent",
                color: C.navy,
                padding: "0.875rem 2rem",
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: "1rem",
                textDecoration: "none",
                border: `1.5px solid ${C.border}`,
              }}
            >
              See a live tracker
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
