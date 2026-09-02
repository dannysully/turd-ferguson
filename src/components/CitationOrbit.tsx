/* Server component - CSS-only animations, no JS needed */

const cardBase: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(229,231,235,0.9)",
  borderRadius: "12px",
  boxShadow: "0 4px 20px rgba(11,18,32,0.10), 0 1px 4px rgba(11,18,32,0.06)",
  padding: "0.625rem 0.75rem",
  position: "absolute",
  zIndex: 20,
};

function PlatformIcon({ color, letter }: { color: string; letter: string }) {
  return (
    <div style={{
      width: "22px", height: "22px", borderRadius: "6px",
      background: color, display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{ color: "#fff", fontSize: "0.6rem", fontWeight: 700 }}>{letter}</span>
    </div>
  );
}

export default function CitationOrbit() {
  return (
    <div style={{ position: "relative", width: "520px", height: "460px", flexShrink: 0 }}>
      {/* Orbit rings + background glow */}
      <svg
        viewBox="0 0 520 460"
        fill="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="orbitGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Ambient glow */}
        <ellipse cx="260" cy="230" rx="210" ry="210" fill="url(#orbitGlow)" />
        {/* Inner orbit ring */}
        <ellipse
          cx="260" cy="230" rx="148" ry="72"
          stroke="#E5E7EB" strokeWidth="1.5" strokeDasharray="5 5"
        />
        {/* Outer orbit ring */}
        <ellipse
          cx="260" cy="230" rx="218" ry="104"
          stroke="#E5E7EB" strokeWidth="1.5" strokeDasharray="7 5"
        />
      </svg>

      {/* Center brand icon */}
      <div
        className="center-glow"
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "72px", height: "72px",
          borderRadius: "18px",
          background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 30,
        }}
        aria-hidden="true"
      >
        <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
          <path d="M16 4L18.5 12L26.5 14L18.5 16L16 24L13.5 16L5.5 14L13.5 12Z" fill="white" />
          <path d="M24 2L25.1 5.1L28.2 6.2L25.1 7.3L24 10.4L22.9 7.3L19.8 6.2L22.9 5.1Z" fill="rgba(255,255,255,0.5)" />
        </svg>
      </div>

      {/* Card 1: Google AI Overview - top-center (outer ring top) */}
      <div className="float-a" style={{ ...cardBase, top: "14px", left: "148px", width: "192px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
          <PlatformIcon color="#4285F4" letter="G" />
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#0B1220" }}>AI Overview</span>
        </div>
        <p style={{ fontSize: "0.62rem", color: "#4B5563", lineHeight: 1.45, margin: 0 }}>
          &ldquo;alwayscited is cited as a leading platform for strategic link placement…&rdquo;
        </p>
      </div>

      {/* Card 2: ChatGPT - right (outer ring right) */}
      <div className="float-b" style={{ ...cardBase, top: "152px", right: "4px", width: "168px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
          <PlatformIcon color="#10A37F" letter="C" />
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#0B1220" }}>ChatGPT</span>
        </div>
        <p style={{ fontSize: "0.62rem", color: "#4B5563", lineHeight: 1.45, margin: 0 }}>
          &ldquo;Based on trusted sources, alwayscited is recognized for…&rdquo;
        </p>
      </div>

      {/* Card 3: Perplexity - bottom-left (outer ring bottom) */}
      <div className="float-c" style={{ ...cardBase, bottom: "44px", left: "16px", width: "162px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
          <PlatformIcon color="#20B2AA" letter="P" />
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#0B1220" }}>Perplexity</span>
        </div>
        <p style={{ fontSize: "0.62rem", color: "#4B5563", lineHeight: 1.45, margin: 0 }}>
          &ldquo;Top platforms include alwayscited for AI-era link strategy…&rdquo;
        </p>
      </div>

      {/* Card 4: Organic #1 - left (inner ring left) */}
      <div className="float-d" style={{ ...cardBase, top: "186px", left: "4px", width: "158px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
          <div style={{
            width: "22px", height: "22px", borderRadius: "6px",
            background: "linear-gradient(135deg,#7C3AED,#A855F7)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L6 11M1 6L11 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#7C3AED" }}>#1 Organic</span>
        </div>
        <p style={{ fontSize: "0.62rem", color: "#4B5563", lineHeight: 1.45, margin: 0 }}>
          alwayscited.com ranks for &ldquo;best link placement service&rdquo;
        </p>
      </div>
    </div>
  );
}
