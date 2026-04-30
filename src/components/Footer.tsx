export default function Footer() {
  return (
    <footer style={{ background: "#0B1220", color: "#9CA3AF" }}>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "3rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "2rem",
          }}
        >
          {/* Logo + tagline */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
              <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <defs>
                  <linearGradient id="footerLogoGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                </defs>
                <path
                  d="M4 6C4 3.79 5.79 2 8 2H28C30.21 2 32 3.79 32 6V22C32 24.21 30.21 26 28 26H20L14 33V26H8C5.79 26 4 24.21 4 22V6Z"
                  fill="url(#footerLogoGrad)"
                />
                <path
                  d="M18 8L19.5 13.5L25 15L19.5 16.5L18 22L16.5 16.5L11 15L16.5 13.5L18 8Z"
                  fill="white"
                />
              </svg>
              <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#ffffff" }}>
                getcited<span style={{ color: "#A855F7" }}>.com</span>
              </span>
            </div>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.6, maxWidth: "220px" }}>
              Be the brand{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #A855F7)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                AI recommends.
              </span>
            </p>
          </div>

          {/* Links */}
          <div style={{ display: "flex", gap: "4rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ color: "#ffffff", fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
                Product
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {["How it works", "Why it matters", "Results", "FAQ"].map((item) => (
                  <li key={item}>
                    <a href="#" className="footer-link">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p style={{ color: "#ffffff", fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
                Company
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {["About", "Blog", "Contact"].map((item) => (
                  <li key={item}>
                    <a href="#" className="footer-link">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #1F2937", paddingTop: "1.5rem", fontSize: "0.8125rem" }}>
          &copy; {new Date().getFullYear()} getcited.com. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
