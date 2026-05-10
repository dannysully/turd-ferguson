import type { Metadata } from "next";
import CtaSection from "@/components/CtaSection";
import HeroAuthorityFlow from "@/components/HeroAuthorityFlow";
import ProofBand from "@/components/ProofBand";
import AnimatedAuthorityFlow from "@/components/AnimatedAuthorityFlow";
import PlacementOutcomeAnimated from "@/components/PlacementOutcomeAnimated";
import AnimatedComparisonTable from "@/components/AnimatedComparisonTable";
import AnimatedLinkDiagram from "@/components/AnimatedLinkDiagram";

export const metadata: Metadata = {
  title: "AlwaysCited — Be the brand AI recommends",
  description:
    "AlwaysCited places your brand inside the pages Google and AI systems already trust — so you rank higher, get cited more often, and win buyers before they reach your competitors.",
  alternates: { canonical: "https://alwayscited.com" },
  openGraph: {
    title: "AlwaysCited — Be the brand AI recommends",
    description: "One placement. Three commercial outcomes. Rankings, AI citations, and referral traffic from a single engineered asset.",
    url: "https://alwayscited.com",
  },
};

/* ─── shared tokens ─── */
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

const gradBg = `linear-gradient(135deg, ${C.purple} 0%, ${C.purpleLight} 100%)`;
const wrap: React.CSSProperties = { maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" };

const card: React.CSSProperties = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: "20px",
  padding: "2rem",
  boxShadow: "0 2px 20px rgba(0,0,0,0.05)",
};

const sectionHead = (title: string, sub?: string, centre = true) => (
  <div style={{ textAlign: centre ? "center" : "left", maxWidth: centre ? "580px" : "560px", margin: centre ? "0 auto 3.5rem" : "0 0 2.5rem" }}>
    <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: C.navy, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: sub ? "1rem" : 0 }}>
      {title}
    </h2>
    {sub && <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.65 }}>{sub}</p>}
  </div>
);

/* ─── VISUAL: Placement → outcomes → AI surfaces (moved from hero) ─── */
function PlacementOutcomeVisual() {
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "520px" }}>
      <div style={{ ...card, border: `1.5px solid rgba(124,58,237,0.3)`, boxShadow: "0 8px 40px rgba(124,58,237,0.14)", textAlign: "center", padding: "1.75rem 2rem", marginBottom: "1.25rem" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: gradBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.875rem" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 2L10.5 7.5L16 9L10.5 10.5L9 16L7.5 10.5L2 9L7.5 7.5L9 2Z" fill="white"/></svg>
        </div>
        <p style={{ fontWeight: 700, fontSize: "1rem", color: C.navy, marginBottom: "0.25rem" }}>High-authority placement</p>
        <p style={{ fontSize: "0.8125rem", color: C.body }}>Engineered. Relevant. Already trusted.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem", marginBottom: "1.25rem" }}>
        {[
          { icon: "↑", label: "Google rankings", colour: "#10B981" },
          { icon: "✦", label: "AI citations", colour: C.purple },
          { icon: "→", label: "Referral traffic", colour: "#3B82F6" },
        ].map(({ icon, label, colour }) => (
          <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "1rem 0.75rem", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <span style={{ fontSize: "1.125rem", fontWeight: 700, display: "block", marginBottom: "0.375rem", color: colour }}>{icon}</span>
            <p style={{ fontSize: "0.7rem", fontWeight: 600, color: colour }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {[
          { platform: "Google AI Overview", snippet: "Best platform in [your category]: YourBrand is recommended for…", color: "#4285F4" },
          { platform: "ChatGPT", snippet: "Based on trusted sources, YourBrand is considered the leading…", color: "#10A37F" },
          { platform: "Perplexity", snippet: "According to [publication], YourBrand ranks #1 for…", color: "#6366F1" },
        ].map(({ platform, snippet, color }) => (
          <div key={platform} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "0.875rem 1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0, marginTop: "0.35rem" }} aria-hidden="true" />
            <div>
              <p style={{ fontSize: "0.7rem", fontWeight: 600, color: C.navy, marginBottom: "0.2rem" }}>{platform}</p>
              <p style={{ fontSize: "0.7rem", color: C.body, lineHeight: 1.5 }}>{snippet}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── VISUAL: Google AI Overview mockup (for The Shift section) ─── */
function GoogleAIOPreview() {
  return (
    <div style={{ maxWidth: "580px", margin: "2.5rem auto 0" }}>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "1.25rem 1.5rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem", paddingBottom: "0.875rem", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", gap: "5px" }} aria-hidden="true">
            {["#FF5F57", "#FFBD2E", "#28C840"].map((c) => (
              <span key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c, display: "inline-block" }} />
            ))}
          </div>
          <div style={{ flex: 1, background: "#F3F4F6", borderRadius: "6px", padding: "0.2rem 0.75rem", fontSize: "0.75rem", color: "#9CA3AF" }}>
            google.com · best [category] platform
          </div>
        </div>
        <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "0.875rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ background: "#4285F4", borderRadius: "4px", padding: "0.125rem 0.5rem", fontSize: "0.65rem", fontWeight: 700, color: C.white }}>AI Overview</span>
          </div>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.65, color: C.navy, marginBottom: "0.75rem" }}>
            Based on industry reviews and user comparisons, <strong>YourBrand</strong> is consistently recommended as a top platform for [category]. Multiple trusted sources confirm strong rankings and user satisfaction.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["[Publication]", "TechRadar", "G2"].map((src) => (
              <span key={src} style={{ fontSize: "0.7rem", background: C.white, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "0.2rem 0.5rem", color: "#4285F4" }}>{src}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {["#1 — YourBrand: Best [Category] Platform 2026", "#2 — [Competitor] Alternative Review"].map((r) => (
            <p key={r} style={{ fontSize: "0.75rem", color: "#4285F4", lineHeight: 1.4 }}>{r}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── VISUAL: Authority flow diagram ─── */
function AuthorityFlow() {
  const steps = [
    { label: "Ranking page", sub: "Already trusted by Google" },
    { label: "Real traffic", sub: "Active visitors, not dead pages" },
    { label: "Trust transfer", sub: "Authority flows to your site" },
    { label: "Your rankings rise", sub: "Money keywords climb" },
    { label: "AI citations increase", sub: "You appear in AI answers" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: "380px" }}>
      {steps.map(({ label, sub }, i) => (
        <div key={label}>
          <div style={{ background: i % 2 === 0 ? C.soft : C.white, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: gradBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, color: C.white }}>
              {i + 1}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: C.navy, marginBottom: "0.1rem" }}>{label}</p>
              <p style={{ fontSize: "0.75rem", color: C.body }}>{sub}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ display: "flex", justifyContent: "center", padding: "0.25rem 0" }} aria-hidden="true">
              <svg width="12" height="16" viewBox="0 0 12 16" fill="none"><path d="M6 0V12M6 12L2 8M6 12L10 8" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )}
        </div>
      ))}
      <div style={{ marginTop: "1.25rem", background: gradBg, borderRadius: "12px", padding: "0.875rem 1.25rem", textAlign: "center" }}>
        <p style={{ fontWeight: 700, color: C.white, fontSize: "0.875rem" }}>Trust transfers. Traffic validates. Rankings follow.</p>
      </div>
    </div>
  );
}



/* ─── VISUAL: screenshot placeholder ─── */
function ScreenshotPlaceholder({ label }: { label: string }) {
  return (
    <div style={{ aspectRatio: "16/9", border: `1px dashed ${C.border}`, borderRadius: "16px", background: C.soft, display: "flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
      <p style={{ fontSize: "0.8125rem", color: "#9CA3AF" }}>{label}</p>
    </div>
  );
}

/* ─── Guarantee icons ─── */
function RankingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M4 20L10 13L14 17L24 7" stroke="#A855F7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 24h20" stroke="#A855F7" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  );
}
function AIOverviewIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="3" y="9" width="19" height="13" rx="3" stroke="#A855F7" strokeWidth="1.75"/>
      <path d="M8 14h9M8 18h6" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="20" cy="8" r="4" fill="#7C3AED"/>
      <path d="M20 6v4M18 8h4" stroke="white" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );
}
function CitationIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M6 5C6 3.9 6.9 3 8 3H19C20.1 3 21 3.9 21 5V20L17 24H8C6.9 24 6 23.1 6 22V5Z" stroke="#A855F7" strokeWidth="1.75"/>
      <path d="M10 9h8M10 13h8M10 17h5" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M17 20V24L21 20H17" stroke="#A855F7" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─── FAQ data ─── */
const faqs = [
  { q: "Who is this best for?", a: "Brands competing in commercial search categories where recommendations, comparisons, and third-party authority influence buying decisions. SaaS, B2B services, category challengers, and any business where being recommended matters." },
  { q: "Is this SEO?", a: "Partly — but it goes beyond traditional SEO. AlwaysCited combines authority building, third-party content placement, AI citation optimisation, and ranking strategy. The goal is commercial outcomes: rankings, traffic, and leads — not just links." },
  { q: "How does this help with AI recommendations?", a: "AI systems rely heavily on trusted third-party sources. By placing your brand inside the pages those systems cite, we increase your chance of appearing in AI answers across Google, ChatGPT, Perplexity, Gemini, and Claude." },
  { q: "Why are already-ranking pages more powerful?", a: "Because Google already trusts them. If a page ranks and gets traffic, a link from that page carries more meaningful authority than a link from a page nobody visits. We target pages that have already earned trust — and engineer new ones that will." },
  { q: "What is a placement?", a: "A placement is a strategically created or secured article on a third-party publication, structured around a high-intent commercial query. It's engineered to rank, to be cited by AI systems, and to carry authority to your site via the 1+1 link structure." },
  { q: "What types of keywords do you target?", a: "High-intent commercial keywords, especially \"best\", \"top\", \"alternative\", \"software\", \"platform\", \"service\", and category comparison searches — the queries where buying decisions are made." },
  { q: "How long does it take?", a: "Most campaigns run over 2–4 weeks, with ranking and AI visibility effects compounding over time. First AI citations typically appear within 1–4 weeks of a placement going live." },
];

export default function HomePage() {
  return (
    <>
      {/* ════════════════════════════════════════
          SECTION 1 — HERO
      ════════════════════════════════════════ */}
      <section style={{ background: C.white, padding: "6rem 1.5rem 5rem", position: "relative", overflow: "hidden" }}>
        {/* Gradient wash orbs */}
        <div className="gradient-orb" style={{ width: "600px", height: "600px", background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)", position: "absolute", top: "-200px", right: "-100px" }} aria-hidden="true" />
        <div className="gradient-orb" style={{ width: "400px", height: "400px", background: "radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)", position: "absolute", bottom: "-80px", left: "-80px", animationDelay: "-12s" }} aria-hidden="true" />

        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center", position: "relative" }}>
          <h1 style={{ fontWeight: 700, fontSize: "clamp(2.75rem, 6vw, 4.25rem)", lineHeight: 1.05, color: C.navy, letterSpacing: "-0.03em", marginBottom: "1.375rem" }}>
            Be the brand <span style={grad}>AI recommends.</span>
          </h1>

          <p style={{ color: C.body, fontSize: "1.1875rem", lineHeight: 1.65, maxWidth: "580px", margin: "0 auto 1rem" }}>
            AlwaysCited places you inside the pages Google and ChatGPT already trust — so you rank higher, get cited more often, and reach buyers before your competitors do.
          </p>

          <p style={{ fontSize: "0.875rem", color: "#9CA3AF", marginBottom: "2.5rem" }}>
            Built for B2B SaaS, professional services, and considered-purchase commercial brands.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/contact" className="btn-primary">Book a strategy call</a>
            <a href="#how-it-works" style={{ display: "inline-block", background: "transparent", color: C.navy, padding: "0.875rem 2rem", borderRadius: "12px", fontWeight: 600, fontSize: "1rem", textDecoration: "none", border: `1.5px solid ${C.border}` }}>
              See how it works
            </a>
          </div>

          <HeroAuthorityFlow />
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 2 — PROOF BAND
      ════════════════════════════════════════ */}
      <ProofBand />

      {/* ════════════════════════════════════════
          SECTION 3 — THE SHIFT (consolidated)
      ════════════════════════════════════════ */}
      <section id="why-it-works" style={{ background: C.white, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(1.875rem, 4vw, 2.75rem)", color: C.navy, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
              Search is no longer a list of links.
            </h2>
            <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: "620px", margin: "0 auto" }}>
              Google, ChatGPT, Perplexity, Gemini, and Claude now answer commercial queries directly — and the brands they cite become the shortlist. Those citations pull from the same third-party sources that rank in organic search: comparison pages, listicles, editorial roundups. If you appear there, AI picks you up. If you don&apos;t, you don&apos;t exist.
            </p>
          </div>

          <GoogleAIOPreview />

          <p style={{ textAlign: "center", fontWeight: 700, fontSize: "1.25rem", color: C.navy, marginTop: "2.5rem" }}>
            If you&apos;re not cited, you&apos;re invisible.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 4 — ONE PLACEMENT, THREE OUTCOMES
      ════════════════════════════════════════ */}
      <section style={{ background: C.soft, padding: "5rem 1.5rem" }}>
        <div style={{ ...wrap, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "5rem", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: C.purple, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "1rem" }}>How it compounds</span>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: C.navy, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
              One placement.{" "}
              <span style={grad}>Three commercial outcomes.</span>
            </h2>
            <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "1.75rem" }}>
              Every placement is engineered to drive authority, traffic, and leads simultaneously — not just a link.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { icon: "↑", label: "Google rankings", desc: "Your pages gain ranking power from relevant, trusted placements on pages Google already crawls and trusts.", colour: "#10B981" },
                { icon: "✦", label: "AI citations", desc: "Your brand appears in AI answers because it's in the sources AI systems cite.", colour: C.purple },
                { icon: "→", label: "Referral traffic", desc: "Buyers arrive from pages they're already visiting with genuine commercial intent.", colour: "#3B82F6" },
              ].map(({ icon, label, desc, colour }) => (
                <div key={label} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <span style={{ width: "32px", height: "32px", borderRadius: "10px", background: `${colour}15`, border: `1.5px solid ${colour}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: colour, fontWeight: 700, fontSize: "1rem" }}>{icon}</span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.9375rem", color: C.navy, marginBottom: "0.2rem" }}>{label}</p>
                    <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.55 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "0.9375rem", color: C.body, fontWeight: 500, paddingTop: "1.5rem", borderTop: `1px solid ${C.border}` }}>
              Most agencies deliver one. We engineer all three.
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PlacementOutcomeAnimated />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 5 — CORE INSIGHT
      ════════════════════════════════════════ */}
      <section style={{ background: C.white, padding: "5rem 1.5rem" }}>
        <div style={{ ...wrap, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "5rem", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: C.purple, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "1rem" }}>The core insight</span>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: C.navy, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
              Google already trusts pages that rank.{" "}
              <span style={grad}>That trust can transfer to you.</span>
            </h2>
            <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              A link from a trusted, ranking page passes authority to your site. A link from a page nobody visits doesn&apos;t.
            </p>
            <p style={{ color: C.body, fontSize: "1rem", lineHeight: 1.7 }}>
              This is why we target pages that already rank and already get traffic — or create new pages engineered to do both.
            </p>
          </div>
          <div>
            <AnimatedAuthorityFlow />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 6 — HOW IT WORKS (3 steps)
      ════════════════════════════════════════ */}
      <section id="how-it-works" style={{ background: C.soft, padding: "5rem 1.5rem" }}>
        <div style={wrap}>
          {sectionHead("How AlwaysCited works.", "We place you where buying decisions are already being made.")}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {[
              {
                step: "1",
                title: "We find the placements that already move outcomes.",
                body: "We map the recommendation landscape — the keywords, listicles, AI citations, and third-party pages shaping decisions in your category. Then we screen every target for authority, real traffic, and niche relevance. Not vanity metrics.",
              },
              {
                step: "2",
                title: "We engineer the placement.",
                body: "We create or secure a placement structured around the right anchors: one brand link to your homepage, one exact-match anchor to the page that converts. Sometimes that means placing you inside pages Google already ranks. Sometimes it means engineering new ones designed to rank. Either way, the outcome is the same.",
              },
              {
                step: "3",
                title: "We measure rankings, citations, and traffic.",
                body: "We report on ranking movement, AI visibility, referral traffic, and leads — weekly. Every placement is measured against its commercial outcomes, not just its link metrics.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="card-hover" style={card}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: gradBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", fontSize: "0.875rem", fontWeight: 700, color: C.white }}>{step}</div>
                <h3 style={{ fontWeight: 700, fontSize: "1.0625rem", color: C.navy, marginBottom: "0.75rem", lineHeight: 1.3 }}>{title}</h3>
                <p style={{ color: C.body, lineHeight: 1.65, fontSize: "0.9375rem" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 7 — SELECTION CRITERIA
      ════════════════════════════════════════ */}
      <section style={{ background: C.white, padding: "5rem 1.5rem" }}>
        <div style={wrap}>
          {sectionHead("We don't place everywhere. We place where it moves outcomes.", "Every placement has to pass three filters.")}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
            {[
              { n: "01", title: "Authority", body: "The host needs to meet or beat the authority of pages currently being cited or ranked in your category. We don't place on weak domains." },
              { n: "02", title: "Real traffic", body: "A high-authority page with no visitors is a dead asset. We look for pages and domains with actual search demand — real people, real intent." },
              { n: "03", title: "Relevance", body: "Niche relevance matters. The closer the publication is to your category, the stronger the signal — to Google and to the AI systems that cite it." },
            ].map(({ n, title, body }) => (
              <div key={title} className="card-hover" style={{ ...card, display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.5rem", fontWeight: 700, color: C.border, lineHeight: 1, flexShrink: 0, fontFamily: "monospace" }}>{n}</span>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: "1.0625rem", color: C.navy, marginBottom: "0.5rem" }}>{title}</h3>
                  <p style={{ color: C.body, fontSize: "0.9375rem", lineHeight: 1.65 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 8 — LINK ARCHITECTURE
      ════════════════════════════════════════ */}
      <section style={{ background: C.soft, padding: "5rem 1.5rem" }}>
        <div style={{ ...wrap, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "5rem", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: C.purple, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "1rem" }}>Link architecture</span>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", color: C.navy, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
              Two engineered links. One compounding asset.
            </h2>
            <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>
              Every placement is structured to build brand authority and move the pages that convert.
            </p>
            <p style={{ color: C.body, fontSize: "1rem", lineHeight: 1.7 }}>
              The brand anchor strengthens your domain. The exact-match anchor helps move the page that earns revenue. Same placement. Two outcomes.
            </p>
          </div>
          <AnimatedLinkDiagram />
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 9 — COMPARISON TABLE
      ════════════════════════════════════════ */}
      <section style={{ background: C.white, padding: "5rem 1.5rem" }}>
        <div style={wrap}>
          {sectionHead("Most link building stops at the link.", "AlwaysCited builds assets that appreciate.")}

          <AnimatedComparisonTable />

          <p style={{ marginTop: "2rem", textAlign: "center", fontWeight: 600, color: C.navy, fontSize: "1rem" }}>
            Same budget. Different category of result.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 10 — QUOTE BAND
      ════════════════════════════════════════ */}
      <section style={{ background: C.navy, padding: "4.5rem 1.5rem" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", lineHeight: 1.3, letterSpacing: "-0.02em", color: C.white }}>
            The goal is not to get a link.{" "}
            <span style={grad}>The goal is to become part of the answer.</span>
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 11 — PROOF / CASE STUDIES
      ════════════════════════════════════════ */}
      <section id="proof" style={{ background: C.soft, padding: "5rem 1.5rem" }}>
        <div style={wrap}>
          {sectionHead("Proof that the system compounds.")}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {/* Vibe Retail */}
            <div style={card}>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: C.purple, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>SaaS · Retail Technology</p>
              <h3 style={{ fontWeight: 700, fontSize: "1.25rem", color: C.navy, lineHeight: 1.25, marginBottom: "1.25rem" }}>From DR 0 to position #1 in 8 weeks.</h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {[
                  { val: "0 → 35", label: "Domain rating" },
                  { val: "#83 → #1", label: "Primary keyword" },
                  { val: "3", label: "AI Overview citations" },
                  { val: "20%", label: "ChatGPT visibility" },
                ].map(({ val, label }) => (
                  <div key={label} style={{ background: C.soft, borderRadius: "12px", padding: "0.875rem" }}>
                    <p style={{ ...grad, fontWeight: 700, fontSize: "1.25rem", lineHeight: 1, marginBottom: "0.25rem" }}>{val}</p>
                    <p style={{ fontSize: "0.75rem", color: C.body }}>{label}</p>
                  </div>
                ))}
              </div>

              <p style={{ color: C.body, fontSize: "0.875rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>
                The placements ranked. Their traffic compounded. Authority transferred through the right anchors. And the page that converts climbed to #1.
              </p>
              <ScreenshotPlaceholder label="Google AI Overview screenshot — add before launch" />
            </div>

            {/* Vismo */}
            <div style={card}>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: C.purple, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>B2B SaaS · Public Safety</p>
              <h3 style={{ fontWeight: 700, fontSize: "1.25rem", color: C.navy, lineHeight: 1.25, marginBottom: "1.25rem" }}>Off page one to ranking 3rd in a single wave.</h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {[
                  { val: "#3", label: "\"Mass notification systems\"" },
                  { val: "✓", label: "Google AI Overview" },
                  { val: "3", label: "Engineered placements" },
                  { val: "Niche", label: "Coded domains" },
                ].map(({ val, label }) => (
                  <div key={label} style={{ background: C.soft, borderRadius: "12px", padding: "0.875rem" }}>
                    <p style={{ ...grad, fontWeight: 700, fontSize: "1.25rem", lineHeight: 1, marginBottom: "0.25rem" }}>{val}</p>
                    <p style={{ fontSize: "0.75rem", color: C.body }}>{label}</p>
                  </div>
                ))}
              </div>

              <p style={{ color: C.body, fontSize: "0.875rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>
                Different sector, same system. Relevant authority, engineered placements, measurable movement. Niche-coded domains outperformed generic high-DR alternatives.
              </p>
              <ScreenshotPlaceholder label="Ranking chart screenshot — add before launch" />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 12 — GUARANTEE BAND
      ════════════════════════════════════════ */}
      <section style={{ background: C.navy, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: C.white, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: "3rem" }}>
            The only agency that puts{" "}
            <span style={grad}>outcomes in the contract.</span>
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "2rem", marginBottom: "2.5rem" }}>
            {[
              { Icon: RankingIcon, label: "Ranking growth" },
              { Icon: AIOverviewIcon, label: "AI Overview inclusion" },
              { Icon: CitationIcon, label: "LLM citations" },
            ].map(({ Icon, label }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.875rem" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "16px", background: "rgba(168,85,247,0.12)", border: "1.5px solid rgba(168,85,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon />
                </div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: C.white }}>{label}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "1.25rem", fontWeight: 700, color: C.white, marginBottom: "2rem" }}>
            If we don&apos;t deliver one of these, you don&apos;t pay.
          </p>

          <a href="#pricing" style={{ display: "inline-block", background: "transparent", color: C.white, padding: "0.875rem 2rem", borderRadius: "12px", fontWeight: 600, fontSize: "1rem", textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.25)" }}>
            See the proof package
          </a>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 13 — PRICING
      ════════════════════════════════════════ */}
      <section id="pricing" style={{ background: C.white, padding: "5rem 1.5rem" }}>
        <div style={{ ...wrap, maxWidth: "720px" }}>
          {sectionHead("A proof package for AI-era search.", undefined, true)}

          <div style={{ ...card, border: `1.5px solid rgba(124,58,237,0.3)`, boxShadow: "0 8px 40px rgba(124,58,237,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
              <div>
                <p style={{ ...grad, fontWeight: 700, fontSize: "1.375rem", marginBottom: "0.25rem" }}>The Proof Package</p>
                <p style={{ color: C.body, fontSize: "0.9375rem" }}>AlwaysCited productised into a defined campaign.</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontWeight: 700, fontSize: "1.5rem", color: C.navy }}>From £1,195</p>
                <p style={{ fontSize: "0.8125rem", color: C.body }}>three-placement engagement</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              {[
                "3 engineered placements",
                "1 agreed keyword cluster",
                "Authority, traffic & relevance screening",
                "1+1 link structure on every placement",
                "AI visibility + ranking reporting",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: gradBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden="true"><path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span style={{ fontSize: "0.9rem", color: C.navy, fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ background: C.soft, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: C.navy, marginBottom: "0.25rem" }}>Guarantee</p>
              <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.6 }}>
                Ranking growth, AI Overview inclusion, or LLM citations — or your money back.
              </p>
            </div>

            <a href="/contact" className="btn-primary" style={{ display: "inline-block" }}>Book a strategy call</a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 14 — FAQ
      ════════════════════════════════════════ */}
      <section id="faq" style={{ background: C.soft, padding: "5rem 1.5rem" }}>
        <div style={{ ...wrap, maxWidth: "720px" }}>
          <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)", color: C.navy, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "3rem", textAlign: "center" }}>
            Frequently asked questions.
          </h2>
          <div style={{ borderTop: `1px solid ${C.border}` }}>
            {faqs.map((faq) => (
              <details key={faq.q} className="card-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", padding: "1.375rem 0", cursor: "pointer", color: C.navy, fontWeight: 600, fontSize: "1rem", listStyle: "none" }}>
                  <span>{faq.q}</span>
                  <span style={{ color: C.purple, fontSize: "1.25rem", lineHeight: 1, flexShrink: 0 }}>+</span>
                </summary>
                <p style={{ color: C.body, lineHeight: 1.7, paddingBottom: "1.375rem", fontSize: "0.9375rem" }}>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 15 — FINAL CTA
      ════════════════════════════════════════ */}
      <CtaSection />
    </>
  );
}
