"use client";

import { useEffect, useRef, useState } from "react";

const C = { navy: "#0B1220", purple: "#7C3AED", border: "#E5E7EB" };

const rows = [
  { attr: "Target pages",         old: "Any available page",          neu: "Pages that already rank" },
  { attr: "Traffic on host page", old: "Little or no traffic",        neu: "Real visitors, proven demand" },
  { attr: "Authority basis",      old: "Built for DA/DR metrics",     neu: "Trust transfer from ranking pages" },
  { attr: "AI citation strategy", old: "None",                        neu: "Structured for AI extraction" },
  { attr: "Long-term result",     old: "Equity often plateaus",       neu: "Rankings, traffic, and leads compound" },
];

export default function AnimatedComparisonTable() {
  const ref = useRef<HTMLTableElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setVisible(true); return; }

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const colClass = (side: "left" | "right") =>
    `${side === "left" ? "col-left" : "col-right"}${visible ? " col-visible" : ""}`;

  return (
    <div style={{ overflowX: "auto" }}>
      <table ref={ref} style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.navy}` }}>
            <th style={{ textAlign: "left", padding: "0.875rem 1rem 0.875rem 0", color: C.navy, fontWeight: 600, minWidth: "180px" }}>&nbsp;</th>
            <th className={colClass("left")} style={{ textAlign: "left", padding: "0.875rem 1rem", color: "#9CA3AF", fontWeight: 600, minWidth: "200px" }}>
              Traditional link building
            </th>
            <th className={colClass("right")} style={{ textAlign: "left", padding: "0.875rem 1rem", color: C.purple, fontWeight: 700, minWidth: "200px" }}>
              AlwaysCited
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ attr, old, neu }) => (
            <tr key={attr} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "1rem 1rem 1rem 0", fontWeight: 600, color: C.navy, fontSize: "0.875rem" }}>{attr}</td>
              <td className={colClass("left")} style={{ padding: "1rem", color: "#9CA3AF" }}>{old}</td>
              <td className={colClass("right")} style={{ padding: "1rem", color: C.navy, fontWeight: 500, background: `${C.purple}08` }}>{neu}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
