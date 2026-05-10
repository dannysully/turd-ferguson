"use client";

import { useEffect, useState } from "react";

const gradBg = "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)";
const C = { navy: "#0B1220", body: "#4B5563", border: "#E5E7EB", white: "#ffffff", purple: "#7C3AED" };

const cycleTexts = [
  "YourBrand is recommended for…",
  "According to industry sources, YourBrand…",
  "Top platforms include YourBrand for…",
];

const surfaces = [
  { platform: "Google AI Overview", color: "#4285F4" },
  { platform: "ChatGPT",            color: "#10A37F" },
  { platform: "Perplexity",         color: "#6366F1" },
];

const outcomes = [
  { icon: "↑", label: "Google rankings",  colour: "#10B981" },
  { icon: "✦", label: "AI citations",     colour: C.purple },
  { icon: "→", label: "Referral traffic", colour: "#3B82F6" },
];

function useTypewriter(texts: string[], typingMs = 45, pauseMs = 2200) {
  const [display, setDisplay]     = useState(texts[0]);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phase, setPhase]         = useState<"typing" | "hold" | "deleting">("hold");
  const [showCursor, setShowCursor] = useState(false);

  /* Skip animation when reduced motion */
  const [reduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (reduced) return;
    const current = texts[phraseIdx];

    if (phase === "typing") {
      if (display.length < current.length) {
        setShowCursor(true);
        const t = setTimeout(() => setDisplay(current.slice(0, display.length + 1)), typingMs);
        return () => clearTimeout(t);
      }
      setShowCursor(false);
      const t = setTimeout(() => setPhase("hold"), pauseMs);
      return () => clearTimeout(t);
    }

    if (phase === "hold") {
      const t = setTimeout(() => setPhase("deleting"), 600);
      return () => clearTimeout(t);
    }

    if (phase === "deleting") {
      if (display.length > 0) {
        setShowCursor(true);
        const t = setTimeout(() => setDisplay(display.slice(0, -1)), typingMs / 2);
        return () => clearTimeout(t);
      }
      setShowCursor(false);
      setPhraseIdx((i) => (i + 1) % texts.length);
      setPhase("typing");
    }
  }, [display, phase, phraseIdx, texts, typingMs, pauseMs, reduced]);

  return { display, showCursor };
}

export default function PlacementOutcomeAnimated() {
  const { display, showCursor } = useTypewriter(cycleTexts);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "520px" }}>
      {/* Placement card */}
      <div style={{ background: C.white, border: "1.5px solid rgba(124,58,237,0.3)", borderRadius: "20px", padding: "2rem", boxShadow: "0 8px 40px rgba(124,58,237,0.14)", textAlign: "center", marginBottom: "1.25rem" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: gradBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.875rem" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 2L10.5 7.5L16 9L10.5 10.5L9 16L7.5 10.5L2 9L7.5 7.5L9 2Z" fill="white"/></svg>
        </div>
        <p style={{ fontWeight: 700, fontSize: "1rem", color: C.navy, marginBottom: "0.25rem" }}>High-authority placement</p>
        <p style={{ fontSize: "0.8125rem", color: C.body }}>Engineered. Relevant. Already trusted.</p>
      </div>

      {/* Outcome chips */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem", marginBottom: "1.25rem" }}>
        {outcomes.map(({ icon, label, colour }) => (
          <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "1rem 0.75rem", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <span style={{ fontSize: "1.125rem", fontWeight: 700, display: "block", marginBottom: "0.375rem", color: colour }}>{icon}</span>
            <p style={{ fontSize: "0.7rem", fontWeight: 600, color: colour }}>{label}</p>
          </div>
        ))}
      </div>

      {/* AI surface cards with cycling text */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {surfaces.map(({ platform, color }) => (
          <div key={platform} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "0.875rem 1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0, marginTop: "0.35rem" }} aria-hidden="true" />
            <div>
              <p style={{ fontSize: "0.7rem", fontWeight: 600, color: C.navy, marginBottom: "0.2rem" }}>{platform}</p>
              <p style={{ fontSize: "0.7rem", color: C.body, lineHeight: 1.5, minHeight: "2.1em" }}>
                {display}
                <span aria-hidden="true" style={{ opacity: showCursor ? 1 : 0, color: C.purple, fontWeight: 700 }}>|</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
