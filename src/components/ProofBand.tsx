"use client";

import { useEffect, useRef, useState } from "react";

interface StatDef {
  prefix: string;
  end: number;
  suffix: string;
  label: string;
}

const stats: StatDef[] = [
  { prefix: "0 → ", end: 35,  suffix: "",  label: "Domain rating" },
  { prefix: "#83 → #", end: 1,   suffix: "",  label: "Primary keyword" },
  { prefix: "",     end: 3,   suffix: "",  label: "AI Overview citations" },
  { prefix: "",     end: 20,  suffix: "%", label: "ChatGPT visibility" },
];

function useCountUp(end: number, durationMs: number, triggered: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!triggered) return;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setValue(Math.round(eased * end));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, durationMs, triggered]);
  return value;
}

function StatItem({ stat, triggered }: { stat: StatDef; triggered: boolean }) {
  const n = useCountUp(stat.end, 1000, triggered);
  const display = `${stat.prefix}${n}${stat.suffix}`;
  const final   = `${stat.prefix}${stat.end}${stat.suffix}`;
  return (
    <div style={{ padding: "0.5rem 0", textAlign: "center" }}>
      <p aria-hidden="true" style={{ fontWeight: 700, fontSize: "clamp(1.375rem, 3vw, 1.875rem)", color: "#0B1220", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {display}
      </p>
      <span className="sr-only">{final}</span>
      <p style={{ fontSize: "0.6875rem", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "0.5rem", fontWeight: 600 }}>
        {stat.label}
      </p>
    </div>
  );
}

export default function ProofBand() {
  const ref = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setTriggered(true); return; }

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTriggered(true); observer.disconnect(); } },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section style={{ background: "#F8F7FF", borderTop: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB", padding: "2.75rem 1.5rem" }}>
      <div ref={ref} style={{ maxWidth: "860px", margin: "0 auto" }}>
        <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "#9CA3AF", letterSpacing: "0.02em", marginBottom: "1.75rem" }}>
          Currently driving #1 rankings and AI Overview citations for SaaS, retail, and public-safety brands.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.5rem 2rem" }}>
          {stats.map((s) => <StatItem key={s.label} stat={s} triggered={triggered} />)}
        </div>
      </div>
    </section>
  );
}
