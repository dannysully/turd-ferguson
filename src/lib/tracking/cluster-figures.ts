import { type AnswerRow, type Day, type Range, type Rate, type SerpRow, daysIn, pointsDelta, rate } from "./figures.ts";
import type { Angle } from "./limits.ts";

/**
 * The overview's cluster figures (T4b part 1, 30 Sep 2026; BRIEF-3 T4b against
 * boards-3/Main.dc.html, figures as boards-3/dataset.py derives them). Pure:
 * the cards, the heat map rows and the cluster chart all read from here, so
 * the three agree.
 *
 * - A cluster's rate is its answers naming the client, of every answer its
 *   prompts got in the range; the change is against the comparison range, and
 *   only for a cluster read in both (a cluster added mid-range has none).
 * - The keyword's position is its latest reading in the range; the change is
 *   places gained since the latest reading in the comparison range.
 * - "pending" is a cluster whose first check is after today: no readings, the
 *   card says "Asked from tomorrow, 06:00". "added" is one that began inside
 *   the range or its comparison, so like-for-like leaves it out. "live" was
 *   tracked throughout both.
 */

export type ClusterInput = {
  clusters: { id: string; name: string; keyword_id: string | null; started_on: Day; stopped_on: Day | null }[];
  questions: { id: string; text: string; cluster_id: string | null; angle: Angle | null; added_on: Day; stopped_on: Day | null }[];
  keywords: { id: string; keyword: string; search_volume: number | null; intent: string | null }[];
  answers: AnswerRow[];
  serp: SerpRow[];
  range: Range;
  before: Range | null;
  today: Day;
  engines: readonly string[];
};

export type ClusterStatus = "live" | "added" | "pending";

export type ClusterPrompt = {
  id: string;
  text: string;
  angle: Angle | null;
  now: Rate;
  before: Rate | null;
  /** Engines that named the client at least once in the range - the card's full marks. */
  namedBy: string[];
};

export type ClusterCard = {
  id: string;
  name: string;
  keyword: string | null;
  volume: number | null;
  intent: string | null;
  status: ClusterStatus;
  /** The card's "Tracked since". */
  started_on: Day;
  now: Rate;
  before: Rate | null;
  delta: number | null;
  /** Prompts with at least one named answer in the range, of the cluster's prompts. */
  promptsNamed: Rate;
  position: number | null;
  positionBefore: number | null;
  /** Places gained: #7 to #4 is +3. */
  positionChange: number | null;
  prompts: ClusterPrompt[];
  /** One cell a day in the range: that day's share of the cluster's answers naming the client, null before its first check. */
  heat: (Rate | null)[];
};

const within = (d: Day, r: Range) => d >= r.from && d <= r.to;

function latestPosition(serp: SerpRow[], keywordId: string | null, r: Range | null): number | null {
  if (!keywordId || !r) return null;
  let at: Day | null = null;
  let pos: number | null = null;
  for (const s of serp) {
    if (s.keyword_id !== keywordId || !within(s.run_date, r)) continue;
    if (at === null || s.run_date > at) {
      at = s.run_date;
      pos = s.position;
    }
  }
  return pos;
}

function tally(answers: AnswerRow[], ids: Set<string>, r: Range): Rate {
  let num = 0;
  let den = 0;
  for (const a of answers) {
    if (!a.answered || !ids.has(a.question_id) || !within(a.run_date, r)) continue;
    den++;
    if (a.named) num++;
  }
  return rate(num, den);
}

export type ClusterSummary = {
  /** Every answer in the range across the clusters with readings. */
  now: Rate;
  /** The same on the clusters tracked all period, against the comparison range. */
  lfl: Rate;
  lflBefore: Rate | null;
  lflDelta: number | null;
  clusters: number;
  clustersLfl: number;
  prompts: number;
  promptsLfl: number;
  /** "40 of 45", then "was 37 of 40" on the like-for-like prompts. */
  promptsNamed: Rate;
  promptsNamedBefore: Rate | null;
  never: { cluster: string; text: string }[];
  /** Cluster keywords whose latest position is 1-10, of the keywords of clusters with readings, and their average. */
  page1: Rate & { avg: number | null };
  page1Before: number | null;
  /** Keywords at #11-#20: the ones a push would put on page 1. */
  offPage1: string[];
};

/**
 * The headline and the four figures by cluster (T4b part 2, 30 Sep 2026;
 * boards-3/overview.py's headline and "Key figures" strip). A pending cluster
 * counts nowhere; an added one counts in this period but not like-for-like.
 */
export function clusterSummary(cards: ClusterCard[]): ClusterSummary {
  const read = cards.filter((c) => c.status !== "pending");
  const lfl = read.filter((c) => c.status === "live");
  const sum = (cs: ClusterCard[], pick: (c: ClusterCard) => Rate | null) => {
    const rs = cs.map(pick).filter((r): r is Rate => r !== null);
    return rs.length ? rate(rs.reduce((s, r) => s + r.num, 0), rs.reduce((s, r) => s + r.den, 0)) : null;
  };
  const lflNow = sum(lfl, (c) => c.now) ?? rate(0, 0);
  const lflBefore = lfl.length && lfl.every((c) => c.before) ? sum(lfl, (c) => c.before) : null;
  const prompts = read.flatMap((c) => c.prompts);
  const promptsLfl = lfl.flatMap((c) => c.prompts);
  const ranked = read.map((c) => c.position).filter((p): p is number => p !== null);
  const hasBefore = lfl.length > 0 && lfl.some((c) => c.positionBefore !== null);
  return {
    now: sum(read, (c) => c.now) ?? rate(0, 0),
    lfl: lflNow,
    lflBefore,
    lflDelta: pointsDelta(lflNow, lflBefore),
    clusters: read.length,
    clustersLfl: lfl.length,
    prompts: prompts.length,
    promptsLfl: promptsLfl.length,
    promptsNamed: rate(prompts.filter((p) => p.now.num > 0).length, prompts.length),
    promptsNamedBefore: promptsLfl.every((p) => p.before) && promptsLfl.length ? rate(promptsLfl.filter((p) => p.before!.num > 0).length, promptsLfl.length) : null,
    never: read.flatMap((c) => c.prompts.filter((p) => p.now.den > 0 && p.now.num === 0).map((p) => ({ cluster: c.keyword ?? c.name, text: p.text }))),
    page1: { ...rate(ranked.filter((p) => p <= 10).length, read.length), avg: ranked.length ? Math.round((ranked.reduce((s, p) => s + p, 0) / ranked.length) * 10) / 10 : null },
    page1Before: hasBefore ? lfl.filter((c) => c.positionBefore !== null && c.positionBefore <= 10).length : null,
    offPage1: read.filter((c) => c.position !== null && c.position >= 11 && c.position <= 20).map((c) => c.keyword ?? c.name),
  };
}

export function clusterCards(input: ClusterInput): ClusterCard[] {
  const { range, before, today, engines } = input;
  const days = daysIn(range);
  const earliest = before && before.from < range.from ? before.from : range.from;

  return input.clusters
    .filter((c) => c.stopped_on === null || c.stopped_on > range.from)
    .map((c) => {
      const kw = input.keywords.find((k) => k.id === c.keyword_id) ?? null;
      const prompts = input.questions.filter((q) => q.cluster_id === c.id && (q.stopped_on === null || q.stopped_on > range.from));
      const ids = new Set(prompts.map((q) => q.id));
      const status: ClusterStatus = c.started_on > today ? "pending" : c.started_on > earliest ? "added" : "live";

      const now = tally(input.answers, ids, range);
      const was = before && status === "live" ? tally(input.answers, ids, before) : null;
      const wasRate = was && was.den ? was : null;

      const cells = new Map<Day, { num: number; den: number }>();
      const byPrompt = new Map<string, { engines: Set<string> }>();
      for (const a of input.answers) {
        if (!a.answered || !ids.has(a.question_id) || !within(a.run_date, range)) continue;
        const cell = cells.get(a.run_date) ?? { num: 0, den: 0 };
        cell.den++;
        if (a.named) {
          cell.num++;
          const p = byPrompt.get(a.question_id) ?? { engines: new Set<string>() };
          p.engines.add(a.engine);
          byPrompt.set(a.question_id, p);
        }
        cells.set(a.run_date, cell);
      }

      const position = latestPosition(input.serp, c.keyword_id, range);
      const positionBefore = status === "live" ? latestPosition(input.serp, c.keyword_id, before) : null;

      return {
        id: c.id,
        name: c.name,
        keyword: kw?.keyword ?? null,
        volume: kw?.search_volume ?? null,
        intent: kw?.intent ?? null,
        status,
        started_on: c.started_on,
        now,
        before: wasRate,
        delta: pointsDelta(now, wasRate),
        promptsNamed: rate(byPrompt.size, prompts.length),
        position,
        positionBefore,
        positionChange: position !== null && positionBefore !== null ? positionBefore - position : null,
        prompts: prompts.map((q) => {
          const one = new Set([q.id]);
          const p = tally(input.answers, one, range);
          const b = before && status === "live" ? tally(input.answers, one, before) : null;
          return {
            id: q.id,
            text: q.text,
            angle: q.angle,
            now: p,
            before: b && b.den ? b : null,
            namedBy: engines.filter((e) => byPrompt.get(q.id)?.engines.has(e)),
          };
        }),
        heat: days.map((d) => {
          const cell = cells.get(d);
          return cell ? rate(cell.num, cell.den) : null;
        }),
      };
    });
}
