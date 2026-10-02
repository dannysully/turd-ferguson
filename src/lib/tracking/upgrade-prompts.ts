import type { TierKey } from "../tier-text.ts";

import type { UpsellMode } from "./ask.ts";

/**
 * The upgrade prompts' rules (BRIEF-2 T11 as amended by BRIEF-3, 30 Sep 2026;
 * boards-3/CTAs.dc.html). Pure and unwired: the screens gather the facts, this
 * decides which one prompt, if any, a screen draws, and writes its words.
 *
 * - At most one prompt per screen; the highest tier gap wins.
 * - None in a client's first 14 days, or on an empty, error or partial state.
 * - Never for a tier already held.
 * - None when `upsell_mode = 'off'`; in `agency` mode no tier name is written
 *   and there is no tier-page button, only the ask (which goes to the agency).
 * - Hidden stays hidden for 30 days for that member (`cta_events` `hidden`).
 *
 * The unit is a cluster (BRIEF-3 T11): `tier` is the tier of the cluster the
 * screen is about, or the client's when the screen is the whole client.
 */

export type PromptCta = "mentioned" | "cited" | "everywhere" | "pack" | "cluster";
export type ScreenState = "ok" | "empty" | "error" | "partial";

export const QUIET_DAYS = 14;
export const HIDE_DAYS = 30;

/** Thresholds, as the brief's table. */
export const NEVER_NAMED_MIN = 3;
export const OFF_PAGE_ONE_MIN = 2;
export const TRADE_CITATIONS_MIN = 10;
export const TRADE_CITATIONS_RATIO = 5;

/**
 * alwaysmentioned's placements, as pricing.ts's own include line says it
 * ("3 placements a month on one topic"). Typed here because pricing.ts cannot
 * load under node --test; upgrade-prompts.test.mts pins the two together.
 */
export const MENTIONED_PLACEMENTS = "3 placements a month";

const RANK: Record<TierKey, number> = { tracked: 0, mentioned: 1, cited: 2, everywhere: 3 };

export type Facts = {
  tier: TierKey;
  mode: UpsellMode;
  state: ScreenState;
  startedOn: string;
  today: string;
  /** ctas this member hid in the last HIDE_DAYS days (see hiddenCtas). */
  hidden: ReadonlySet<PromptCta>;
  /** alwaysmentioned: prompts that named the client in no answer this period. */
  neverNamed?: { prompts: number; of: number; answers: number; hosts: string[]; /** the prompts, for "Ask about these". */ ids?: string[] };
  /** alwayscited: keywords at #11-#20 today. */
  offPageOne?: { keywords: number; of: number; best: number; worst: number; /** the keywords, for "Ask about these". */ ids?: string[] };
  /** alwayseverywhere: the top competitor's news/trade citations against the client's. */
  trade?: { brand: string; share: number; theirs: number; ours: number; subject: string };
  /** Tracking pack: at the prompt or keyword limit. */
  atLimit?: boolean;
  /** Second cluster: a prompt or keyword outside any cluster ranking #11-#20. */
  outsideCluster?: boolean;
};

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** The first day a prompt may show: QUIET_DAYS after tracking began. */
export const firstPromptDay = (startedOn: string) => addDays(startedOn, QUIET_DAYS);

/** The earliest `created_at` a `hidden` row still counts from. */
export const hiddenSince = (today: string) => `${addDays(today, -HIDE_DAYS)}T00:00:00Z`;

/** DS29: the last day a prompt hidden today stays hidden - hiddenCtas still counts today's row on that day, not the next. */
export const hiddenUntil = (today: string) => addDays(today, HIDE_DAYS);

/** The ctas a member hid within HIDE_DAYS of today, from their cta_events rows. */
export function hiddenCtas(rows: { cta: string; action: string; created_at: string }[], today: string): Set<PromptCta> {
  const since = hiddenSince(today);
  const out = new Set<PromptCta>();
  for (const r of rows) if (r.action === "hidden" && r.created_at >= since && isCta(r.cta)) out.add(r.cta);
  return out;
}

const isCta = (v: string): v is PromptCta => v === "mentioned" || v === "cited" || v === "everywhere" || v === "pack" || v === "cluster";

/** Every prompt whose trigger holds, before the one-per-screen pick. */
export function triggered(f: Facts): PromptCta[] {
  const out: PromptCta[] = [];
  const r = RANK[f.tier];
  if (r < RANK.mentioned && (f.neverNamed?.prompts ?? 0) >= NEVER_NAMED_MIN) out.push("mentioned");
  if (r < RANK.cited && (f.offPageOne?.keywords ?? 0) >= OFF_PAGE_ONE_MIN) out.push("cited");
  if (r < RANK.everywhere && f.trade && f.trade.theirs >= TRADE_CITATIONS_MIN && f.trade.theirs >= TRADE_CITATIONS_RATIO * f.trade.ours) out.push("everywhere");
  if (f.atLimit) out.push("pack");
  if ((f.tier === "mentioned" || f.tier === "cited") && f.outsideCluster) out.push("cluster");
  return out;
}

/** The tier gap a prompt closes; the pack and a second cluster change no tier. */
const gap = (cta: PromptCta, tier: TierKey) => (cta === "pack" || cta === "cluster" ? 0 : RANK[cta] - RANK[tier]);

/** The one prompt this screen draws, or null. */
export function pickPrompt(f: Facts): PromptCta | null {
  if (f.mode === "off") return null;
  if (f.state !== "ok") return null;
  if (f.today < firstPromptDay(f.startedOn)) return null;
  const live = triggered(f).filter((c) => !f.hidden.has(c));
  if (!live.length) return null;
  // Highest gap first; a tie (pack against a second cluster) goes to the pack,
  // the one the member has just run into.
  const order: PromptCta[] = ["everywhere", "cited", "mentioned", "pack", "cluster"];
  return live.sort((a, b) => gap(b, f.tier) - gap(a, f.tier) || order.indexOf(a) - order.indexOf(b))[0];
}

/**
 * The prompt's words, the board's where it has them. `tier` is the tier the
 * body's last sentence names (the component renders it with TierName), null in
 * agency mode, where no Nomada tier name is written. `button` is whether the
 * tier-page button draws (never in agency mode). `ask` is the secondary
 * button's words.
 */
export type PromptCopy = { title: string; lead: string; tier: TierKey | null; tail: string; why: string; button: boolean; ask: string; dark: boolean };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function promptCopy(cta: PromptCta, f: Facts): PromptCopy | null {
  const agency = f.mode === "agency";
  if (cta === "mentioned" && f.neverNamed) {
    const n = f.neverNamed;
    const hosts = n.hosts.slice(0, 2);
    const from = hosts.length ? `Engines answer them from pages like ${hosts.join(" and ")}. ` : "";
    return {
      title: `${plural(n.prompts, "prompt never names", "prompts never name")} you`,
      lead: agency ? `${from}Getting placed on the pages they cite is the next step.` : `${from}Getting placed on the pages they cite is what `,
      tier: agency ? null : "mentioned",
      tail: agency ? "" : ` does, ${MENTIONED_PLACEMENTS} per cluster.`,
      why: `Shown because ${n.prompts} of your ${n.of} prompts named you in none of their ${n.answers} answers this period.`,
      button: !agency,
      ask: `Ask about these ${n.prompts}`,
      dark: false,
    };
  }
  if (cta === "cited" && f.offPageOne) {
    const k = f.offPageOne;
    const range = k.best === k.worst ? `Position ${k.best}.` : `Positions ${k.best} to ${k.worst}.`;
    return {
      title: `${plural(k.keywords, "keyword sits", "keywords sit")} just off page 1`,
      lead: agency
        ? `${range} Link insertions on pages that already rank for them, plus on-site work on your own pages, is the next step.`
        : `${range} Link insertions on pages that already rank for them, plus on-site work on your own pages, is what `,
      tier: agency ? null : "cited",
      tail: agency ? "" : " adds to placements.",
      why: `Shown because ${k.keywords} of your ${k.of} cluster keywords rank #11 to #20 today.`,
      button: !agency,
      ask: `Ask about these ${k.keywords}`,
      dark: false,
    };
  }
  if (cta === "everywhere" && f.trade) {
    const t = f.trade;
    return {
      title: `${t.brand} has ${t.share}% of brand mentions`,
      lead: `Engines cite news and trade coverage of ${t.brand} ${t.theirs} times this period, and of ${t.subject} ${t.ours} ${t.ours === 1 ? "time" : "times"}. ${agency ? "Earned media across every engine is the next step." : "Earned media across every engine is "}`,
      tier: agency ? null : "everywhere",
      tail: agency ? "" : ".",
      why: "Shown because a competitor out-cites you in news and trade coverage.",
      button: !agency,
      ask: agency ? "Ask about this" : "Book a call",
      dark: true,
    };
  }
  // The pack and second-cluster prompts have no board of their own yet; the
  // Add panel's pack offer stands in for the first.
  return null;
}
