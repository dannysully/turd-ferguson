import type { Metadata } from "next";
import CtaSection from "@/components/CtaSection";

export const metadata: Metadata = {
  title: "getcited — Be the brand AI recommends",
  description:
    "getcited helps you win visibility across Google, AI search, and recommendation platforms by getting your brand featured, cited, and ranked on authoritative third-party content.",
  alternates: { canonical: "https://getcited.com" },
  openGraph: {
    title: "getcited — Be the brand AI recommends",
    description:
      "Win the recommendation layer across AI + search. Become the most recommended brand on every platform that matters.",
    url: "https://getcited.com",
  },
};

/* ─── shared style helpers ─── */
const container: React.CSSProperties = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "0 1.5rem",
};

const gradientText: React.CSSProperties = {
  background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #E5E7EB",
  borderRadius: "16px",
  padding: "2rem",
  boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
};

const purpleBtn: React.CSSProperties = {
  display: "inline-block",
  background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
  color: "#ffffff",
  padding: "0.875rem 2rem",
  borderRadius: "12px",
  fontWeight: 600,
  fontSize: "1rem",
  textDecoration: "none",
  boxShadow: "0 4px 20px rgba(124,58,237,0.28)",
};

const ghostBtn: React.CSSProperties = {
  display: "inline-block",
  background: "transparent",
  color: "#7C3AED",
  padding: "0.875rem 2rem",
  borderRadius: "12px",
  fontWeight: 600,
  fontSize: "1rem",
  textDecoration: "none",
  border: "1.5px solid #7C3AED",
};

const sectionPad = "5rem 1.5rem";
const sectionPadAlt = "5rem 1.5rem";

/* ─── Dashboard mockup (hero visual) ─── */
function DashboardMockup() {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "20px",
        border: "1px solid #E5E7EB",
        boxShadow: "0 8px 48px rgba(124,58,237,0.12), 0 2px 16px rgba(0,0,0,0.06)",
        overflow: "hidden",
        width: "100%",
        maxWidth: "520px",
      }}
    >
      {/* Window chrome */}
      <div style={{ background: "#F8F7FF", borderBottom: "1px solid #E5E7EB", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {["#FF5F57","#FEBC2E","#28C840"].map((c) => (
          <span key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c, display: "block" }} />
        ))}
        <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#9CA3AF", fontWeight: 500 }}>getcited dashboard</span>
      </div>

      <div style={{ padding: "1.25rem" }}>
        {/* Top stat row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
          {[
            { label: "AI Citations", value: "94%", up: true },
            { label: "Recommendations", value: "#1", up: true },
            { label: "Platforms", value: "6/6", up: true },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#F8F7FF", borderRadius: "10px", padding: "0.75rem", textAlign: "center" }}>
              <p style={{ ...gradientText, fontSize: "1.4rem", fontWeight: 700, lineHeight: 1, marginBottom: "0.25rem" }}>{value}</p>
              <p style={{ fontSize: "0.7rem", color: "#6B7280", fontWeight: 500 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Platform list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          {[
            { name: "ChatGPT", pct: 91, color: "#10B981" },
            { name: "Google AI Overview", pct: 87, color: "#7C3AED" },
            { name: "Perplexity", pct: 78, color: "#3B82F6" },
            { name: "Bing Copilot", pct: 65, color: "#F59E0B" },
          ].map(({ name, pct, color }) => (
            <div key={name}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#4B5563", fontWeight: 500 }}>{name}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color }}>#{Math.round((100 - pct) / 12) + 1} cited</span>
              </div>
              <div style={{ background: "#F3F4F6", borderRadius: "99px", height: "6px" }}>
                <div style={{ background: color, borderRadius: "99px", height: "6px", width: `${pct}%`, transition: "width 0.4s ease" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Citation pill */}
        <div style={{ background: "linear-gradient(135deg, #7C3AED15, #A855F715)", border: "1px solid #A855F740", borderRadius: "10px", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg,#7C3AED,#A855F7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: "0.8rem" }}>✦</span>
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0B1220", marginBottom: "0.1rem" }}>New citation detected</p>
            <p style={{ fontSize: "0.7rem", color: "#6B7280" }}>Your brand is now #1 in &ldquo;best [category] tools 2026&rdquo;</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Icon blobs ─── */
function Icon({ emoji }: { emoji: string }) {
  return (
    <div style={{
      width: "44px", height: "44px", borderRadius: "12px",
      background: "linear-gradient(135deg, #7C3AED18, #A855F728)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "1.25rem", marginBottom: "1rem", flexShrink: 0,
    }}>
      {emoji}
    </div>
  );
}

const faqs = [
  {
    q: "What does getcited do?",
    a: "getcited secures your brand's presence in the editorial sources that AI systems, buyers, and comparison platforms rely on. We identify where decisions in your category are being made, then position your brand as the top recommendation in those places.",
  },
  {
    q: "Is this SEO?",
    a: "No. SEO targets your website's ranking on a search results page. getcited targets the recommendation layer — the listicles, comparison pages, and editorial sources that AI systems cite when buyers ask who to choose. The two can complement each other, but they're different disciplines.",
  },
  {
    q: "How does this help with AI search?",
    a: "When a buyer asks ChatGPT, Perplexity, or Google's AI Overview for a recommendation, the AI cites editorial sources it already trusts. By positioning your brand at the top of those sources, you become the brand AI returns. We engineer that placement directly.",
  },
  {
    q: "What sites do you target?",
    a: "High-authority editorial sites with real organic traffic in your specific category — industry publications, comparison platforms, analyst lists, and vertical-specific \"best of\" resources. We identify which sites your target AI systems and buyers actually rely on, then focus exclusively on those.",
  },
  {
    q: "How long does it take?",
    a: "First measurable AI citations typically appear within 1–4 weeks of a placement going live. Sustained presence across 50%+ of tracked prompts usually builds over 4–8 weeks. Traditional SEO equivalent timelines run 3–6 months. We move faster because we're working with sources the AI already trusts.",
  },
  {
    q: "Who is this for?",
    a: "SaaS founders and growth leaders who want to own the recommendation layer in their category. CMOs at brands being outpaced by competitors in AI search. Agencies looking to offer AI visibility as a service. Category challengers who can't win on budget alone but can win on positioning.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── 1. HERO ── */}
      <section className="hero" style={{ background: "#ffffff", padding: "5rem 1.5rem 4rem" }}>
        <div style={{ ...container, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}
          className="hero-grid">
          {/* Left */}
          <div className="hero-content">
            {/* Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#F8F7FF", border: "1px solid #E5E7EB", borderRadius: "99px", padding: "0.35rem 0.875rem", marginBottom: "1.75rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "linear-gradient(135deg,#7C3AED,#A855F7)", display: "inline-block" }} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#7C3AED" }}>The AI recommendation platform</span>
            </div>

            <h1 className="hero-heading" style={{ fontWeight: 700, fontSize: "clamp(2.5rem, 5vw, 3.75rem)", lineHeight: 1.1, color: "#0B1220", letterSpacing: "-0.03em", marginBottom: "1.25rem" }}>
              Be the brand{" "}
              <span style={gradientText}>AI recommends.</span>
            </h1>

            <p className="hero-subtext" style={{ color: "#4B5563", fontSize: "1.125rem", lineHeight: 1.65, marginBottom: "2rem", maxWidth: "440px" }}>
              getcited helps you win visibility across Google, AI search, and recommendation platforms by getting your brand featured, cited, and ranked on authoritative third-party content.
            </p>

            <div className="hero-cta" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a href="/contact" style={purpleBtn}>Book a strategy call</a>
              <a href="#how-it-works" style={ghostBtn}>See how it works</a>
            </div>

            {/* Social proof strip */}
            <div style={{ marginTop: "2.5rem", display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
              {[
                { val: "94%", label: "avg. AI citation rate" },
                { val: "1–4 wks", label: "time to first citation" },
                { val: "6 platforms", label: "covered per campaign" },
              ].map(({ val, label }) => (
                <div key={label}>
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0B1220" }}>{val}</span>
                  <span style={{ fontSize: "0.8125rem", color: "#6B7280", marginLeft: "0.375rem" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — dashboard */}
          <div className="hero-visual" style={{ display: "flex", justifyContent: "flex-end" }}>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── 2. PROBLEM ── */}
      <section id="why-it-matters" style={{ background: "#F8F7FF", padding: sectionPad }}>
        <div style={container}>
          <div style={{ textAlign: "center", maxWidth: "580px", margin: "0 auto 3.5rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: "#0B1220", lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
              Your customers are asking AI who to choose.
            </h2>
            <p style={{ color: "#4B5563", fontSize: "1.0625rem", lineHeight: 1.65 }}>
              Search has changed. Buyers aren&apos;t just clicking links — they&apos;re asking AI, reading listicles, and trusting recommendations. If your competitors are cited more often, they win before you even show up.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {[
              { emoji: "🤖", title: "AI is the new discovery layer", body: "ChatGPT, Perplexity, and Google's AI Overview answer buyer questions before they click anything. The brands cited in those answers win the shortlist." },
              { emoji: "📋", title: "Recommendations drive decisions", body: "Buyers trust \"best of\" lists and comparison pages more than ads. The brand at position #1 in those editorial sources becomes the default choice." },
              { emoji: "🏆", title: "The most cited brand becomes the default", body: "Repeated citation across trusted sources builds compounding authority. Once you own the recommendation layer, competitors can't easily displace you." },
            ].map(({ emoji, title, body }) => (
              <div key={title} className="card" style={card}>
                <Icon emoji={emoji} />
                <h3 className="card-title" style={{ fontWeight: 600, fontSize: "1.0625rem", color: "#0B1220", marginBottom: "0.625rem" }}>{title}</h3>
                <p className="card-text" style={{ color: "#4B5563", lineHeight: 1.65, fontSize: "0.9375rem" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. SOLUTION ── */}
      <section style={{ background: "#ffffff", padding: sectionPad }}>
        <div style={{ ...container, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "4rem", alignItems: "center" }}>
          {/* Left text */}
          <div>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "1rem" }}>The solution</span>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", color: "#0B1220", lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
              We make your brand the obvious recommendation.
            </h2>
            <p style={{ color: "#4B5563", fontSize: "1.0625rem", lineHeight: 1.65, marginBottom: "2rem" }}>
              We identify the platforms, pages, and opportunities that shape decisions in your category — then position your brand as the top choice.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {[
                "Authority listicle placement",
                "Comparison page positioning",
                "Recommendation-first content",
                "AI visibility optimisation",
              ].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#0B1220", fontWeight: 500, fontSize: "0.9375rem" }}>
                  <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "linear-gradient(135deg,#7C3AED,#A855F7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right illustration */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { platform: "ChatGPT", query: "best project management tool for startups", brand: "Your Brand", rank: "#1 Recommended" },
              { platform: "Google AI Overview", query: "top CRM for B2B SaaS", brand: "Your Brand", rank: "Top Citation" },
              { platform: "Perplexity", query: "which analytics platform is best in 2026", brand: "Your Brand", rank: "#1 Cited" },
            ].map(({ platform, query, brand, rank }) => (
              <div key={platform} style={{ ...card, padding: "1.25rem 1.5rem", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,#7C3AED,#A855F7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1rem" }}>
                  ✦
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#7C3AED" }}>{platform}</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#10B981", background: "#D1FAE5", padding: "0.2rem 0.5rem", borderRadius: "99px", whiteSpace: "nowrap" }}>{rank}</span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: "0.375rem" }}>&ldquo;{query}&rdquo;</p>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0B1220" }}>{brand} ✓</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS ── */}
      <section id="how-it-works" style={{ background: "#F8F7FF", padding: sectionPad }}>
        <div style={container}>
          <div style={{ textAlign: "center", maxWidth: "520px", margin: "0 auto 3.5rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: "#0B1220", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              How it works.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
            {[
              { step: "01", emoji: "🗺️", title: "Map your category", body: "We analyse where decisions are being influenced — which AI systems, which publications, which comparison platforms your buyers trust." },
              { step: "02", emoji: "🎯", title: "Find authority opportunities", body: "We identify the specific sites and pages that AI systems are already citing in your category. These are your highest-leverage targets." },
              { step: "03", emoji: "✍️", title: "Create recommendation content", body: "We secure editorial placements that position your brand as the top choice — structured to be cited by both AI systems and human buyers." },
              { step: "04", emoji: "📈", title: "Track visibility", body: "We measure your rankings, citations across AI platforms, and presence across tracked prompts — weekly reporting on what's moving." },
            ].map(({ step, emoji, title, body }) => (
              <div key={step} className="card" style={{ ...card, position: "relative", paddingTop: "2.5rem" }}>
                <span style={{ position: "absolute", top: "1.25rem", right: "1.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#E5E7EB", letterSpacing: "0.04em" }}>{step}</span>
                <Icon emoji={emoji} />
                <h3 style={{ fontWeight: 600, fontSize: "1rem", color: "#0B1220", marginBottom: "0.625rem" }}>{title}</h3>
                <p style={{ color: "#4B5563", lineHeight: 1.65, fontSize: "0.9rem" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. BENEFITS ── */}
      <section style={{ background: "#ffffff", padding: sectionPad }}>
        <div style={container}>
          <div style={{ textAlign: "center", maxWidth: "520px", margin: "0 auto 3.5rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: "#0B1220", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              Own the recommendation layer.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {[
              { emoji: "📝", title: "Rank in high-intent listicles", body: "Appear in the editorial sources buyers read right before making a purchase decision." },
              { emoji: "🥇", title: "Appear above competitors", body: "Be positioned as the #1 recommendation, not buried halfway down a comparison page." },
              { emoji: "🏛️", title: "Build authority signals", body: "Accumulate citations from trusted publications that compound over time." },
              { emoji: "🤖", title: "Increase AI citations", body: "Become the brand ChatGPT, Perplexity, and Google AI repeat back when buyers ask." },
              { emoji: "🤝", title: "Win trust earlier", body: "Influence buyer decisions before they ever visit your website or speak to sales." },
              { emoji: "📊", title: "Compound visibility over time", body: "Each new placement reinforces existing citations — your authority grows with every campaign month." },
            ].map(({ emoji, title, body }) => (
              <div key={title} style={{ ...card, display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.375rem", flexShrink: 0, marginTop: "0.1rem" }}>{emoji}</span>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#0B1220", marginBottom: "0.375rem" }}>{title}</h3>
                  <p style={{ color: "#4B5563", fontSize: "0.875rem", lineHeight: 1.6 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. BEFORE / AFTER ── */}
      <section id="results" style={{ background: "#F8F7FF", padding: sectionPadAlt }}>
        <div style={container}>
          <div style={{ textAlign: "center", maxWidth: "520px", margin: "0 auto 3.5rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: "#0B1220", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              From invisible to the default choice.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {/* Before */}
            <div style={{ ...card, borderColor: "#FECACA", background: "#FFF5F5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>Before</span>
              </div>
              {[
                "Not appearing in AI recommendations",
                "Competitors cited on every major listicle",
                "Invisible to buyers using AI to research",
                "Losing deals before the conversation starts",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.875rem" }}>
                  <span style={{ color: "#EF4444", fontSize: "1rem", lineHeight: 1, marginTop: "0.1rem", flexShrink: 0 }}>✕</span>
                  <span style={{ color: "#374151", fontSize: "0.9375rem", lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>

            {/* After */}
            <div style={{ ...card, borderColor: "#A855F740", background: "linear-gradient(135deg, #F8F7FF 0%, #fff 100%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.08em", ...gradientText }}>After getcited</span>
              </div>
              {[
                "You appear as the #1 recommended option across platforms",
                "Featured on every major editorial source in your category",
                "AI systems recommend you by name to active buyers",
                "Inbound interest from buyers who already trust you",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.875rem" }}>
                  <span style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.1rem" }}>
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span style={{ color: "#374151", fontSize: "0.9375rem", lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. CTA ── */}
      <CtaSection />

      {/* ── 8. FAQ ── */}
      <section id="faq" style={{ background: "#ffffff", padding: sectionPad }}>
        <div style={{ ...container, maxWidth: "720px" }}>
          <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)", color: "#0B1220", lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: "3rem", textAlign: "center" }}>
            Frequently asked questions.
          </h2>
          <div style={{ borderTop: "1px solid #E5E7EB" }}>
            {faqs.map((faq) => (
              <details key={faq.q} style={{ borderBottom: "1px solid #E5E7EB" }}>
                <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", padding: "1.375rem 0", cursor: "pointer", color: "#0B1220", fontWeight: 600, fontSize: "1rem", listStyle: "none" }}>
                  <span>{faq.q}</span>
                  <span style={{ color: "#7C3AED", fontSize: "1.25rem", lineHeight: 1, flexShrink: 0 }}>+</span>
                </summary>
                <p style={{ color: "#4B5563", lineHeight: 1.7, paddingBottom: "1.375rem", fontSize: "0.9375rem", maxWidth: "600px" }}>
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
