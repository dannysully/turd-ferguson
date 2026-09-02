"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="3" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 8h8M6 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    label: "Ranking article",
    sub: "Page 1 for its own terms · real readers",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 3L10 17M4 9l6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: "Brand mention + link",
    sub: "Strategic anchor text placement",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 3C10 3 13 7 13 10C13 13 10 17 10 17" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    label: "Google ranks your brand",
    sub: "Authority transfer confirmed",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 4L11.8 8.6L17 9.5L13.2 13L14.2 18L10 15.8L5.8 18L6.8 13L3 9.5L8.2 8.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    label: "AI systems cite you",
    sub: "ChatGPT · Perplexity · AI Overviews",
  },
];

export default function DarkTrustFlow() {
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
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {steps.map((step, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div
            className={visible ? "stage-visible" : "stage-hidden"}
            style={{
              animationDelay: `${i * 120}ms`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.625rem",
              padding: "1.25rem 1rem",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              width: "148px",
              textAlign: "center",
            }}
          >
            <div style={{
              width: "44px", height: "44px", borderRadius: "12px",
              background: "linear-gradient(135deg,#7C3AED,#A855F7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff",
            }}>
              {step.icon}
            </div>
            <div>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#fff", marginBottom: "0.25rem", lineHeight: 1.3 }}>
                {step.label}
              </p>
              <p style={{ fontSize: "0.7rem", color: "#6B7280", lineHeight: 1.45 }}>
                {step.sub}
              </p>
            </div>
          </div>

          {/* Connector arrow (not after last item) */}
          {i < steps.length - 1 && (
            <div
              className={visible ? "stage-visible" : "stage-hidden"}
              style={{
                animationDelay: `${i * 120 + 60}ms`,
                display: "flex",
                alignItems: "center",
                padding: "0 0.5rem",
                color: "#4B5563",
                fontSize: "1.25rem",
                fontWeight: 300,
                flexShrink: 0,
              }}
            >
              →
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
