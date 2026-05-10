const nodes = ["Your brand", "Google", "AI Overviews", "ChatGPT", "Buyer shortlist"];

export default function HeroAuthorityFlow() {
  return (
    <div className="hero-flow-wrapper" aria-hidden="true">
      <div style={{ maxWidth: "640px", margin: "2.75rem auto 0", position: "relative", padding: "0 32px" }}>
        {/* Static connector line */}
        <div style={{ position: "absolute", top: "5px", left: "32px", right: "32px", height: "1px", background: "#E5E7EB" }} />

        {/* Animated glow sweep */}
        <div className="hero-flow-glow-line" />

        {/* Nodes */}
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
          {nodes.map((node, i) => {
            const isLast = i === nodes.length - 1;
            return (
              <div key={node} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: isLast ? "#7C3AED" : "#0B1220",
                  border: `2px solid ${isLast ? "#7C3AED" : "#E5E7EB"}`,
                  boxShadow: isLast ? "0 0 0 4px rgba(124,58,237,0.15)" : "none",
                  position: "relative",
                  zIndex: 1,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: "0.625rem",
                  fontWeight: 600,
                  color: isLast ? "#7C3AED" : "#9CA3AF",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.01em",
                }}>{node}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
