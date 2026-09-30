import type { ClusterCard } from "./cluster-figures.ts";
import type { CitationRow, Range } from "./figures.ts";
import type { Facts } from "./upgrade-prompts.ts";

/**
 * The facts the two cluster prompts are judged on (BRIEF-3 T11: "prompts that
 * never name you, and a keyword at #11-#20"), read from the cluster cards the
 * Clusters page, the overview and the one-cluster page already draw, so the
 * prompt's figures are the figures beside it. Pure and unwired, like
 * upgrade-prompts.ts.
 *
 * Only what is tracked now counts: a pending cluster has no readings, and a
 * stopped cluster or prompt is not one an upgrade would act on.
 */

const tracked = (cards: ClusterCard[]) => cards.filter((c) => c.status !== "pending" && c.stoppedOn === null);

const bare = (h: string) => h.toLowerCase().replace(/^www\./, "");

/**
 * alwaysmentioned: prompts read this period that named the client in none of
 * their answers, of every prompt read; their answers; and the two hosts the
 * engines cited most in those answers, the client's own left out.
 */
export function neverNamedFacts(p: {
  cards: ClusterCard[];
  answers: ({ question_id: string; run_date: string; answered: boolean } & Pick<CitationRow, "citations">)[];
  range: Range;
  domain: string;
}): NonNullable<Facts["neverNamed"]> {
  const prompts = tracked(p.cards).flatMap((c) => c.prompts.filter((q) => q.stoppedOn === null && q.now.den > 0));
  const never = prompts.filter((q) => q.now.num === 0);
  const ids = new Set(never.map((q) => q.id));
  const own = bare(p.domain);
  const counts = new Map<string, number>();
  for (const a of p.answers) {
    if (!a.answered || !ids.has(a.question_id) || a.run_date < p.range.from || a.run_date > p.range.to) continue;
    for (const host of new Set(a.citations.map((c) => bare(c.source_domain || "")))) {
      if (!host || host === own || host.endsWith(`.${own}`)) continue;
      counts.set(host, (counts.get(host) ?? 0) + 1);
    }
  }
  const hosts = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([h]) => h);
  return { prompts: never.length, of: prompts.length, answers: never.reduce((n, q) => n + q.now.den, 0), hosts };
}

/** alwayscited: cluster keywords whose latest reading is #11 to #20, of the cluster keywords read. */
export function offPageOneFacts(cards: ClusterCard[]): NonNullable<Facts["offPageOne"]> {
  const read = tracked(cards).filter((c) => c.keyword !== null && c.position !== null);
  const off = read.map((c) => c.position as number).filter((n) => n >= 11 && n <= 20);
  return { keywords: off.length, of: read.length, best: off.length ? Math.min(...off) : 0, worst: off.length ? Math.max(...off) : 0 };
}
