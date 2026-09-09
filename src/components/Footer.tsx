import Link from "next/link";

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="footerMarkGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#footerMarkGrad)" />
        <path d="M16 7 L17.6 13.4 L24 15 L17.6 16.6 L16 23 L14.4 16.6 L8 15 L14.4 13.4 Z" fill="white" />
      </svg>
      <span style={{ fontWeight: 700, fontSize: "1rem", color: "#ffffff", letterSpacing: "-0.02em" }}>
        always<span style={{ color: "#A855F7" }}>cited</span>
      </span>
    </div>
  );
}

export default function Footer() {
  return (
    <footer style={{ background: "#0B1220", color: "#6B7280" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "3.5rem 1.5rem 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "3rem", marginBottom: "3rem" }}>
          {/* Brand */}
          <div>
            <Logo />
            <p style={{ marginTop: "1rem", fontSize: "0.875rem", lineHeight: 1.65, maxWidth: "220px", color: "#6B7280" }}>
              Be the brand{" "}
              <span style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                AI recommends.
              </span>
            </p>
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#4B5563" }}>
              A sub-brand of{" "}
              <a href="https://nomadadigital.co.uk" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ fontSize: "0.75rem" }}>
                Nomada Digital
              </a>
            </p>
          </div>

          {/* Product */}
          <div>
            <p style={{ color: "#9CA3AF", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Product</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[["Free scan", "/#scan"], ["alwaystracked", "/alwaystracked"], ["alwaysmentioned", "/alwaysmentioned"], ["alwayscited", "/alwayscited"], ["alwayseverywhere", "/alwayseverywhere"]].map(([label, href]) => (
                <li key={label}><a href={href} className="footer-link">{label}</a></li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p style={{ color: "#9CA3AF", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Company</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[["About", "/about"], ["Blog", "/blog"], ["Case studies", "/case-studies/vibe-retail"], ["Contact", "/contact"]].map(([label, href]) => (
                <li key={label}><Link href={href} className="footer-link">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #1F2937", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", fontSize: "0.8125rem", color: "#4B5563" }}>
          <p>&copy; {new Date().getFullYear()} alwayscited. Part of <a href="https://nomadadigital.co.uk" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ fontSize: "0.8125rem" }}>Nomada Digital Ltd</a>.</p>
          <p>hello@alwayscited.com</p>
        </div>
      </div>
    </footer>
  );
}
