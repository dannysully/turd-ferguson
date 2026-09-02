"use client";

import { useEffect, useRef, useState } from "react";

const gradBg = "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)";
const C = { navy: "#0B1220", body: "#4B5563", soft: "#F8F7FF", border: "#E5E7EB", white: "#ffffff" };

const steps = [
  { label: "Ranking page",         sub: "Already trusted by Google" },
  { label: "Real traffic",         sub: "Active visitors, not dead pages" },
  { label: "Trust transfer",       sub: "Authority flows to your site" },
  { label: "Your rankings rise",   sub: "Money keywords climb" },
  { label: "AI citations increase",sub: "You appear in AI answers" },
];

export default function AnimatedAuthorityFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setVisible(true); return; }

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: "380px" }}>
      {steps.map(({ label, sub }, i) => (
        <div key={label}>
          <div
            className={visible ? "stage-visible" : "stage-hidden"}
            style={{
              animationDelay: `${i * 80}ms`,
              background: i % 2 === 0 ? C.soft : C.white,
              border: `1px solid ${C.border}`,
              borderRadius: "14px",
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
            }}
          >
            <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: gradBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, color: C.white }}>
              {i + 1}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: C.navy, marginBottom: "0.1rem" }}>{label}</p>
              <p style={{ fontSize: "0.75rem", color: C.body }}>{sub}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div
              className={visible ? "stage-visible" : "stage-hidden"}
              style={{ display: "flex", justifyContent: "center", padding: "0.25rem 0", animationDelay: `${i * 80 + 40}ms` }}
              aria-hidden="true"
            >
              <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
                <path d="M6 0V12M6 12L2 8M6 12L10 8" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
      ))}
      <div
        className={visible ? "stage-visible" : "stage-hidden"}
        style={{ marginTop: "1.25rem", background: gradBg, borderRadius: "12px", padding: "0.875rem 1.25rem", textAlign: "center", animationDelay: `${steps.length * 80}ms` }}
      >
        <p style={{ fontWeight: 700, color: C.white, fontSize: "0.875rem" }}>Trust transfers. Traffic validates. Rankings follow.</p>
      </div>
    </div>
  );
}
