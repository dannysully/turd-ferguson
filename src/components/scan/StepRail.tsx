"use client";

import { useEffect, useState } from "react";

export default function StepRail({ steps }: { steps: { id: string; label: string }[] }) {
  const [active, setActive] = useState(steps[0]?.id);
  useEffect(() => {
    const els = steps.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [steps]);

  return (
    <nav aria-label="Steps" className="walk-rail">
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {steps.map((s, i) => {
          const on = s.id === active;
          return (
            <li key={s.id}>
              <a href={`#${s.id}`} aria-current={on ? "step" : undefined}
                style={{ display: "flex", gap: "0.625rem", alignItems: "baseline", padding: "0.5rem 0.625rem", borderRadius: "8px", textDecoration: "none", fontSize: "0.8125rem", lineHeight: 1.4, color: on ? "#0B1220" : "#6B7280", fontWeight: on ? 700 : 500, background: on ? "rgba(124,58,237,0.08)" : "transparent" }}>
                <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: on ? "#7C3AED" : "#9CA3AF", flexShrink: 0 }}>0{i + 1}</span>
                <span>{s.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
