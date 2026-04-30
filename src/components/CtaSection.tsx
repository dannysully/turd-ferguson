export default function CtaSection() {
  return (
    <section id="cta" style={{ background: "#F8F7FF", padding: "6rem 1.5rem" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
        <h2
          style={{
            fontWeight: 700,
            fontSize: "clamp(2rem, 4vw, 2.75rem)",
            color: "#0B1220",
            lineHeight: 1.2,
            marginBottom: "1.25rem",
            letterSpacing: "-0.02em",
          }}
        >
          Ready to be the brand{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            AI recommends?
          </span>
        </h2>
        <p style={{ color: "#4B5563", fontSize: "1.125rem", lineHeight: 1.6, marginBottom: "2.5rem" }}>
          We&apos;ll show you where your competitors are winning — and how to take the top spot.
        </p>
        <a href="/contact" className="btn-primary">
          Book a strategy call
        </a>
      </div>
    </section>
  );
}
