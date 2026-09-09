"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The competitive point is that most tools stop at the diagnosis - not that
 * measurement is useless. We ship a measurement tool as the free tier, so the
 * previous framing (six lines attacking dashboards) argued against our own
 * front door.
 *
 * Every line about the tool's output stays temporal, never causal. Nothing
 * claims a placement is proven to have caused a change.
 */

const dashboards = [
  "Show you the gap",
  "Stop at the diagnosis",
  "Winning the citation is still your problem",
  "No editorial relationships to act on it",
  "Your client sees a dashboard, not a result",
];

const alwayscited = [
  "Show you the gap with a free scan",
  "Then name the sources the engines actually cite",
  "Then place you in them",
  "Editorial coverage, schema work, link insertions",
  "Your client sees a report with your logo on it",
];

export default function DarkComparisonSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: "1.5rem",
        alignItems: "start",
        maxWidth: "880px",
        margin: "0 auto",
      }}
      className="comparison-grid"
    >
      {/* Left: AI visibility dashboards */}
      <div
        className={visible ? "col-left col-visible" : "col-left"}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
          padding: "1.75rem",
        }}
      >
        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
          Most AI visibility tools
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {dashboards.map((item) => (
            <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
              <div style={{
                width: "18px", height: "18px", borderRadius: "50%",
                background: "rgba(239,68,68,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: "1px",
              }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2l-6 6" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontSize: "0.8125rem", color: "#6B7280", lineHeight: 1.5 }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Centre vs. badge */}
      <div className="comparison-vs" style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "3.5rem" }}>
        <div style={{
          background: "rgba(124,58,237,0.2)",
          border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: "999px",
          padding: "0.375rem 0.875rem",
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "#A855F7",
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        }}>
          vs.
        </div>
      </div>

      {/* Right: alwayscited */}
      <div
        className={visible ? "col-right col-visible" : "col-right"}
        style={{
          background: "rgba(124,58,237,0.08)",
          border: "1px solid rgba(168,85,247,0.25)",
          borderRadius: "20px",
          padding: "1.75rem",
        }}
      >
        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#A855F7", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
          alwayscited
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {alwayscited.map((item) => (
            <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
              <div style={{
                width: "18px", height: "18px", borderRadius: "50%",
                background: "rgba(34,197,94,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: "1px",
              }}>
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: "0.8125rem", color: "#E5E7EB", lineHeight: 1.5 }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
