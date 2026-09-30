import Link from "next/link";

import EngineLogo from "@/components/EngineLogo";
import { T } from "@/config/tokens";
import { ENGINE_SPECS, type Engine } from "@/lib/scan/engines";
import { type ClusterDetail, type ClusterInput, clusterChart, promptStrip } from "@/lib/tracking/cluster-figures";
import { type Day, type Range, type Rate, comparisonRange, daysIn, formatDay, pointsDelta } from "@/lib/tracking/figures";
import type { Compare, OverviewData } from "@/lib/tracking/overview-data";

import ClusterChart from "./ClusterChart";
import { Chip } from "./Overview";

/**
 * One cluster (T7 part 2b, 30 Sep 2026; BRIEF-3 T7 against
 * boards-3/QuestionDetail.dc.html): breadcrumb, the keyword as the H1 with
 * its intent and volume, the four summary figures, the cluster chart as the
 * overview draws it, the 5 prompts joined to the keyword card, and for the
 * prompt `?prompt=` picks, every check day by day. Each prompt row is a link,
 * so picking works with JS off. The latest answers, brands named and notes
 * follow in the next part.
 */

const CARD: React.CSSProperties = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: "18px" };
const H2: React.CSSProperties = { margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink };
const LEDE: React.CSSProperties = { margin: 0, fontSize: "14px", color: T.soft };
const PILL: React.CSSProperties = { padding: "3px 9px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 };
const ROW_H = 64;
const PITCH = ROW_H + 4;
const CONN_W = 64;
const WORDS = ["no", "one", "two", "three", "four", "five"];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pct = (r: Rate) => (r.pct === null ? "-" : `${r.pct}%`);
const span = (r: Range) => `${formatDay(r.from)} - ${formatDay(r.to)}`;

export default function OneCluster({
  brand,
  domain,
  market,
  engines,
  today,
  range,
  compareMode,
  data,
  detail,
  index,
  total,
  prompt,
  clustersPath,
}: {
  brand: string;
  domain: string;
  market: string;
  engines: readonly Engine[];
  today: Day;
  range: Range;
  compareMode: Compare;
  data: OverviewData;
  detail: ClusterDetail;
  /** 1-based place among the client's clusters, for "Cluster 1 of 10". */
  index: number;
  total: number;
  /** The picked prompt, 0-based, already clamped to the cluster's prompts. */
  prompt: number;
  clustersPath: string;
}) {
  const c = detail.card;
  const before = comparisonRange(range, compareMode);
  const input: ClusterInput = { clusters: data.clusters ?? [], questions: data.questions, keywords: data.keywords, answers: data.answers, serp: data.serp, range, before, today, engines };
  const chart = clusterChart(input, c.id);
  const hasPrev = !!chart?.namedBefore?.some((p) => p !== null);
  const pending = c.status === "pending";
  const rangeQuery = { from: range.from, to: range.to, ...(compareMode === "prev" ? {} : { compare: compareMode }) };
  const promptHref = (i: number) => `?${new URLSearchParams({ ...rangeQuery, prompt: String(i) })}`;
  const back = `${clustersPath}?${new URLSearchParams(rangeQuery)}`;
  const where = market === "UK" ? "the United Kingdom" : "the United States";
  const days = daysIn(range);
  const P = c.prompts[prompt] ?? null;
  const strip = P ? promptStrip({ answers: data.answers, range, engines }, P.id) : [];
  const kw = c.keyword ?? c.name;
  const posLine = c.position === null ? (c.keyword ? "Not in the top 20" : "No keyword yet") : domain;
  const upFrom = c.positionBefore !== null && detail.positionBeforeOn ? `, ${c.positionChange && c.positionChange > 0 ? "up" : c.positionChange && c.positionChange < 0 ? "down" : "same as"} from #${c.positionBefore} on ${formatDay(detail.positionBeforeOn)}` : "";
  const mid = (c.prompts.length * PITCH - 4) / 2;

  const fig = (label: string, figure: string, big: React.ReactNode, extra: React.ReactNode, sub: string, first = false) => (
    <div style={{ flex: "1 1 0", padding: "22px 24px", display: "flex", flexDirection: "column", gap: "8px", minWidth: 0, borderLeft: first ? undefined : `1px solid ${T.line}` }}>
      <span style={{ fontSize: "13px", fontWeight: 600, color: T.soft }}>{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
        <span data-figure={figure} style={{ display: "contents" }}>
          {big}
        </span>
        {extra}
      </span>
      <span style={{ fontSize: "13px", color: T.soft }}>{sub}</span>
    </div>
  );
  const big = (t: string) => <span style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{t}</span>;
  const rel = detail.reliable;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", color: T.ink }}>
      <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}>
        <Link href={back} style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 600, color: T.accent, textDecoration: "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Clusters
        </Link>
        <span style={{ color: T.soft }}>{`/ Cluster ${index} of ${total}`}</span>
      </nav>

      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "32px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ ...PILL, background: T.chip, color: T.ink }}>Google keyword</span>
            {c.intent ? <span style={{ ...PILL, background: T.wash, color: T.accent }}>{cap(c.intent)}</span> : null}
            {c.volume !== null ? <span style={{ fontSize: "13px", color: T.soft }}>{`${c.volume.toLocaleString("en-GB")} searches a month in ${where}`}</span> : null}
          </div>
          <h1 style={{ margin: 0, fontSize: "32px", lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.03em" }}>{kw}</h1>
          <p style={LEDE}>
            {`${c.prompts.length} prompt${c.prompts.length === 1 ? "" : "s"} asked every morning on ${WORDS[engines.length] ?? engines.length} engines, and the keyword checked on Google. `}
            {pending ? "First check tomorrow at 06:00." : `Tracked since ${formatDay(c.started_on, true)}.`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", height: "48px", padding: "0 14px", border: `1px solid ${T.line}`, borderRadius: "12px", background: T.surface, flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
            <span style={{ fontSize: "14px", fontWeight: 700 }}>{days.length === 28 && range.to === today ? "Last 28 days" : `${days.length} days`}</span>
            <span style={{ fontSize: "12px", color: T.soft }}>{`${formatDay(range.from)} - ${formatDay(range.to, true)}${before ? `, vs ${span(before)}` : ""}`}</span>
          </span>
        </div>
      </header>

      <section aria-label="Summary" className="app-cl-sum" style={{ ...CARD, display: "flex", flexWrap: "wrap" }}>
        {fig("Answers naming you", "cl-named", big(`${c.now.num} of ${c.now.den}`), <Chip value={c.delta} unit=" pts" none={pending ? "Tomorrow" : "New"} />, c.before ? `${pct(c.now)} this period, ${pct(c.before)} the one before` : `${pct(c.now)} this period`, true)}
        {fig("Google position", "cl-google", big(c.position === null ? "-" : `#${c.position}`), <Chip value={c.positionChange} unit="" none={pending ? "Tomorrow" : "New"} />, `${posLine}${upFrom}`)}
        {fig("Prompts naming you", "cl-prompts", big(`${c.promptsNamed.num} of ${c.promptsNamed.den}`), null, "Each named you on at least one engine")}
        {fig(
          "Most reliable engine",
          "cl-reliable",
          rel ? (
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <EngineLogo engine={rel.engine as Engine} size={24} />
              <span style={{ fontSize: "22px", fontWeight: 700 }}>{ENGINE_SPECS[rel.engine as Engine].label}</span>
            </span>
          ) : (
            big("-")
          ),
          null,
          rel ? `Named you in ${rel.rate.num} of ${rel.rate.den} answers` : pending ? "No answers yet" : "No engine named you this period",
        )}
      </section>

      {chart ? (
        <ClusterChart
          data={{
            keyword: kw,
            title: "AI answers and Google, day by day",
            site: domain,
            brand,
            days: chart.days.map((d, i) => (i === chart.days.length - 1 && d === today ? "Today" : formatDay(d))),
            dayLabels: chart.days.map((d) => formatDay(d, true)),
            named: chart.named,
            google: chart.google,
            prevLabels: before ? daysIn(before).map((d) => formatDay(d)) : null,
            namedBefore: chart.namedBefore,
            googleBefore: chart.googleBefore,
            beforeLabel: before ? span(before) : null,
            answersPerDay: c.prompts.length * engines.length,
            pending,
            note: !pending && !hasPrev ? `Tracked from ${formatDay(c.started_on)}. No earlier period to compare yet.` : null,
            phoneLine: pending
              ? "First check tomorrow at 06:00."
              : `${pct(c.now)} named, ${c.position === null ? (c.keyword ? "no Google position" : "no keyword yet") : `#${c.position} on Google`}.` + (hasPrev && before ? ` Dashed: ${span(before)}` : ` Tracked from ${formatDay(c.started_on)}.`),
            openHref: null,
          }}
        />
      ) : null}

      <section aria-labelledby="lk-h" style={{ ...CARD, padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <h2 id="lk-h" style={H2}>
              {`The ${c.prompts.length} prompts behind this keyword`}
            </h2>
            <p style={LEDE}>One per angle, each asking for a recommendation. Pick one to see every check and what each engine said.</p>
          </div>
          <Link href={`${clustersPath}?${new URLSearchParams({ ...rangeQuery, open: c.id })}`} style={{ fontSize: "14px", fontWeight: 600, color: T.accent, textDecoration: "none", flexShrink: 0 }}>
            Manage prompts
          </Link>
        </div>
        <div className="app-pair" style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 360px", minWidth: 0 }}>
            {c.prompts.map((p, i) => {
              const on = i === prompt;
              return (
                <Link
                  key={p.id}
                  href={promptHref(i)}
                  scroll={false}
                  aria-current={on ? "true" : undefined}
                  className="app-cl-prow"
                  style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 52px 80px", alignItems: "center", gap: "12px", height: `${ROW_H}px`, boxSizing: "border-box", padding: "0 14px", borderRadius: "12px", border: `1px solid ${on ? T.accent : T.hair}`, background: on ? T.surface : T.bg, boxShadow: on ? `0 0 0 3px ${T.wash}` : "none", color: T.ink, textDecoration: "none" }}
                >
                  <span style={{ display: "flex", flexDirection: "column", gap: "7px", minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <span style={{ flexShrink: 0, padding: "2px 8px", borderRadius: "6px", background: on ? T.wash : T.chip, color: on ? T.accent : T.soft, fontSize: "11px", fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase" }}>{p.angle ?? "prompt"}</span>
                      <span style={{ fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.text}</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {p.daysNamed.map((e) => (
                        <span key={e.engine} title={`${ENGINE_SPECS[e.engine as Engine].label}: named on ${e.days} of ${p.daysChecked} days`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ display: "inline-flex", opacity: e.days ? 1 : 0.25 }}>
                            <EngineLogo engine={e.engine as Engine} size={16} />
                          </span>
                          <span style={{ fontSize: "12px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{e.days}</span>
                        </span>
                      ))}
                      <span style={{ fontSize: "12px", color: T.soft }}>{`days named, of ${p.daysChecked}`}</span>
                    </span>
                  </span>
                  <span style={{ fontSize: "16px", fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }} title={`${p.now.num} of ${p.now.den} answers`}>
                    {pct(p.now)}
                  </span>
                  <span style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Chip value={pointsDelta(p.now, p.before)} unit=" pts" none={pending ? "Tomorrow" : "New"} />
                  </span>
                </Link>
              );
            })}
          </div>
          <svg className="app-hide-sm" width={CONN_W} height={c.prompts.length * PITCH - 4} viewBox={`0 0 ${CONN_W} ${c.prompts.length * PITCH - 4}`} aria-hidden="true" style={{ flexShrink: 0 }}>
            {c.prompts.map((p, i) => {
              const y = ROW_H / 2 + i * PITCH;
              const on = i === prompt;
              return <path key={p.id} d={`M0,${y} C${CONN_W * 0.55},${y} ${CONN_W * 0.45},${mid} ${CONN_W},${mid}`} fill="none" stroke={on ? T.accent : p.now.num ? T.washLine : T.line} strokeWidth={on ? 2.6 : 1.6} strokeLinecap="round" />;
            })}
            <circle cx={CONN_W - 3} cy={mid} r={4} fill={T.accent} />
          </svg>
          <div className="app-cl-kw" style={{ width: "256px", flexShrink: 0, boxSizing: "border-box", padding: "18px", borderRadius: "14px", border: `1px solid ${T.washLine}`, background: T.bg, display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: T.soft }}>Google keyword</span>
            <span style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.3 }}>{kw}</span>
            <span style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{c.position === null ? "-" : `#${c.position}`}</span>
              <Chip value={c.positionChange} unit="" none={pending ? "Tomorrow" : "New"} />
            </span>
            {c.positionBefore !== null && detail.positionBeforeOn ? <span style={{ fontSize: "13px", color: T.soft }}>{`was #${c.positionBefore} on ${formatDay(detail.positionBeforeOn)}`}</span> : null}
            <span style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {c.intent ? <span style={{ ...PILL, background: T.wash, color: T.accent }}>{cap(c.intent)}</span> : null}
              {c.volume !== null ? <span style={{ ...PILL, background: T.chip, color: T.ink }}>{`${c.volume.toLocaleString("en-GB")} a month`}</span> : null}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: "2px", borderTop: `1px solid ${T.line}` }}>
              <span style={{ fontSize: "12px", color: T.soft, paddingTop: "10px" }}>Your ranking page</span>
              <span style={{ fontSize: "13px", fontWeight: 500 }}>{c.position === null ? "None in the top 20" : domain}</span>
            </span>
          </div>
        </div>
      </section>

      {P ? (
        <section aria-labelledby="strip-h" style={{ ...CARD, padding: "24px", display: "flex", flexDirection: "column", gap: "14px", overflowX: "auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
              <h2 id="strip-h" style={H2}>
                Every check, day by day
              </h2>
              <p style={{ margin: 0, fontSize: "14px", color: T.ink }}>{`${P.angle ? `${cap(P.angle)}: ` : ""}${P.text}`}</p>
            </div>
            <span style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", color: T.soft, flexShrink: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: T.accent }} />
                Named you
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: T.hair, border: `1px solid ${T.line}`, boxSizing: "border-box" }} />
                {"Didn't name you"}
              </span>
            </span>
          </div>
          {strip.map((r) => (
            <div key={r.engine} style={{ display: "grid", gridTemplateColumns: "170px minmax(0, 1fr) 92px", alignItems: "center", gap: "16px", minWidth: `${282 + days.length * 26}px` }}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
                <EngineLogo engine={r.engine as Engine} size={20} />
                {ENGINE_SPECS[r.engine as Engine].label}
              </span>
              <span style={{ display: "flex", gap: "4px" }}>
                {r.cells.map((x, k) => (
                  <span
                    key={days[k]}
                    title={`${formatDay(days[k]!)}: ${x === null ? "no answer" : x ? "named" : "not named"}`}
                    style={{ width: "22px", height: "28px", flexShrink: 0, borderRadius: "5px", boxSizing: "border-box", background: x ? T.accent : x === false ? T.hair : T.surface, border: x === null ? `1px dashed ${T.line}` : undefined }}
                  />
                ))}
              </span>
              <span style={{ fontSize: "14px", fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{`${r.named} of ${r.answered}`}</span>
            </div>
          ))}
          <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "170px minmax(0, 1fr) 92px", gap: "16px", minWidth: `${282 + days.length * 26}px` }}>
            <span />
            <span style={{ display: "flex", gap: "4px" }}>
              {days.map((d, i) => (
                <span key={d} style={{ width: "22px", flexShrink: 0, fontSize: "12px", color: T.soft, textAlign: "center", whiteSpace: "nowrap" }}>
                  {i === days.length - 1 && d === today ? "Today" : i % 7 === 0 || i === days.length - 1 ? formatDay(d) : ""}
                </span>
              ))}
            </span>
            <span />
          </div>
        </section>
      ) : null}
    </div>
  );
}
