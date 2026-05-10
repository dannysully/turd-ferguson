export default function CtaSection() {
  return (
    <section id="cta" style={{ background: "#0B1220", padding: "6rem 1.5rem", position: "relative", overflow: "hidden" }}>
      {/* Gradient wash orbs */}
      <div className="gradient-orb" style={{ position: "absolute", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)", top: "-150px", left: "-100px", pointerEvents: "none" }} aria-hidden="true" />
      <div className="gradient-orb" style={{ position: "absolute", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", bottom: "-100px", right: "-80px", pointerEvents: "none", animationDelay: "-15s" }} aria-hidden="true" />

      <div style={{ maxWidth: "640px", margin: "0 auto", textAlign: "center", position: "relative" }}>
        {/* Authority flow strip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
          {["Your brand", "→", "Google", "→", "AI Overviews", "→", "ChatGPT", "→", "Buyer shortlist"].map((item, i) => (
            <span key={i} style={{
              fontSize: "0.75rem", fontWeight: item === "→" ? 400 : 600,
              color: item === "→" ? "#4B5563" : "#ffffff",
              background: item === "→" ? "transparent" : "rgba(124,58,237,0.2)",
              padding: item === "→" ? "0" : "0.2rem 0.625rem",
              borderRadius: "99px",
              border: item === "→" ? "none" : "1px solid rgba(168,85,247,0.3)",
            }}>{item}</span>
          ))}
        </div>

        <h2 style={{ fontWeight: 700, fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "#ffffff", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
          Ready to become the brand{" "}
          <span style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            AI recommends?
          </span>
        </h2>
        <p style={{ color: "#9CA3AF", fontSize: "1.0625rem", lineHeight: 1.65, marginBottom: "2.5rem" }}>
          We&apos;ll map your category, show where your competitors are being cited, and identify the placements most likely to move rankings, traffic, and AI visibility.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/contact" className="btn-primary">Book a strategy call</a>
          <a href="#proof" style={{ display: "inline-block", background: "transparent", color: "#ffffff", padding: "0.875rem 2rem", borderRadius: "12px", fontWeight: 600, fontSize: "1rem", textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.2)" }}>
            See example campaign
          </a>
        </div>
      </div>
    </section>
  );
}
