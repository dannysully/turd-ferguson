"use client";

import { useState } from "react";

import EngineLogo from "@/components/EngineLogo";
import { T } from "@/config/tokens";
import { ENGINE_SPECS, type Engine } from "@/lib/scan/engines";

/**
 * The overview's chart (T4, 29 Sep 2026), hand-built SVG as
 * boards/Main.dc.html draws it - no chart library. The engine chips, the
 * previous-period dashed line and like-for-like are client state; the server
 * render is the settled default (all engines, previous period on), so the
 * page reads the same with JS off. Each day is a button, so the readout is
 * reachable by keyboard as well as by hover.
 *
 * Engine lines take each engine's own colour from ENGINE_SPECS, not the
 * board's placeholder blues and inks.
 */

export type Point = { pct: number | null; num: number; den: number };
export type ChartDay = { label: string; all: Point; by: Record<string, Point> };
export type ChartData = {
  engines: Engine[];
  now: ChartDay[];
  before: ChartDay[] | null;
  lflNow: ChartDay[] | null;
  lflBefore: ChartDay[] | null;
  beforeLabel: string | null;
  lflNote: string | null;
  notes: { index: number; text: string }[];
  brand: string;
  questions: number;
};

const W = 1056;
const H = 300;
const X0 = 40;
const X1 = 1044;
const Y0 = 264;
const Y1 = 16;

function path(days: ChartDay[], pick: (d: ChartDay) => Point, max: number): string {
  const step = days.length > 1 ? (X1 - X0) / (days.length - 1) : 0;
  let d = "";
  let pen = false;
  days.forEach((day, i) => {
    const p = pick(day).pct;
    if (p === null) {
      pen = false;
      return;
    }
    const x = X0 + i * step;
    const y = Y0 - (Math.min(p, max) / max) * (Y0 - Y1);
    d += `${pen ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
    pen = true;
  });
  return d.trim();
}

function Switch({ on, label, onToggle, disabled }: { on: boolean; label: string; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      disabled={disabled}
      style={{ display: "inline-flex", alignItems: "center", gap: "10px", height: "36px", padding: "0 4px", border: 0, background: "transparent", color: T.ink, fontSize: "13px", fontWeight: 600, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1 }}
    >
      <span style={{ position: "relative", width: "34px", height: "20px", borderRadius: "999px", background: on ? T.accent : T.line, transition: "background .15s" }}>
        <span style={{ position: "absolute", top: "2px", left: on ? "16px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: T.surface, boxShadow: `0 1px 2px color-mix(in srgb, ${T.ink} 25%, transparent)`, transition: "left .15s" }} />
      </span>
      {label}
    </button>
  );
}

export default function OverviewChart({ data }: { data: ChartData }) {
  const [prev, setPrev] = useState(true);
  const [lfl, setLfl] = useState(false);
  const [shown, setShown] = useState<"all" | Engine>("all");
  const [hover, setHover] = useState<number | null>(null);

  const now = lfl && data.lflNow ? data.lflNow : data.now;
  const before = lfl && data.lflBefore ? data.lflBefore : data.before;
  const pick = (d: ChartDay) => (shown === "all" ? d.all : (d.by[shown] ?? { pct: null, num: 0, den: 0 }));
  const colour = shown === "all" ? T.accent : ENGINE_SPECS[shown].colour;

  const peak = Math.max(0, ...now.map((d) => pick(d).pct ?? 0), ...(prev && before ? before.map((d) => pick(d).pct ?? 0) : []));
  const max = Math.max(60, Math.ceil(peak / 20) * 20);
  const ticks = [0, max / 3, (2 * max) / 3, max].map((v) => Math.round(v));
  const step = now.length > 1 ? (X1 - X0) / (now.length - 1) : 0;
  const xAt = (i: number) => X0 + i * step;
  const line = path(now, pick, max);
  const lastX = (() => {
    for (let i = now.length - 1; i >= 0; i--) if (pick(now[i]!).pct !== null) return xAt(i);
    return null;
  })();
  const firstX = now.findIndex((d) => pick(d).pct !== null);
  const area = line && lastX !== null ? `${line} L${lastX.toFixed(1)},${Y0} L${xAt(firstX).toFixed(1)},${Y0} Z` : "";
  const labelEvery = Math.max(1, Math.round((now.length - 1) / 4));
  const read = hover !== null ? now[hover] : null;
  const readBefore = hover !== null && prev && before ? before[hover] : null;
  const withData = now.filter((d) => pick(d).pct !== null);
  const first = withData[0] ? pick(withData[0]).pct : null;
  const last = withData.length ? pick(withData[withData.length - 1]!).pct : null;
  const summary =
    first === null
      ? `No daily checks in this range yet`
      : `Daily share of answers naming ${data.brand}, ${now[0]!.label} to ${now[now.length - 1]!.label}, from ${first}% to ${last}%`;

  return (
    <section aria-labelledby="chart-h" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "18px", padding: "24px 27px 20px", display: "flex", flexDirection: "column", gap: "18px", minWidth: 0 }}>
      <div className="app-chart-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h2 id="chart-h" style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
            Share of answers naming you
          </h2>
          <p style={{ margin: 0, fontSize: "14px", color: T.soft }}>
            Each day, the share of your {data.questions} prompts where an engine named {data.brand}. Hover or tab to a day for the detail.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <Switch on={prev && !!data.before} label="Previous period" onToggle={() => setPrev((v) => !v)} disabled={!data.before} />
          <Switch on={lfl && !!data.lflNow} label="Like-for-like only" onToggle={() => setLfl((v) => !v)} disabled={!data.lflNow} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {(["all", ...data.engines] as const).map((e) => {
          const on = shown === e;
          return (
            <button
              key={e}
              type="button"
              aria-pressed={on}
              onClick={() => setShown(e)}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "36px", padding: "0 14px", borderRadius: "999px", border: `1px solid ${on ? T.washLine : T.line}`, background: on ? T.wash : T.surface, color: T.ink, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              {e === "all" ? <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: T.accent }} /> : <EngineLogo engine={e} size={14} />}
              {e === "all" ? "All engines" : ENGINE_SPECS[e].label}
            </button>
          );
        })}
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: `${W}px` }} onMouseLeave={() => setHover(null)}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} style={{ display: "block", overflow: "visible" }}>
          {area ? <path d={area} fill={colour} fillOpacity={0.07} /> : null}
          {ticks.map((v, i) => {
            const y = Y0 - (v / max) * (Y0 - Y1);
            return (
              <g key={v}>
                <line x1={X0} x2={X1} y1={y} y2={y} stroke={i === 0 ? T.line : T.hair} strokeWidth={1} />
                <text x={30} y={y + 4} textAnchor="end" fontSize={12} fill={T.soft}>
                  {v}%
                </text>
              </g>
            );
          })}
          {now.map((d, i) =>
            i % labelEvery === 0 || i === now.length - 1 ? (
              <text key={i} x={xAt(i)} y={290} textAnchor="middle" fontSize={12} fill={T.soft}>
                {d.label}
              </text>
            ) : null,
          )}
          {data.notes.map((n) => (
            <g key={`${n.index}-${n.text}`}>
              <line x1={xAt(n.index)} x2={xAt(n.index)} y1={Y1} y2={Y0} stroke={T.faint} strokeWidth={1} strokeDasharray="2 4" />
              <circle cx={xAt(n.index)} cy={Y0} r={4} fill={T.surface} stroke={T.ink} strokeWidth={1.5} />
            </g>
          ))}
          {prev && before ? <path d={path(before, pick, max)} fill="none" stroke={colour} strokeWidth={1.6} strokeDasharray="4 5" strokeLinecap="round" /> : null}
          {line ? <path d={line} fill="none" stroke={colour} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" /> : null}
          {hover !== null && pick(now[hover]!).pct !== null ? (
            <g>
              <line x1={xAt(hover)} x2={xAt(hover)} y1={Y1} y2={Y0} stroke={T.line} strokeWidth={1} />
              <circle cx={xAt(hover)} cy={Y0 - (Math.min(pick(now[hover]!).pct!, max) / max) * (Y0 - Y1)} r={5} fill={colour} stroke={T.surface} strokeWidth={2} />
            </g>
          ) : null}
        </svg>

        {data.notes.map((n) => (
          <span
            key={`label-${n.index}-${n.text}`}
            style={{ position: "absolute", top: 0, left: `${(xAt(n.index) / W) * 100}%`, transform: "translateX(6px)", fontSize: "12px", fontWeight: 600, color: T.ink, background: T.surface, padding: "0 4px", whiteSpace: "nowrap" }}
          >
            {n.text}
          </span>
        ))}

        <div style={{ position: "absolute", inset: `0 ${((W - X1 + step / 2) / W) * 100}% 12% ${((X0 - step / 2) / W) * 100}%`, display: "flex" }}>
          {now.map((d, i) => {
            const p = pick(d);
            return (
              <button
                key={i}
                type="button"
                className="app-chart-day"
                aria-label={`${d.label}: ${p.pct === null ? "no check" : `${p.pct}%, ${p.num} of ${p.den} answers`}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                style={{ flex: "1 1 0", minWidth: 0, background: "transparent", border: 0, padding: 0, cursor: "default" }}
              />
            );
          })}
        </div>

        {read ? (
          <div
            role="status"
            style={{ position: "absolute", top: "24px", left: `${(xAt(hover!) / W) * 100}%`, transform: xAt(hover!) > 780 ? "translateX(calc(-100% - 12px))" : "translateX(12px)", width: "220px", background: T.ink, color: T.surface, borderRadius: "12px", padding: "12px 14px", fontSize: "13px", pointerEvents: "none", display: "grid", gap: "6px" }}
          >
            <div style={{ fontWeight: 700 }}>
              {read.label}
              {lfl ? ", like-for-like" : ""}
            </div>
            {(shown === "all" ? data.engines : [shown]).map((e) => {
              const p = read.by[e];
              return (
                <div key={e} style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <span>{ENGINE_SPECS[e].label}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{p && p.pct !== null ? `${p.pct}% (${p.num} of ${p.den})` : "no check"}</span>
                </div>
              );
            })}
            {readBefore ? (
              <div style={{ color: T.faint, fontSize: "12px" }}>
                Same day last period ({readBefore.label}): {pick(readBefore).pct === null ? "no check" : `${pick(readBefore).pct}%`}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: "20px", fontSize: "12px", color: T.soft, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "18px", borderTop: `3px solid ${colour}` }} />
          This period
        </span>
        {data.beforeLabel ? (
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "18px", borderTop: `2px dashed ${colour}` }} />
            {data.beforeLabel}
          </span>
        ) : null}
        {data.lflNote ? <span>{data.lflNote}</span> : null}
      </div>
    </section>
  );
}
