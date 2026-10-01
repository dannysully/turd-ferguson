import Link from "@/components/app/AppLink";
import SubmitButton from "@/components/app/SubmitButton";
import { rangeLabel } from "@/lib/tracking/date-range";

import DatePicker from "./DatePicker";

import EngineLogo from "@/components/EngineLogo";
import { APP_LIMITS } from "@/config/contact";
import { ADMIN_LIMITS } from "@/lib/tracking/decide";
import { PROMPT_MIN } from "@/lib/tracking/slot";
import { PACK_CLUSTERS, PACK_KEYWORDS, PACK_PROMPTS } from "@/config/pricing";
import { T } from "@/config/tokens";
import { ENGINE_SPECS, type Engine } from "@/lib/scan/engines";
import { type ClusterCard, type ClusterFilter as Filter, clusterCards, filterClusters, namedCount, neverCount } from "@/lib/tracking/cluster-figures";
import { type Range, comparisonRange, daysIn, formatDay } from "@/lib/tracking/figures";
import { type KeywordCheck, draftPrompts } from "@/lib/tracking/add-cluster";
import { ANGLES, BRANDED_CHIP, BRANDED_NOTE, type Subject, namesBrandIn } from "@/lib/tracking/limits";
import type { Compare, OverviewData } from "@/lib/tracking/overview-data";
import { partialRunNote } from "@/lib/tracking/run-note";

import type { TierKey } from "@/components/TierName";
import type { UpsellMode } from "@/lib/tracking/ask";
import { neverNamedFacts, offPageOneFacts } from "@/lib/tracking/upgrade-facts";
import { type Facts, type PromptCta, pickPrompt, promptCopy } from "@/lib/tracking/upgrade-prompts";

import { Chip } from "./Overview";
import UpgradePrompt from "./UpgradePrompt";

/**
 * The Clusters page (BRIEF-3 T6 part 1, 30 Sep 2026; boards-3/Questions.dc.html):
 * "What we track", the filters and search, the usage bar and the accordion -
 * one row per cluster, one open at a time. A closed row is the keyword, its
 * meta, a dot per prompt naming you, the AI rate and the Google position with
 * their changes; the open row lists its 5 prompts with each engine's days
 * named of days checked, joined to the keyword card.
 *
 * Opening, filtering and searching are links and a GET form
 * (`?open=&filter=&q=`), so all of it works with JS off. Stop and Undo (part
 * 2b) are plain POST forms to /api/app/[client]/stop?kind=&id=, which answers with a 303
 * back here carrying `?done=&kind=&id=`; the toast is drawn from those, never
 * from free text in the URL. Owners and editors see the controls, viewers do
 * not. The free slot (part 2c) posts to /prompt and the pending editor (part
 * 2d) to /edit. "Add a cluster" (part 3b) is a link to `?add=1`, and its
 * "Check keyword" form posts to /check, which 303s back with the verdict.
 */

export type StopToast = { done: "stopped" | "undone" | "added" | "saved" | "refused"; kind: "prompt" | "cluster"; id: string };

const short = (t: string) => (t.length > 52 ? `${t.slice(0, 50)}…` : t);

/** R133: the warning on a prompt that names the client's brand. It warns only; tracking one is the client's choice. */
function BrandedChip() {
  return (
    <span title={BRANDED_NOTE} style={{ flexShrink: 0, padding: "2px 8px", borderRadius: "999px", background: T.warnBg, color: T.warnFg, fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap" }}>
      {BRANDED_CHIP}
    </span>
  );
}


const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pctText = (p: number | null) => (p === null ? "-" : `${p}%`);
const ROW_H = 64;
const PITCH = ROW_H + 4;
const BLOCK_H = 5 * PITCH - 4;
const GRID = "28px minmax(0, 1fr) 168px 132px 132px";

export default function Clusters({
  brand,
  engines,
  today,
  range,
  compareMode,
  startedOn,
  data,
  clusterLimit,
  open,
  filter,
  q,
  slug,
  canWrite,
  toast,
  adding = null,
  asked = null,
  askSent = false,
  packPrice = "",
  upgrade = null,
  subject = null,
}: {
  brand: string;
  /** R133: the client's brand and domain, so a prompt that names them carries the "Names the brand" chip. */
  subject?: Subject | null;
  engines: readonly Engine[];
  today: string;
  range: Range;
  compareMode: Compare;
  /** The client's started_on, the date picker's first pickable day (T5). */
  startedOn?: string | null;
  data: OverviewData;
  clusterLimit: number;
  open: string | null;
  filter: Filter;
  q: string;
  slug: string;
  canWrite: boolean;
  toast: StopToast | null;
  adding?: Adding | null;
  /** The /ask confirmation or refusal, built by the page from the 303's one word. */
  asked?: string | null;
  /** Whether that line says the ask went (the board's dark pill) or not. */
  askSent?: boolean;
  packPrice?: string;
  /** T11: what the never filter's alwaysmentioned prompt is judged on beyond the cards. */
  upgrade?: { tier: TierKey; mode: UpsellMode; hidden: ReadonlySet<PromptCta>; startedOn: string; domain: string } | null;
}) {
  const before = comparisonRange(range, compareMode);
  const partial = partialRunNote(data.lastRun, range, today);
  const cards = clusterCards({ clusters: data.clusters ?? [], questions: data.questions, keywords: data.keywords, answers: data.answers, serp: data.serp, range, before, today, engines });
  const shown = filterClusters(cards, filter, q);
  // The board opens on the first cluster; `?open=` with no id closes them all.
  const openId = open ?? cards[0]?.id ?? null;
  const base: Record<string, string> = { from: range.from, to: range.to, ...(compareMode === "prev" ? {} : { compare: compareMode }) };
  const href = (extra: Record<string, string>) => `?${new URLSearchParams({ ...base, ...(filter === "all" ? {} : { filter }), ...(q ? { q } : {}), ...extra })}`;
  // A stopped cluster frees its slot at once, though today's reading still shows (limits.ts).
  const used = cards.filter((c) => c.stoppedOn === null).length;
  const keep = { ...base, ...(filter === "all" ? {} : { filter }), ...(q ? { q } : {}), ...(open !== null ? { open } : {}) };
  const act = canWrite ? { action: `/api/app/${encodeURIComponent(slug)}/stop`, keep, today } : null;
  const full = used >= clusterLimit;
  const live = cards.filter((c) => c.status !== "pending");
  const filters: [Filter, string][] = [
    ["all", `All ${cards.length}`],
    ["named", `Naming you ${live.filter((c) => namedCount(c) > 0).length}`],
    ["never", `With prompts that never name you ${live.filter((c) => neverCount(c) > 0).length}`],
  ];
  const engineNames = engines.map((e) => ENGINE_SPECS[e].label);
  const since = before ? formatDay(addDaysBack(range.from)) : null;
  // T11: the never filter carries the alwaysmentioned prompt; the unfiltered list, which is the
  // cluster layout's Google keywords panel (each row's position), carries alwayscited. Each only
  // when its rules allow (upgrade-prompts.ts), and each screen is judged on its own panel's facts.
  const state = shown.length === 0 ? "empty" : data.lastRun?.status === "partial" ? "partial" : "ok";
  const facts: Facts | null =
    upgrade && filter === "never"
      ? { ...upgrade, today, state, neverNamed: neverNamedFacts({ cards, answers: data.answers, range, domain: upgrade.domain }) }
      : upgrade && filter === "all" && !q.trim()
        ? { ...upgrade, today, state, offPageOne: offPageOneFacts(cards) }
        : null;
  const cta = facts ? pickPrompt(facts) : null;
  const prompt = facts && (cta === "mentioned" || cta === "cited") ? promptCopy(cta, facts) : null;
  const items = cta === "mentioned" ? (facts?.neverNamed?.ids ?? []) : cta === "cited" ? (facts?.offPageOne?.ids ?? []) : [];

  return (
    <div className="app-col" style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>What we track</h1>
          <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, color: T.soft, maxWidth: "680px" }}>
            Each cluster is one Google keyword and 5 prompts about it. Every prompt is asked on {engineNames.length > 1 ? `${engineNames.slice(0, -1).join(", ")} and ${engineNames[engineNames.length - 1]}` : engineNames[0]} each morning, and every keyword is checked on Google. Changes start at the next daily check.
          </p>
          {partial ? <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, color: T.soft, maxWidth: "680px" }}>{partial}</p> : null}
        </div>
        {/* T5 (30 Sep 2026): the server-drawn face opens boards/DatePicker.dc.html; JS off still shows the range. */}
        <DatePicker range={range} compare={compareMode} today={today} startedOn={startedOn ?? null} grow={false}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
            <span style={{ fontSize: "14px", fontWeight: 700 }}>{rangeLabel(range, today, startedOn ?? null)}</span>
            <span style={{ fontSize: "12px", color: T.soft }}>
              {formatDay(range.from)} - {formatDay(range.to, true)}
              {before ? `, vs ${formatDay(before.from)} - ${formatDay(before.to)}` : ""}
            </span>
          </span>
        </DatePicker>
      </header>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <nav aria-label="Filter clusters" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {filters.map(([key, label]) => {
              const on = filter === key;
              const params = { ...base, ...(key === "all" ? {} : { filter: key }), ...(q ? { q } : {}) };
              return (
                <Link key={key} href={`?${new URLSearchParams(params)}`} aria-current={on ? "true" : undefined} style={{ display: "inline-flex", alignItems: "center", height: "36px", padding: "0 14px", borderRadius: "999px", border: `1px solid ${on ? T.washLine : T.line}`, background: on ? T.wash : T.surface, color: T.ink, fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
                  {label}
                </Link>
              );
            })}
          </nav>
          <form method="get" role="search" style={{ display: "flex", alignItems: "center", gap: "8px", width: "280px", maxWidth: "100%", height: "40px", boxSizing: "border-box", padding: "0 12px", border: `1px solid ${T.line}`, borderRadius: "12px", background: T.surface }}>
            <input id="cl-from" type="hidden" name="from" value={range.from} />
            <input id="cl-to" type="hidden" name="to" value={range.to} />
            {compareMode === "prev" ? null : <input id="cl-compare" type="hidden" name="compare" value={compareMode} />}
            {filter === "all" ? null : <input id="cl-filter" type="hidden" name="filter" value={filter} />}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.soft} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <label htmlFor="q-search" className="sr-only">
              Search clusters and prompts
            </label>
            <input id="q-search" name="q" defaultValue={q} maxLength={APP_LIMITS.search} placeholder="Search keywords and prompts" style={{ flexGrow: 1, minWidth: 0, border: 0, outline: 0, fontFamily: "inherit", fontSize: "14px", color: T.ink, background: "transparent" }} />
          </form>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "200px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: T.ink }}>{`${used} of ${clusterLimit} clusters in use`}</span>
            <span aria-hidden="true" style={{ height: "6px", borderRadius: "3px", background: T.hair, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${Math.min(100, Math.round((100 * used) / clusterLimit))}%`, background: full ? T.warnFg : T.accent, borderRadius: "3px" }} />
            </span>
          </div>
          {canWrite ? (
            <Link href={href({ add: "1" })} scroll={false} data-usage="add_open" style={{ display: "flex", alignItems: "center", gap: "8px", height: "44px", padding: "0 16px", borderRadius: "12px", background: T.accent, color: T.surface, fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.surface} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add a cluster
            </Link>
          ) : null}
        </div>
      </div>

      {asked ? (
        askSent ? (
          // CTAs.dc.html's "After Ask about these": a dark pill with a tick. The tick is the palette's good pair, not the board's light green.
          <p role="status" style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "14px", background: T.ink, color: T.surface, fontSize: "14px", lineHeight: 1.4, alignSelf: "flex-start", maxWidth: "100%", boxSizing: "border-box" }}>
            <span aria-hidden="true" style={{ flexShrink: 0, width: "22px", height: "22px", borderRadius: "50%", background: T.goodBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.goodFg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
            {asked}
          </p>
        ) : (
          <p role="status" style={{ margin: 0, padding: "12px 16px", borderRadius: "12px", background: T.wash, border: `1px solid ${T.washLine}`, fontSize: "14px", color: T.ink }}>
            {asked}
          </p>
        )
      ) : null}

      {canWrite && adding ? <AddPanel slug={slug} adding={adding} full={full} clusterLimit={clusterLimit} packPrice={packPrice} close={href({})} /> : null}

      <section aria-label="Clusters" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "18px", overflow: "hidden" }}>
        <div className="app-cl-grid app-hide-sm" style={{ display: "grid", gridTemplateColumns: GRID, gap: "16px", padding: "14px 24px 12px" }}>
          <span />
          <span style={HEAD}>Keyword and its prompts</span>
          <span style={HEAD}>Prompts naming you</span>
          <span style={{ ...HEAD, textAlign: "right" }}>Named, vs last period</span>
          <span style={{ ...HEAD, textAlign: "right" }}>{since ? `Position, vs ${since}` : "Position"}</span>
        </div>
        {shown.map((c) => (
          <ClusterRow key={c.id} c={c} brand={brand} subject={subject} open={c.id === openId} toggle={href({ open: c.id === openId ? "" : c.id })} since={since} act={act} refill={toast?.done === "stopped" && toast.kind === "prompt" ? toast.id : null} openHref={`/app/${encodeURIComponent(slug)}/clusters/${encodeURIComponent(c.id)}?${new URLSearchParams(base)}`} />
        ))}
        {shown.length === 0 ? (
          <div style={{ padding: "32px 24px", borderTop: `1px solid ${T.line}`, fontSize: "14px", color: T.soft }}>
            {q.trim() ? `Nothing matches “${q.trim()}”. Clear the search to see every cluster.` : cards.length ? "No clusters match this filter." : "No clusters yet. nomada digital sets up your first one when tracking starts."}
          </div>
        ) : null}
        {prompt && cta ? <UpgradePrompt copy={prompt} cta={cta} slug={slug} items={items} /> : null}
      </section>
      <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: T.soft, maxWidth: "820px" }}>
        The number beside each engine is the days it named {brand} for that prompt, out of the days checked. Stopping a prompt or a cluster keeps its history in your reports. A new prompt or cluster starts at the next daily check.
      </p>
      {toast ? <Toast t={toast} cards={cards} act={act} dismiss={`?${new URLSearchParams(keep)}`} /> : null}
    </div>
  );
}

const HEAD: React.CSSProperties = { fontSize: "12px", fontWeight: 600, color: T.soft };

export type Adding = { kw: string; check: KeywordCheck | null; sig: string };

/**
 * The board's Add a cluster panel (part 3b): the keyword and "Check keyword",
 * a plain POST to /check that 303s back with the verdict, rebuilt from fixed
 * words (add-cluster.ts). At the limit it is the +5 clusters offer instead.
 * On a signed pass, step 2 (part 3c): the five drafted prompts, editable, and
 * "Start tracking this cluster", a POST to /cluster. On a refusal that
 * allows it, "Ask us to pick one", a POST to T11's /ask (ask.ts).
 */
function AddPanel({ slug, adding, full, clusterLimit, packPrice, close }: { slug: string; adding: Adding; full: boolean; clusterLimit: number; packPrice: string; close: string }) {
  const ck = adding.check;
  const msg = ck ? ck.message : "It needs Google search volume and a buying intent, because it is the term placements link on. We check both before anything is tracked.";
  return (
    <section aria-label="Add a cluster" style={{ padding: "22px 24px", borderRadius: "18px", background: T.surface, border: `1px solid ${T.washLine}`, boxShadow: `0 0 0 4px ${T.wash}`, display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: T.ink }}>Add a cluster</h2>
          <span style={{ fontSize: "13px", color: T.soft }}>One Google keyword buyers search, and 5 prompts about it.</span>
        </div>
        <Link href={close} scroll={false} aria-label="Close" data-usage="add_abandon" style={{ width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
      </div>
      {full ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", padding: "16px 18px", borderRadius: "12px", background: T.warnBg }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: T.warnFg }}>{`All ${clusterLimit} clusters are in use`}</span>
            <span style={{ fontSize: "14px", color: T.ink }}>Stop tracking one below to make room. Its history stays in your reports.</span>
          </div>
          <Link href="/contact" style={{ flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", height: "52px", padding: "0 16px", borderRadius: "12px", background: T.ink, color: T.surface, textDecoration: "none" }}>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>{`Add ${PACK_CLUSTERS} clusters for ${packPrice} a month`}</span>
            <span style={{ fontSize: "12px", color: T.line }}>{`${PACK_PROMPTS} prompts and ${PACK_KEYWORDS} keywords, checked daily`}</span>
          </Link>
        </div>
      ) : (
        <form method="post" action={`/api/app/${encodeURIComponent(slug)}/check`} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <label htmlFor="kw-draft" style={{ fontSize: "13px", fontWeight: 600, color: T.ink }}>
            1. The keyword
          </label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input id="kw-draft" name="keyword" defaultValue={adding.kw} required maxLength={ADMIN_LIMITS.question} placeholder="e.g. accounting software for dentists" style={{ flex: "1 1 240px", minWidth: 0, height: "48px", boxSizing: "border-box", padding: "0 14px", border: `1px solid ${T.line}`, borderRadius: "12px", fontFamily: "inherit", fontSize: "15px", color: T.ink, background: T.surface }} />
            <SubmitButton busy="Checking..." style={{ height: "48px", padding: "0 18px", border: `1px solid ${T.ink}`, borderRadius: "12px", background: T.surface, color: T.ink, fontFamily: "inherit", fontSize: "14px", fontWeight: 600 }}>
              Check keyword
            </SubmitButton>
          </div>
          <p role={ck ? "status" : undefined} style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: ck ? (ck.ok ? T.goodFg : T.badFg) : T.soft }}>
            {msg}
          </p>
        </form>
      )}
      {!full && ck && !ck.ok && ck.ask && adding.kw ? (
        <form method="post" action={`/api/app/${encodeURIComponent(slug)}/ask`}>
          <input id="ask-keyword" type="hidden" name="keyword" value={adding.kw} />
          <SubmitButton busy="Sending..." style={{ height: "40px", padding: "0 14px", border: `1px solid ${T.line}`, borderRadius: "10px", background: T.surface, color: T.ink, fontFamily: "inherit", fontSize: "13px", fontWeight: 600 }}>
            Ask us to pick one
          </SubmitButton>
        </form>
      ) : null}
      {!full && ck?.ok && adding.sig ? (
        <form method="post" action={`/api/app/${encodeURIComponent(slug)}/cluster`} style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: `1px solid ${T.line}` }}>
          <input id="nc-keyword" type="hidden" name="keyword" value={ck.keyword} />
          <input id="nc-vol" type="hidden" name="vol" value={String(ck.volume)} />
          <input id="nc-intent" type="hidden" name="intent" value={ck.intent} />
          <input id="nc-sig" type="hidden" name="sig" value={adding.sig} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: T.ink, paddingTop: "16px" }}>2. Five prompts about it, one per angle</span>
          <span style={{ fontSize: "13px", color: T.soft }}>Each asks for a recommendation, the way a buyer would, so it shows whether engines name you. We’ve drafted them from the keyword. Edit any of them.</span>
          {draftPrompts(ck.keyword).map((text, i) => (
            <div key={ANGLES[i]} className="app-cl-edit" style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", alignItems: "center", gap: "12px" }}>
              <label htmlFor={`new-p-${i}`} style={{ fontSize: "12px", fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase", color: T.soft }}>
                {ANGLES[i]}
              </label>
              <input id={`new-p-${i}`} name={`p-${i}`} defaultValue={text} required minLength={PROMPT_MIN} maxLength={ADMIN_LIMITS.question} style={{ height: "44px", boxSizing: "border-box", padding: "0 12px", border: `1px solid ${T.line}`, borderRadius: "10px", fontFamily: "inherit", fontSize: "14px", color: T.ink, background: T.surface, minWidth: 0 }} />
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <SubmitButton busy="Starting tracking..." style={{ height: "48px", padding: "0 20px", border: 0, borderRadius: "12px", background: T.accent, color: T.surface, fontFamily: "inherit", fontSize: "14px", fontWeight: 600 }}>
              Start tracking this cluster
            </SubmitButton>
          </div>
        </form>
      ) : null}
    </section>
  );
}

/** The day before a range starts - the board's "vs 1 Sep" for a range from 2 Sep. */
function addDaysBack(d: string): string {
  return new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

type Act = { action: string; keep: Record<string, string>; today: string } | null;

/**
 * A stop or undo is a form, so it posts with JS off. What to stop and the page
 * state to come back to ride in the action's query string rather than hidden
 * fields, so a list of forms repeats no field ids; the route re-reads every one.
 */
function StopForm({ act, kind, id, undo, label, children, style }: { act: NonNullable<Act>; kind: "prompt" | "cluster"; id: string; undo?: boolean; label?: string; children: React.ReactNode; style: React.CSSProperties }) {
  const q = new URLSearchParams({ ...act.keep, kind, id, ...(undo ? { undo: "1" } : {}) });
  return (
    <form method="post" action={`${act.action}?${q}`} style={{ display: "contents" }}>
      <button type="submit" aria-label={label} title={label} style={{ cursor: "pointer", fontFamily: "inherit", ...style }}>
        {children}
      </button>
    </form>
  );
}

const STOP_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
const CHEVRON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);
const BTN: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "6px", height: "40px", padding: "0 14px", border: `1px solid ${T.line}`, borderRadius: "10px", background: T.surface, color: T.ink, fontSize: "13px", fontWeight: 600 };
const SQUARE: React.CSSProperties = { width: "36px", height: "36px", padding: 0, border: `1px solid ${T.line}`, borderRadius: "10px", background: T.surface, color: T.ink, display: "flex", alignItems: "center", justifyContent: "center" };

/** The board's toast: what the stop did, and Undo while it can still be undone. */
function Toast({ t, cards, act, dismiss }: { t: StopToast; cards: ClusterCard[]; act: Act; dismiss: string }) {
  const cluster = t.kind === "cluster" ? cards.find((c) => c.id === t.id) : cards.find((c) => c.prompts.some((p) => p.id === t.id));
  const prompt = t.kind === "prompt" ? cluster?.prompts.find((p) => p.id === t.id) : undefined;
  const name = t.kind === "cluster" ? (cluster?.keyword ?? cluster?.name) : prompt?.text;
  const stoppedOn = t.kind === "cluster" ? cluster?.stoppedOn : prompt?.stoppedOn;
  const canUndo = t.done === "stopped" && !!act && !!stoppedOn && stoppedOn > act.today;
  const text =
    t.done === "refused" || !name
      ? "That change did not go through. Reload the page and try again."
      : t.done === "added" && t.kind === "cluster"
        ? `Now tracking “${short(name)}” and 5 prompts. First results after tomorrow’s 06:00 check.`
      : t.done === "added"
        ? `Now tracking “${short(name)}”. First results after tomorrow’s 06:00 check.`
        : t.done === "saved"
        ? "Saved. The first check uses these prompts tomorrow at 06:00."
        : t.done === "undone"
        ? `Undone. “${short(name)}” is still tracked.`
        : t.kind === "cluster" && cluster?.status === "pending"
          ? `Removed “${short(name)}” before its first check.`
          : t.kind === "cluster"
          ? `Stopped tracking “${short(name)}” and its prompts. Their history stays in your reports.`
          : `Stopped “${short(name)}”. Its history stays in your reports, and the slot is free for a new prompt.`;
  return (
    <div role="status" className="app-toast" style={{ position: "fixed", left: "50%", bottom: "32px", transform: "translateX(-50%)", zIndex: 20, display: "flex", alignItems: "center", gap: "16px", padding: "12px 12px 12px 18px", borderRadius: "14px", background: T.ink, color: T.surface, fontSize: "14px", lineHeight: 1.4, boxShadow: "0 24px 60px -28px rgba(15,17,21,.6)", width: "max-content", maxWidth: "min(720px, calc(100vw - 32px))", boxSizing: "border-box" }}>
      <span>{text}</span>
      {canUndo && act ? (
        <StopForm act={act} kind={t.kind} id={t.id} undo style={{ flexShrink: 0, height: "36px", padding: "0 14px", border: 0, borderRadius: "10px", background: "rgba(255,255,255,.12)", color: T.surface, fontSize: "14px", fontWeight: 600 }}>
          Undo
        </StopForm>
      ) : null}
      <Link href={dismiss} scroll={false} aria-label="Dismiss" style={{ flexShrink: 0, width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.surface} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </Link>
    </div>
  );
}

/**
 * The pending cluster (part 2d): before its first check every live prompt is an
 * input, posted as `p-<id>` to /api/app/[client]/edit, which refuses any prompt
 * that has a reading. "Remove this cluster" is the stop form; a pending cluster
 * stopped today is never read. Two sibling forms, the Save button joined to its
 * form by `form=`, so neither nests and both post with JS off.
 */
function PendingEditor({ c, kw, lead, act, subject }: { c: ClusterCard; kw: string; lead: string; act: NonNullable<Act>; subject: Subject | null }) {
  const formId = `edit-${c.id}`;
  const live = c.prompts.filter((p) => p.stoppedOn === null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "4px 24px 22px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px", borderRadius: "12px", background: T.wash }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px" }}>
          <path d="M4 20h4L19 9l-4-4L4 16v4z" />
          <path d="M13.5 6.5l4 4" />
        </svg>
        <span style={{ fontSize: "14px", lineHeight: 1.5, color: T.ink }}>
          Edit freely until the first check, tomorrow at 06:00. After that a prompt can be stopped and replaced, not rewritten, so its history stays true to what was asked.
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: T.soft }}>Keyword</span>
        <span style={{ fontSize: "15px", fontWeight: 700, color: T.ink }}>{kw}</span>
        {lead ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "999px", background: T.goodBg, color: T.goodFg, fontSize: "12px", fontWeight: 600 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.goodFg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
            {lead}
          </span>
        ) : null}
      </div>
      <form id={formId} method="post" action={`${act.action.replace(/\/stop$/, "/edit")}?${new URLSearchParams({ ...act.keep, kind: "cluster", id: c.id })}`} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {live.map((p) => (
          <div key={p.id} className="app-cl-edit" style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", alignItems: "center", gap: "12px" }}>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
              <label htmlFor={`${formId}-${p.id}`} style={{ fontSize: "12px", fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase", color: T.soft }}>
                {p.angle ?? "Prompt"}
              </label>
              {subject && namesBrandIn(p.text, subject) ? <BrandedChip /> : null}
            </span>
            <input id={`${formId}-${p.id}`} name={`p-${p.id}`} defaultValue={p.text} required minLength={PROMPT_MIN} maxLength={ADMIN_LIMITS.question} style={{ height: "44px", boxSizing: "border-box", padding: "0 12px", border: `1px solid ${T.line}`, borderRadius: "10px", fontFamily: "inherit", fontSize: "14px", color: T.ink, background: T.surface, minWidth: 0 }} />
          </div>
        ))}
      </form>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
        <StopForm act={act} kind="cluster" id={c.id} style={{ height: "44px", padding: "0 16px", border: `1px solid ${T.line}`, borderRadius: "12px", background: T.surface, color: T.ink, fontSize: "14px", fontWeight: 600 }}>
          Remove this cluster
        </StopForm>
        <SubmitButton form={formId} busy="Saving..." style={{ height: "44px", padding: "0 18px", border: 0, borderRadius: "12px", background: T.accent, color: T.surface, fontFamily: "inherit", fontSize: "14px", fontWeight: 600 }}>
          Save changes
        </SubmitButton>
      </div>
    </div>
  );
}

/**
 * `refill` (R103, 30 Sep 2026): the prompt just stopped. Once a prompt has a
 * reading its text is fixed, so a rewording is "Stop and add a new one": the
 * stop frees its slot at once, and that slot opens with the old text in it to
 * edit, as a new row with its own history.
 */
function ClusterRow({ c, brand, subject, open, toggle, since, act, refill, openHref }: { c: ClusterCard; brand: string; subject: Subject | null; open: boolean; toggle: string; since: string | null; act: Act; refill: string | null; openHref: string }) {
  const pending = c.status === "pending";
  // A stop made today shows until tomorrow's check, with Undo; the slot is already free.
  const stopped = c.stoppedOn !== null;
  const undoable = !!act && stopped && c.stoppedOn! > act.today;
  // The free slot (part 2c): a live cluster with fewer than 5 live prompts offers
  // the place of a stopped one, at its angle, to owners and editors.
  const free = Math.max(0, 5 - c.prompts.filter((p) => p.stoppedOn === null).length);
  const slots = new Set(act && !stopped && !pending ? c.prompts.filter((p) => p.stoppedOn !== null).slice(0, free).map((p) => p.id) : []);
  const kw = c.keyword ?? c.name;
  const vol = c.volume !== null ? `${c.volume.toLocaleString("en-GB")} searches a month` : null;
  const lead = [c.intent ? cap(c.intent) : null, vol].filter(Boolean).join(", ");
  const meta = stopped
    ? `${lead ? `${lead}. ` : ""}Stopped from ${formatDay(c.stoppedOn!)}. Its history stays in your reports`
    : pending
      ? `${lead ? `${lead}. ` : ""}Added today, first check tomorrow at 06:00`
      : `${lead ? `${lead}. ` : ""}Since ${formatDay(c.started_on)}`;
  const named = namedCount(c);
  const mid = BLOCK_H / 2;
  return (
    <div style={{ borderTop: `1px solid ${T.line}`, background: open ? T.bg : T.surface }}>
      <Link href={toggle} scroll={false} aria-expanded={open} className="app-cl-grid" style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: "16px", padding: "16px 24px", color: T.ink, textDecoration: "none" }}>
        <span aria-hidden="true" style={{ display: "flex", width: "28px", height: "28px", alignItems: "center", justifyContent: "center", borderRadius: "8px", background: T.chip, transform: `rotate(${open ? 90 : 0}deg)` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
          <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.01em" }}>{kw}</span>
          <span style={{ fontSize: "12px", color: T.soft }}>{meta}</span>
        </span>
        <span className="app-hide-sm" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <span style={{ fontSize: "12px", color: T.soft }}>{pending ? "Checked from tomorrow" : `${named} of ${c.prompts.length} name you`}</span>
          <span style={{ display: "flex", gap: "4px" }}>
            {c.prompts.map((p) => {
              const fill = pending ? T.wash : p.now.num > 0 ? T.accent : T.line;
              return <span key={p.id} style={{ width: "22px", height: "8px", borderRadius: "4px", background: fill }} />;
            })}
          </span>
        </span>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <span style={{ fontSize: "12px", color: T.soft }}>AI answers</span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "17px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }} title={pending ? undefined : `${c.now.num} of ${c.now.den} answers`}>
              {pctText(c.now.pct)}
            </span>
            <Chip value={c.delta} unit=" pts" none={pending ? "Tomorrow" : "New"} />
          </span>
        </span>
        <span className="app-hide-sm" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <span style={{ fontSize: "12px", color: T.soft }}>Google</span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "17px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{c.position === null ? "-" : `#${c.position}`}</span>
            <Chip value={c.positionChange} unit="" none={c.keyword === null ? "No keyword" : pending ? "Tomorrow" : "New"} />
          </span>
        </span>
      </Link>

      {open && pending && act && !stopped ? (
        <PendingEditor c={c} kw={kw} lead={lead} act={act} subject={subject} />
      ) : open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "4px 24px 22px" }}>
          <div className="app-cl-body" style={{ display: "flex", alignItems: "center" }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "4px", flexGrow: 1, minWidth: 0 }}>
              {c.prompts.map((p) => act && slots.has(p.id) ? (
                <li key={p.id} className="app-cl-prompt" style={{ minHeight: `${ROW_H}px`, boxSizing: "border-box", padding: "8px 12px 8px 14px", borderRadius: "12px", background: T.surface, border: `1px dashed ${T.washLine}`, display: "flex", alignItems: "center" }}>
                  <form method="post" action={`${act.action.replace(/\/stop$/, "/prompt")}?${new URLSearchParams({ ...act.keep, kind: "cluster", id: c.id, ...(p.angle ? { angle: p.angle } : {}) })}`} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", flexWrap: "wrap" }}>
                    <span style={{ flexShrink: 0, padding: "2px 8px", borderRadius: "6px", background: T.chip, color: T.soft, fontSize: "11px", fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase" }}>{p.angle ?? "Prompt"}</span>
                    <label htmlFor={`slot-${p.id}`} className="sr-only">{`A new ${p.angle ? `${p.angle} ` : ""}prompt about ${kw}`}</label>
                    <input id={`slot-${p.id}`} name="text" defaultValue={p.id === refill ? p.text : undefined} required minLength={PROMPT_MIN} maxLength={ADMIN_LIMITS.question} placeholder={`A new ${p.angle ? `${p.angle} ` : ""}prompt about “${kw}”`} style={{ flex: "1 1 200px", minWidth: 0, height: "40px", boxSizing: "border-box", padding: "0 12px", border: `1px solid ${T.line}`, borderRadius: "10px", fontFamily: "inherit", fontSize: "14px", color: T.ink, background: T.surface }} />
                    <SubmitButton busy="Adding..." style={{ flexShrink: 0, height: "40px", padding: "0 14px", border: 0, borderRadius: "10px", background: T.accent, color: T.surface, fontFamily: "inherit", fontSize: "13px", fontWeight: 600 }}>
                      {/* The board's word here is the alwaystracked CTA's label, which only pricing.ts may type (tier-action.test.mts); a slot is not a sign-up. */}
                      Track this prompt
                    </SubmitButton>
                  </form>
                </li>
              ) : (
                <li key={p.id} className="app-cl-prompt" style={{ display: "grid", gridTemplateColumns: act ? "minmax(0, 1fr) 52px 76px 36px" : "minmax(0, 1fr) 52px 76px", alignItems: "center", gap: "12px", minHeight: `${ROW_H}px`, boxSizing: "border-box", padding: "8px 12px 8px 14px", borderRadius: "12px", background: T.surface, border: `1px solid ${T.hair}`, opacity: p.stoppedOn !== null && !stopped ? 0.6 : 1 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px", minWidth: 0 }}>
                    <div className="app-cl-text-row" style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <span style={{ flexShrink: 0, padding: "2px 8px", borderRadius: "6px", background: T.chip, color: T.soft, fontSize: "11px", fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase" }}>{p.angle ?? "Prompt"}</span>
                      <span title={p.text} className="app-cl-text" style={{ fontSize: "14px", fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.text}
                      </span>
                      {subject && namesBrandIn(p.text, subject) ? <BrandedChip /> : null}
                    </div>
                    {p.stoppedOn !== null && !stopped ? (
                      <span style={{ fontSize: "12px", color: T.soft, fontWeight: 600 }}>{`Stopped from ${formatDay(p.stoppedOn)}. Its history stays in your reports.`}</span>
                    ) : pending ? (
                      <span style={{ fontSize: "12px", color: T.accent, fontWeight: 600 }}>First check tomorrow at 06:00</span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        {p.daysNamed.map((d) => (
                          <span key={d.engine} title={`${ENGINE_SPECS[d.engine as Engine]?.label ?? d.engine}: named ${brand} on ${d.days} of ${p.daysChecked} days`} style={{ display: "inline-flex", alignItems: "center", gap: "4px", opacity: d.days ? 1 : 0.4 }}>
                            <EngineLogo engine={d.engine as Engine} size={16} />
                            <span style={{ fontSize: "12px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{d.days}</span>
                          </span>
                        ))}
                        <span style={{ fontSize: "12px", color: T.soft }}>{`days named, of ${p.daysChecked}`}</span>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: "16px", fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }} title={pending ? undefined : `${p.now.num} of ${p.now.den} answers`}>
                    {pctText(p.now.pct)}
                  </span>
                  <span style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Chip value={p.before && p.now.pct !== null && p.before.pct !== null ? p.now.pct - p.before.pct : null} unit=" pts" none={pending ? "Tomorrow" : "New"} />
                  </span>
                  {act ? (
                    !stopped && p.stoppedOn === null ? (
                      <StopForm act={act} kind="prompt" id={p.id} label={p.now.den > 0 ? `Stop and add a new one: ${p.text}` : `Stop tracking: ${p.text}`} style={SQUARE}>
                        {STOP_ICON}
                      </StopForm>
                    ) : !stopped && p.stoppedOn !== null && p.stoppedOn > act.today ? (
                      <StopForm act={act} kind="prompt" id={p.id} undo label={`Undo stop: ${p.text}`} style={{ ...SQUARE, fontSize: "11px", fontWeight: 700 }}>
                        Undo
                      </StopForm>
                    ) : (
                      <span />
                    )
                  ) : null}
                </li>
              ))}
            </ul>
            <svg className="app-hide-sm" width="64" height={BLOCK_H} viewBox={`0 0 64 ${BLOCK_H}`} aria-hidden="true" style={{ flexShrink: 0 }}>
              {c.prompts.map((p, i) => {
                const y = ROW_H / 2 + i * PITCH;
                const on = !pending && p.now.num > 0;
                return <path key={p.id} d={`M0,${y} C35,${y} 29,${mid} 64,${mid}`} fill="none" stroke={pending ? T.washLine : on ? T.accent : T.line} strokeWidth={1.8} strokeDasharray={on ? undefined : "3 4"} strokeLinecap="round" />;
              })}
              <circle cx={61} cy={mid} r={4} fill={T.accent} />
            </svg>
            <div className="app-cl-kw" style={{ width: "256px", flexShrink: 0, boxSizing: "border-box", padding: "18px", borderRadius: "14px", border: `1px solid ${T.washLine}`, background: T.surface, display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: T.soft }}>Google keyword</span>
              <span style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.3 }}>{c.keyword ?? "Needs a keyword"}</span>
              <span style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{c.position === null ? "-" : `#${c.position}`}</span>
                <Chip value={c.positionChange} unit="" none={c.keyword === null ? "No keyword" : pending ? "Tomorrow" : "New"} />
              </span>
              <span style={{ fontSize: "13px", color: T.soft }}>
                {/* R148 pass 9 (1 Oct 2026): a signup whose scan chose no keyword left "-" with no next step; nomada picks it (signup.ts order email). */}
                {c.keyword === null ? "We add its Google keyword for you." : c.positionBefore !== null && since ? `was #${c.positionBefore} on ${since}` : pending ? "First check tomorrow at 06:00" : `Tracked since ${formatDay(c.started_on)}`}
              </span>
              {c.intent || vol ? (
                <span style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {c.intent ? <span style={{ padding: "3px 9px", borderRadius: "999px", background: T.wash, color: T.accent, fontSize: "12px", fontWeight: 600 }}>{cap(c.intent)}</span> : null}
                  {c.volume !== null ? <span style={{ padding: "3px 9px", borderRadius: "999px", background: T.chip, color: T.ink, fontSize: "12px", fontWeight: 600 }}>{`${c.volume.toLocaleString("en-GB")} a month`}</span> : null}
                </span>
              ) : null}
              {/* R90 sweep: Questions.dc.html closes the card on the ranking page, as OneCluster does. */}
              {!pending && subject ? (
                <span style={{ display: "flex", flexDirection: "column", gap: "2px", borderTop: `1px solid ${T.line}` }}>
                  <span style={{ fontSize: "12px", color: T.soft, paddingTop: "10px" }}>Your ranking page</span>
                  <span style={{ fontSize: "13px", fontWeight: 500 }}>{c.keyword === null ? "Once its keyword is added" : c.position === null ? "None in the top 20" : subject.domain}</span>
                </span>
              ) : null}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", color: T.soft }}>
              {c.status === "added" ? `Added ${formatDay(c.started_on)}, so there is no earlier period to compare against yet.` : pending ? "Its prompts are asked from tomorrow's 06:00 check." : "Dates and comparisons apply to the prompts and the keyword alike."}
            </span>
            <span style={{ display: "flex", gap: "10px" }}>
              {/* T7: the board's "Open cluster" goes to QuestionDetail, the one-cluster page, for every role. */}
              <Link href={openHref} data-usage="detail_open" style={{ ...BTN, textDecoration: "none" }}>
                Open cluster
                {CHEVRON}
              </Link>
              {act && (!stopped || undoable) ? (
                <StopForm act={act} kind="cluster" id={c.id} undo={stopped} style={BTN}>
                  {stopped ? null : STOP_ICON}
                  {stopped ? "Undo stop" : "Stop tracking this cluster"}
                </StopForm>
              ) : null}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
