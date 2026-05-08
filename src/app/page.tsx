import type { Metadata } from "next";
import CtaSection from "@/components/CtaSection";

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
const sp = (v: string) => ({ padding: v });

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

/* ─── VISUAL: Hero placement flow ─── */
function HeroVisual() {
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "520px" }}>
      {/* Central placement card */}
      <div style={{ ...card, border: `1.5px solid rgba(124,58,237,0.3)`, boxShadow: "0 8px 40px rgba(124,58,237,0.14)", textAlign: "center", padding: "1.75rem 2rem", marginBottom: "1.25rem" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: gradBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.875rem" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L10.5 7.5L16 9L10.5 10.5L9 16L7.5 10.5L2 9L7.5 7.5L9 2Z" fill="white"/></svg>
        </div>
        <p style={{ fontWeight: 700, fontSize: "1rem", color: C.navy, marginBottom: "0.25rem" }}>High-authority placement</p>
        <p style={{ fontSize: "0.8125rem", color: C.body }}>Engineered. Relevant. Already trusted.</p>
      </div>

      {/* Three outcome cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem", marginBottom: "1.25rem" }}>
        {[
          { icon: "📈", label: "Google rankings", colour: "#10B981" },
          { icon: "✦", label: "AI citations", colour: C.purple },
          { icon: "🔗", label: "Referral traffic", colour: "#3B82F6" },
        ].map(({ icon, label, colour }) => (
          <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "1rem 0.75rem", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <span style={{ fontSize: "1.25rem", display: "block", marginBottom: "0.375rem" }}>{icon}</span>
            <p style={{ fontSize: "0.7rem", fontWeight: 600, color: colour }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Mock AI cards row */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {[
          { platform: "Google AI Overview", snippet: "Best platform in [your category]: YourBrand is recommended for…", color: "#4285F4" },
          { platform: "ChatGPT", snippet: "Based on trusted sources, YourBrand is considered the leading…", color: "#10A37F" },
          { platform: "Perplexity", snippet: "According to [publication], YourBrand ranks #1 for…", color: "#6366F1" },
        ].map(({ platform, snippet, color }) => (
          <div key={platform} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "0.875rem 1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0, marginTop: "0.35rem" }} />
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
            <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: gradBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>
              {i + 1}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: C.navy, marginBottom: "0.1rem" }}>{label}</p>
              <p style={{ fontSize: "0.75rem", color: C.body }}>{sub}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ display: "flex", justifyContent: "center", padding: "0.25rem 0" }}>
              <svg width="12" height="16" viewBox="0 0 12 16" fill="none"><path d="M6 0V12M6 12L2 8M6 12L10 8" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )}
        </div>
      ))}
      <div style={{ marginTop: "1.25rem", background: gradBg, borderRadius: "12px", padding: "0.875rem 1.25rem", textAlign: "center" }}>
        <p style={{ fontWeight: 700, color: "#fff", fontSize: "0.875rem" }}>Trust transfers. Traffic validates. Rankings follow.</p>
      </div>
    </div>
  );
}

/* ─── VISUAL: 1+1 link structure diagram ─── */
function LinkStructureDiagram() {
  return (
    <div style={{ ...card, border: `1.5px solid rgba(124,58,237,0.2)`, maxWidth: "440px" }}>
      {/* Article header */}
      <div style={{ background: C.soft, borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "0.7rem", color: C.body, marginBottom: "0.375rem" }}>Article · DA 74 · 3,200 monthly visitors</p>
        <p style={{ fontWeight: 700, color: C.navy, fontSize: "0.9375rem" }}>&ldquo;Best [Category] Platforms for 2026&rdquo;</p>
      </div>
      {/* Two links */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div style={{ background: C.white, border: `1px solid rgba(124,58,237,0.25)`, borderRadius: "12px", padding: "0.875rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: gradBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>1</span>
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: C.purple, marginBottom: "0.1rem" }}>Brand anchor → Homepage</p>
            <p style={{ fontSize: "0.7rem", color: C.body }}>&ldquo;YourBrand&rdquo; — builds domain authority</p>
          </div>
        </div>
        <div style={{ background: C.white, border: `1px solid rgba(124,58,237,0.25)`, borderRadius: "12px", padding: "0.875rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: gradBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>2</span>
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: C.purple, marginBottom: "0.1rem" }}>Money keyword anchor → Deep page</p>
            <p style={{ fontSize: "0.7rem", color: C.body }}>&ldquo;best [category] software&rdquo; — moves the page that earns</p>
          </div>
        </div>
      </div>
      <div style={{ background: C.soft, borderRadius: "10px", padding: "0.75rem 1rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: C.navy }}>This is link architecture, not link volume.</p>
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

/* ─── FAQ data ─── */
const faqs = [
  { q: "Is this SEO?", a: "Partly — but it goes beyond traditional SEO. AlwaysCited combines authority building, third-party content placement, AI citation optimisation, and ranking strategy. The goal is commercial outcomes: rankings, traffic, and leads — not just links." },
  { q: "How does this help with AI recommendations?", a: "AI systems rely heavily on trusted third-party sources. By placing your brand inside the pages those systems cite, we increase your chance of appearing in AI answers across Google, ChatGPT, Perplexity, Gemini, and Claude." },
  { q: "Why are already-ranking pages more powerful?", a: "Because Google already trusts them. If a page ranks and gets traffic, a link from that page carries more meaningful authority than a link from a page nobody visits. We target pages that have already earned trust — and engineer new ones that will." },
  { q: "What is a placement?", a: "A placement is a strategically created or secured article on a third-party publication, structured around a high-intent commercial query. It's engineered to rank, to be cited by AI systems, and to carry authority to your site via the 1+1 link structure." },
  { q: "What types of keywords do you target?", a: 'High-intent commercial keywords, especially "best", "top", "alternative", "software", "platform", "service", and category comparison searches — the queries where buying decisions are made.' },
  { q: "How long does it take?", a: "Most campaigns run over 2–4 weeks, with ranking and AI visibility effects compounding over time. First AI citations typically appear within 1–4 weeks of a placement going live." },
  { q: "Who is this best for?", a: "Brands competing in commercial search categories where recommendations, comparisons, and third-party authority influence buying decisions. SaaS, B2B services, category challengers, and any business where being recommended matters." },
];

export default function HomePage() {
  return (
    <>
      {/* ════════════════════════════════════════
          SECTION 1 — HERO
      ════════════════════════════════════════ */}
      <section style={{ background: C.white, ...sp("5rem 1.5rem 4rem") }}>
        <div style={{ ...wrap, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }} className="hero-grid">
          <div className="hero-content">
            {/* Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: C.soft, border: `1px solid ${C.border}`, borderRadius: "99px", padding: "0.35rem 0.875rem", marginBottom: "1.75rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: gradBg, display: "inline-block" }} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: C.purple }}>AI-era authority engineering</span>
            </div>

            <h1 style={{ fontWeight: 700, fontSize: "clamp(2.5rem, 5vw, 3.75rem)", lineHeight: 1.1, color: C.navy, letterSpacing: "-0.03em", marginBottom: "1.25rem" }}>
              Be the brand <span style={grad}>AI recommends.</span>
            </h1>

            <p style={{ color: C.body, fontSize: "1.125rem", lineHeight: 1.65, marginBottom: "2rem", maxWidth: "440px" }}>
              AlwaysCited places your brand inside the pages Google and AI systems already trust — so you rank higher, get cited more often, and win buyers before they reach your competitors.
            </p>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a href="/contact" className="btn-primary">Book a strategy call</a>
              <a href="#how-it-works" style={{ display: "inline-block", background: "transparent", color: C.navy, padding: "0.875rem 2rem", borderRadius: "12px", fontWeight: 600, fontSize: "1rem", textDecoration: "none", border: `1.5px solid ${C.border}` }}>
                See how it works
              </a>
            </div>

            {/* One placement tagline */}
            <div style={{ marginTop: "2.5rem", paddingTop: "2rem", borderTop: `1px solid ${C.border}` }}>
              <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: C.navy, marginBottom: "0.5rem" }}>One placement. Three commercial outcomes.</p>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                {["↑ Rankings", "✦ AI citations", "→ Referral traffic"].map((item) => (
                  <span key={item} style={{ fontSize: "0.8125rem", color: C.body, fontWeight: 500 }}>{item}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="hero-visual" style={{ display: "flex", justifyContent: "flex-end" }}>
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 2 — THE SHIFT
      ════════════════════════════════════════ */}
      <section id="why-it-works" style={{ background: C.soft, ...sp("5rem 1.5rem") }}>
        <div style={wrap}>
          {sectionHead(
            "Search is no longer a list of links.",
            "Buyers now ask Google, ChatGPT, Perplexity, Gemini, and Claude who to trust. The brands cited in those answers become the shortlist."
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
            {[
              { icon: "🔍", title: "Google AI Overviews", body: "Commercial searches now surface AI answers before traditional organic results. If you're not cited in the AI answer, you've already lost the impression." },
              { icon: "🤖", title: "LLM recommendations", body: "ChatGPT, Perplexity, Claude, and Gemini pull from trusted third-party sources. The brands they cite are the brands on the buyer's shortlist." },
              { icon: "📋", title: "Third-party listicles", body: '"Best of" pages increasingly shape who gets recommended — and who gets ignored. They also drive the AI citations that follow.' },
            ].map(({ icon, title, body }) => (
              <div key={title} style={card}>
                <span style={{ fontSize: "1.5rem", display: "block", marginBottom: "1rem" }}>{icon}</span>
                <h3 style={{ fontWeight: 600, fontSize: "1.0625rem", color: C.navy, marginBottom: "0.625rem" }}>{title}</h3>
                <p style={{ color: C.body, lineHeight: 1.65, fontSize: "0.9375rem" }}>{body}</p>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", fontWeight: 700, fontSize: "1.25rem", color: C.navy }}>
            If you&apos;re not cited, you&apos;re invisible.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 3 — CORE INSIGHT
      ════════════════════════════════════════ */}
      <section style={{ background: C.white, ...sp("5rem 1.5rem") }}>
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
            <AuthorityFlow />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 4 — ONE PLACEMENT, THREE OUTCOMES
      ════════════════════════════════════════ */}
      <section style={{ background: C.soft, ...sp("5rem 1.5rem") }}>
        <div style={wrap}>
          {sectionHead(
            "One placement. Three commercial outcomes.",
            "Every placement is engineered to drive authority, traffic, and leads — not just links."
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
            {[
              { n: "01", icon: "🏛️", title: "Authority", body: "Your pages gain ranking power from trusted, relevant placements on pages Google already crawls and trusts." },
              { n: "02", icon: "→", title: "Traffic", body: "Your brand appears on pages buyers are already visiting — driving referral traffic with genuine commercial intent." },
              { n: "03", icon: "💬", title: "Leads", body: "You reach people actively searching for your category — at the moment they're evaluating who to choose." },
            ].map(({ n, icon, title, body }) => (
              <div key={title} style={{ ...card, borderTop: `3px solid ${C.purple}`, position: "relative" }}>
                <span style={{ position: "absolute", top: "1.25rem", right: "1.5rem", fontSize: "0.75rem", fontWeight: 700, color: C.border }}>{n}</span>
                <span style={{ fontSize: "1.5rem", display: "block", marginBottom: "1rem" }}>{icon}</span>
                <h3 style={{ fontWeight: 700, fontSize: "1.25rem", color: C.navy, marginBottom: "0.625rem" }}>{title}</h3>
                <p style={{ color: C.body, lineHeight: 1.65, fontSize: "0.9375rem" }}>{body}</p>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", fontSize: "0.9375rem", color: C.body, fontWeight: 500 }}>
            Most agencies deliver one. We engineer all three.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 5 — HOW IT WORKS
      ════════════════════════════════════════ */}
      <section id="how-it-works" style={{ background: C.white, ...sp("5rem 1.5rem") }}>
        <div style={wrap}>
          {sectionHead(
            "How AlwaysCited works.",
            "We place you where buying decisions are already being made."
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.25rem" }}>
            {[
              { step: "1", icon: "🗺️", title: "Map the recommendation landscape", body: "We identify the keywords, listicles, AI citations, and third-party pages shaping decisions in your category." },
              { step: "2", icon: "🎯", title: "Select the right authority targets", body: "We screen for authority, real traffic, and niche relevance — not vanity DA/DR metrics." },
              { step: "3", icon: "✍️", title: "Create or secure the placement", body: "We either place your brand inside pages already ranking or create new editorial content engineered to rank." },
              { step: "4", icon: "🔗", title: "Build the 1+1 link structure", body: "One brand anchor builds homepage authority. One deep-page anchor moves the page that converts." },
              { step: "5", icon: "📊", title: "Track rankings, citations, and traffic", body: "We report on ranking movement, AI visibility, referral traffic, and leads — weekly." },
            ].map(({ step, icon, title, body }) => (
              <div key={step} style={{ ...card, padding: "1.5rem", position: "relative" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: gradBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", fontSize: "0.8125rem", fontWeight: 700, color: "#fff" }}>{step}</div>
                <span style={{ fontSize: "1.25rem", display: "block", marginBottom: "0.75rem" }}>{icon}</span>
                <h3 style={{ fontWeight: 600, fontSize: "0.9375rem", color: C.navy, marginBottom: "0.5rem", lineHeight: 1.3 }}>{title}</h3>
                <p style={{ color: C.body, lineHeight: 1.6, fontSize: "0.875rem" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 6 — TWO WAYS WE DELIVER
      ════════════════════════════════════════ */}
      <section style={{ background: C.soft, ...sp("5rem 1.5rem") }}>
        <div style={wrap}>
          {sectionHead("Two ways to place you where it matters.")}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {[
              {
                label: "Capture existing authority",
                description: "We place your brand inside pages Google already ranks for relevant commercial searches.",
                bullets: ["Already trusted by Google", "Already driving traffic", "Already influencing buyers", "Faster authority transfer"],
                outcome: "Immediate visibility + ranking power",
                accent: "#10B981",
              },
              {
                label: "Engineer new ranking pages",
                description: "We create editorial placements on high-authority publications and structure them to rank for high-intent searches.",
                bullets: ["Built around commercial keywords", "Structured for AI extraction", "Designed to rank", "Compounds over time"],
                outcome: "Scalable authority + traffic growth",
                accent: C.purple,
              },
            ].map(({ label, description, bullets, outcome, accent }) => (
              <div key={label} style={{ ...card, borderTop: `3px solid ${accent}` }}>
                <h3 style={{ fontWeight: 700, fontSize: "1.125rem", color: C.navy, marginBottom: "0.75rem" }}>{label}</h3>
                <p style={{ color: C.body, fontSize: "0.9375rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>{description}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {bullets.map((b) => (
                    <li key={b} style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.9rem", color: C.navy, fontWeight: 500 }}>
                      <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                <div style={{ background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: "10px", padding: "0.625rem 1rem" }}>
                  <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: accent }}>Outcome: {outcome}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 7 — SELECTION CRITERIA
      ════════════════════════════════════════ */}
      <section style={{ background: C.white, ...sp("5rem 1.5rem") }}>
        <div style={wrap}>
          {sectionHead(
            "We don't place everywhere. We place where it moves outcomes.",
            "Every placement has to pass three filters."
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
            {[
              { n: "01", title: "Authority", body: "The host needs to meet or beat the authority of pages currently being cited or ranked in your category. We don't place on weak domains." },
              { n: "02", title: "Real traffic", body: "A high-authority page with no visitors is a dead asset. We look for pages and domains with actual search demand — real people, real intent." },
              { n: "03", title: "Relevance", body: "Niche relevance matters. The closer the publication is to your category, the stronger the signal — to Google and to the AI systems that cite it." },
            ].map(({ n, title, body }) => (
              <div key={title} style={{ ...card, display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.5rem", fontWeight: 700, color: C.border, lineHeight: 1, flexShrink: 0, fontFamily: "monospace" }}>{n}</span>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: "1.0625rem", color: C.navy, marginBottom: "0.5rem" }}>{title}</h3>
                  <p style={{ color: C.body, fontSize: "0.9375rem", lineHeight: 1.65 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", fontWeight: 600, fontSize: "1rem", color: C.navy }}>
            The goal is not to get a link. The goal is to become part of the answer.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 8 — THE 1+1 STRUCTURE
      ════════════════════════════════════════ */}
      <section style={{ background: C.soft, ...sp("5rem 1.5rem") }}>
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
          <LinkStructureDiagram />
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 9 — WHY TRADITIONAL FAILS
      ════════════════════════════════════════ */}
      <section style={{ background: C.white, ...sp("5rem 1.5rem") }}>
        <div style={wrap}>
          {sectionHead(
            "Most link building stops at the link.",
            "AlwaysCited builds assets that appreciate."
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.navy}` }}>
                  <th style={{ textAlign: "left", padding: "0.875rem 1rem 0.875rem 0", color: C.navy, fontWeight: 600, minWidth: "180px" }}>&nbsp;</th>
                  <th style={{ textAlign: "left", padding: "0.875rem 1rem", color: "#9CA3AF", fontWeight: 600, minWidth: "200px" }}>Traditional link building</th>
                  <th style={{ textAlign: "left", padding: "0.875rem 1rem", color: C.purple, fontWeight: 700, minWidth: "200px" }}>AlwaysCited</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { attr: "Target pages", old: "Any available page", neu: "Pages that already rank" },
                  { attr: "Traffic on host page", old: "Little or no traffic", neu: "Real visitors, proven demand" },
                  { attr: "Authority basis", old: "Built for DA/DR metrics", neu: "Trust transfer from ranking pages" },
                  { attr: "AI citation strategy", old: "None", neu: "Structured for AI extraction" },
                  { attr: "Long-term result", old: "Equity often plateaus", neu: "Rankings, traffic, and leads compound" },
                ].map(({ attr, old, neu }) => (
                  <tr key={attr} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "1rem 1rem 1rem 0", fontWeight: 600, color: C.navy, fontSize: "0.875rem" }}>{attr}</td>
                    <td style={{ padding: "1rem", color: "#9CA3AF" }}>{old}</td>
                    <td style={{ padding: "1rem", color: C.navy, fontWeight: 500, background: `${C.purple}08` }}>{neu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: "2rem", textAlign: "center", fontWeight: 600, color: C.navy, fontSize: "1rem" }}>
            Same budget. Different category of result.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 10 — PROOF / CASE STUDIES
      ════════════════════════════════════════ */}
      <section id="proof" style={{ background: C.soft, ...sp("5rem 1.5rem") }}>
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
                The placements ranked. Their traffic compounded. Authority transferred through the right anchors. The product page climbed.
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
          SECTION 11 — PRODUCT / PROOF PACKAGE
      ════════════════════════════════════════ */}
      <section id="pricing" style={{ background: C.white, ...sp("5rem 1.5rem") }}>
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
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
          SECTION 12 — FAQ
      ════════════════════════════════════════ */}
      <section id="faq" style={{ background: C.soft, ...sp("5rem 1.5rem") }}>
        <div style={{ ...wrap, maxWidth: "720px" }}>
          <h2 style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)", color: C.navy, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "3rem", textAlign: "center" }}>
            Frequently asked questions.
          </h2>
          <div style={{ borderTop: `1px solid ${C.border}` }}>
            {faqs.map((faq) => (
              <details key={faq.q} style={{ borderBottom: `1px solid ${C.border}` }}>
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
          SECTION 13 — FINAL CTA
      ════════════════════════════════════════ */}
      <CtaSection />
    </>
  );
}
