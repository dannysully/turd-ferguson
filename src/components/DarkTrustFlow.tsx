"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Two routes into one pool, not a causal chain.
 *
 * The previous version read: ranking article -> mention and link -> Google
 * ranks you -> AI cites you. That asserted the link as the mechanism, which
 * our own coverage contradicts: the citations came from pieces with no link in
 * them, and the one followed link has been cited by nothing. It also fought
 * the same page's own line that we do not pretend it is a controlled
 * experiment.
 *
 * Coverage and links do different jobs and both feed the same pool. The
 * tracker reports which one happened, and when - it does not claim why.
 */

const routes = [
  {
    label: "Coverage the engines read",
    sub: "A mention with no link can win the citation",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="3" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 8h8M6 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Links that move rankings",
    sub: "A link can move the ranking",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M8 12a3 3 0 0 1 0-4l2-2a3 3 0 0 1 4 4l-1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 8a3 3 0 0 1 0 4l-2 2a3 3 0 0 1-4-4l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
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

  const cls = visible ? "stage-visible" : "stage-hidden";

  return (
    <div ref={ref} style={{ maxWidth: "620px", margin: "0 auto" }}>
      {/* Two routes, side by side - deliberately not sequenced */}
      <div className="trust-routes" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {routes.map((route, i) => (
          <div
            key={route.label}
            className={cls}
            style={{
              animationDelay: `${i * 120}ms`,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{
              width: "40px", height: "40px", borderRadius: "11px",
              background: "linear-gradient(135deg,#7C3AED,#A855F7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", flexShrink: 0,
            }}>
              {route.icon}
            </div>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fff", marginBottom: "0.25rem", lineHeight: 1.35 }}>
                {route.label}
              </p>
              <p style={{ fontSize: "0.75rem", color: "#6B7280", lineHeight: 1.5 }}>
                {route.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Both converge on the same pool */}
      <svg
        viewBox="0 0 620 44"
        fill="none"
        style={{ width: "100%", height: "44px", display: "block" }}
        aria-hidden="true"
      >
        <path d="M155 2 L155 20 L310 32" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M465 2 L465 20 L310 32" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M310 32 L310 42" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>

      <div
        className={cls}
        style={{
          animationDelay: "240ms",
          background: "rgba(124,58,237,0.12)",
          border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: "16px",
          padding: "1.25rem 1.5rem",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#fff", marginBottom: "0.25rem" }}>
          The pool the models extract from
        </p>
        <p style={{ fontSize: "0.75rem", color: "#9CA3AF", lineHeight: 1.55 }}>
          Google AI Overviews · ChatGPT · Gemini · Perplexity
        </p>
      </div>

      <p style={{ fontSize: "0.8125rem", color: "#6B7280", textAlign: "center", marginTop: "1.25rem", lineHeight: 1.6 }}>
        They do different jobs. The tracker shows which one happened, and when.
      </p>
    </div>
  );
}
