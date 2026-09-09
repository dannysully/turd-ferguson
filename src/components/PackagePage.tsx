import type { Tier } from "@/config/pricing";
import TierName from "@/components/TierName";
import { CONTACT_URL } from "@/config/pricing";

/**
 * Shared layout for the four package pages. The homepage gets to the
 * packages; the detail of what is included lives here.
 */

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

export type PackageSection = { heading: string; body: string };

export default function PackagePage({
  tier,
  headline,
  headlineAccent,
  standfirst,
  included,
  sections,
  notIncluded,
}: {
  tier: Tier;
  headline: string;
  headlineAccent: string;
  standfirst: string;
  included: string[];
  sections: PackageSection[];
  notIncluded?: { text: string; upgradeTo?: string; href?: string };
}) {
  return (
    <>
      {/* Hero */}
      <section style={{ padding: "5rem 1.5rem 3.5rem", position: "relative", overflow: "hidden" }}>
        <div
          className="gradient-orb"
          style={{
            position: "absolute", width: "600px", height: "600px",
            background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)",
            top: "-220px", right: "-140px", pointerEvents: "none",
          }}
          aria-hidden="true"
        />
        <div style={{ ...wrap, maxWidth: "780px", position: "relative" }}>
          <p style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
            <TierName tier={tier.key} />
          </p>
          <h1 style={{
            fontWeight: 800,
            fontSize: "clamp(2rem, 4vw, 3rem)",
            color: C.navy,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginBottom: "1.25rem",
          }}>
            {headline} <span style={grad}>{headlineAccent}</span>
          </h1>
          <p style={{
            fontSize: "clamp(1rem, 1.5vw, 1.125rem)",
            color: C.body,
            lineHeight: 1.7,
            marginBottom: "2rem",
            maxWidth: "620px",
          }}>
            {standfirst}
          </p>
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.03em" }}>
              {tier.priceLabel}
            </span>
            <a href={CONTACT_URL} className="btn-primary">
              {tier.basePrice === null ? "Book a partner call" : "Get started"}
            </a>
          </div>
        </div>
      </section>

      {/* What is included */}
      <section style={{ padding: "4rem 1.5rem", background: C.soft }}>
        <div style={{ ...wrap, maxWidth: "780px" }}>
          <h2 style={{
            fontWeight: 800, fontSize: "clamp(1.5rem, 3vw, 2rem)",
            color: C.navy, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1.75rem",
          }}>
            What is included
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {included.map((item) => (
              <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <svg width="14" height="11" viewBox="0 0 12 9" fill="none" style={{ marginTop: "6px", flexShrink: 0 }}>
                  <path d="M1 4.5l3.5 3.5L11 1" stroke={C.purple} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: "1rem", color: C.navy, lineHeight: 1.6 }}>{item}</span>
              </li>
            ))}
          </ul>

          {notIncluded && (
            <div style={{
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: `1px solid ${C.border}`,
            }}>
              <p style={{ fontSize: "0.9375rem", color: C.body, lineHeight: 1.7 }}>
                {notIncluded.text}
                {notIncluded.upgradeTo && notIncluded.href && (
                  <>
                    {" "}
                    <a href={notIncluded.href} style={{ color: C.purple, fontWeight: 600, textDecoration: "none" }}>
                      {notIncluded.upgradeTo}
                    </a>
                    .
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* How it works, in detail */}
      <section style={{ padding: "4.5rem 1.5rem" }}>
        <div style={{ ...wrap, maxWidth: "780px", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {sections.map(({ heading, body }) => (
            <div key={heading}>
              <h2 style={{
                fontWeight: 700, fontSize: "1.25rem", color: C.navy,
                lineHeight: 1.3, letterSpacing: "-0.01em", marginBottom: "0.75rem",
              }}>
                {heading}
              </h2>
              <p style={{ fontSize: "1rem", color: C.body, lineHeight: 1.75 }}>{body}</p>
            </div>
          ))}

          <p style={{ fontSize: "0.875rem", color: "#9CA3AF", lineHeight: 1.7, paddingTop: "1rem", borderTop: `1px solid ${C.border}` }}>
            If we did not measure it, the field is blank. We never fill a gap with a model.
          </p>
        </div>
      </section>

      {/* Close */}
      <section style={{ background: C.navy, padding: "4.5rem 1.5rem", position: "relative", overflow: "hidden" }}>
        <div className="gradient-orb" style={{ position: "absolute", width: "440px", height: "440px", background: "radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 70%)", top: "-150px", left: "-100px", pointerEvents: "none" }} aria-hidden="true" />
        <div style={{ ...wrap, maxWidth: "620px", textAlign: "center", position: "relative" }}>
          <h2 style={{
            fontWeight: 800, fontSize: "clamp(1.5rem, 3vw, 2rem)",
            color: C.white, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1rem",
          }}>
            Start with a scan
          </h2>
          <p style={{ color: "#9CA3AF", fontSize: "1rem", lineHeight: 1.7, marginBottom: "2rem" }}>
            One scan, no charge, and it tells you which sources decide your client&apos;s category before you commit to anything.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/#scan" className="btn-primary">Run a free scan</a>
            <a
              href="/#pricing"
              style={{
                display: "inline-block", background: "transparent", color: C.white,
                padding: "0.875rem 2rem", borderRadius: "12px", fontWeight: 600,
                fontSize: "1rem", textDecoration: "none",
                border: "1.5px solid rgba(255,255,255,0.2)",
              }}
            >
              Compare packages
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
