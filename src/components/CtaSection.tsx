import { CONTACT_URL } from "@/config/pricing";

/**
 * Shared closing CTA, used on the secondary pages.
 *
 * Critique 0.2: links are root-relative so they work off the homepage.
 * Critique 2.4: the previous copy described a consultative audit ("we'll map
 * your category...") which contradicts the self-serve positioning. It now
 * points at pricing first and the waitlist second.
 */
export default function CtaSection() {
  return (
    <section id="cta" style={{ background: "#0B1220", padding: "6rem 1.5rem", position: "relative", overflow: "hidden" }}>
      <div className="gradient-orb" style={{ position: "absolute", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)", top: "-150px", left: "-100px", pointerEvents: "none" }} aria-hidden="true" />
      <div className="gradient-orb" style={{ position: "absolute", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", bottom: "-100px", right: "-80px", pointerEvents: "none", animationDelay: "-15s" }} aria-hidden="true" />

      <div style={{ maxWidth: "640px", margin: "0 auto", textAlign: "center", position: "relative" }}>
        <h2 style={{ fontWeight: 700, fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "#ffffff", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
          Prices are on the page.{" "}
          <span style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Start when you want.
          </span>
        </h2>
        <p style={{ color: "#9CA3AF", fontSize: "1.0625rem", lineHeight: 1.65, marginBottom: "2.5rem" }}>
          Placement counts, what each tier includes and what it costs are all published. If you want to buy, you do not need to speak to us first.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/#pricing" className="btn-primary">See pricing</a>
          <a href={CONTACT_URL} style={{ display: "inline-block", background: "transparent", color: "#ffffff", padding: "0.875rem 2rem", borderRadius: "12px", fontWeight: 600, fontSize: "1rem", textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.2)" }}>
            Join the waitlist
          </a>
        </div>
      </div>
    </section>
  );
}
