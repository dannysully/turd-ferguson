"use client";

import { useEffect, useRef, useState } from "react";

const gradBg = "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)";
const C = {
  navy: "#0B1220",
  purple: "#7C3AED",
  body: "#4B5563",
  soft: "#F8F7FF",
  border: "#E5E7EB",
  white: "#ffffff",
};

const links = [
  { n: "1", label: "Brand anchor → Homepage",         desc: "\"YourBrand\" — builds domain authority" },
  { n: "2", label: "Money keyword → Deep page",        desc: "\"best [category] software\" — moves the page that earns" },
];

export default function AnimatedLinkDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setDrawn(true); return; }

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setDrawn(true); observer.disconnect(); } },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /*
   * Arrow paths: viewBox "0 0 400 48", mapped to the card's inner content (~376px).
   * Column centres (in viewBox units): left ≈ 97, right ≈ 303, source centre = 200.
   * Each path: M 200 2 → vertical 14px → diagonal to column → vertical 14px to y=46.
   * Estimated path length ≈ 132px; dasharray 160 covers it fully.
   */
  const arrowCls = (delayed: boolean) =>
    `${delayed ? "link-arrow-delayed" : "link-arrow"}${drawn ? " link-drawn" : ""}`;

  return (
    <div
      ref={ref}
      style={{
        background: C.white,
        border: "1.5px solid rgba(124,58,237,0.2)",
        borderRadius: "20px",
        padding: "2rem",
        boxShadow: "0 2px 20px rgba(0,0,0,0.05)",
        maxWidth: "440px",
      }}
    >
      {/* Article source card */}
      <div style={{ background: C.soft, borderRadius: "12px", padding: "1rem 1.25rem" }}>
        <p style={{ fontSize: "0.7rem", color: C.body, marginBottom: "0.375rem" }}>
          Article · DA 74 · 3,200 monthly visitors
        </p>
        <p style={{ fontWeight: 700, color: C.navy, fontSize: "0.9375rem" }}>
          &ldquo;Best [Category] Platforms for 2026&rdquo;
        </p>
      </div>

      {/* SVG connector arrows */}
      <svg
        viewBox="0 0 400 48"
        fill="none"
        style={{ width: "100%", height: "48px", display: "block", overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <marker
            id="ac-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#A855F7" />
          </marker>
        </defs>

        {/* Left arrow: article centre-bottom → left box centre-top */}
        <path
          className={arrowCls(false)}
          d="M 200 2 L 200 16 L 97 32 L 97 46"
          stroke="#A855F7"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd="url(#ac-arrow)"
        />

        {/* Right arrow: article centre-bottom → right box centre-top (200ms delay) */}
        <path
          className={arrowCls(true)}
          d="M 200 2 L 200 16 L 303 32 L 303 46"
          stroke="#A855F7"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd="url(#ac-arrow)"
        />
      </svg>

      {/* Two destination boxes side-by-side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {links.map(({ n, label, desc }) => (
          <div
            key={n}
            style={{
              background: C.white,
              border: "1px solid rgba(124,58,237,0.25)",
              borderRadius: "12px",
              padding: "0.875rem 0.75rem",
              display: "flex",
              gap: "0.625rem",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "7px",
                background: gradBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ color: C.white, fontSize: "0.65rem", fontWeight: 700 }}>{n}</span>
            </div>
            <div>
              <p style={{ fontSize: "0.7rem", fontWeight: 600, color: C.purple, marginBottom: "0.2rem", lineHeight: 1.3 }}>
                {label}
              </p>
              <p style={{ fontSize: "0.65rem", color: C.body, lineHeight: 1.45 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: C.soft, borderRadius: "10px", padding: "0.75rem 1rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: C.navy }}>
          This is link architecture, not link volume.
        </p>
      </div>
    </div>
  );
}
