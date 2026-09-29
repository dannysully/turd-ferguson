import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { trackingDay } from "./decide.ts";
import { type AnswerRow, type CitationRow, type Day, type Range, type SerpRow, addDays, comparisonRange } from "./figures.ts";

/**
 * Everything the overview reads for one client and one range (T4, 29 Sep
 * 2026). Paged: PostgREST caps a select at 1,000 rows, and 20 questions on
 * four engines over two 28-day periods is 4,480 answers.
 */

export type Compare = "prev" | "month" | "none";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The range a URL states (BRIEF decision 3): `?from=&to=&compare=`, defaulting
 * to the last 28 days to today against the previous period. A malformed or
 * reversed range falls back to the default rather than erroring.
 */
export function rangeFrom(params: Record<string, string | string[] | undefined>, today: Day = trackingDay()): { range: Range; compare: Compare } {
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const compare: Compare = one("compare") === "month" || one("compare") === "none" ? (one("compare") as Compare) : "prev";
  const from = one("from");
  const to = one("to");
  if (from && to && DAY.test(from) && DAY.test(to) && from <= to && to <= today && !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to))) {
    return { range: { from, to }, compare };
  }
  return { range: { from: addDays(today, -27), to: today }, compare };
}

async function paged<R>(query: (lo: number, hi: number) => PromiseLike<{ data: R[] | null; error: { message: string } | null }>, what: string): Promise<R[]> {
  const out: R[] = [];
  const size = 1000;
  for (let lo = 0; ; lo += size) {
    const { data, error } = await query(lo, lo + size - 1);
    if (error) throw new Error(`could not read ${what}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

export type OverviewData = {
  questions: { id: string; text: string; added_on: Day; stopped_on: Day | null }[];
  keywords: { id: string; keyword: string; added_on: Day; stopped_on: Day | null }[];
  answers: (AnswerRow & CitationRow)[];
  serp: SerpRow[];
  lastRun: { run_date: Day; status: string; finished_at: string | null } | null;
  notes: { note_date: Day; text: string }[];
};

export async function loadOverview(clientId: string, range: Range, compare: Compare): Promise<OverviewData> {
  const db = supabaseAdmin();
  const earliest = comparisonRange(range, compare)?.from ?? range.from;

  // Started together, awaited in turn: each paged read checks its own error.
  const questionsP = paged((lo, hi) => db.from("tracked_questions").select("id, text, added_on, stopped_on").eq("client_domain_id", clientId).order("added_on").range(lo, hi), "the questions");
  const keywordsP = paged((lo, hi) => db.from("tracked_keywords").select("id, keyword, added_on, stopped_on").eq("client_domain_id", clientId).order("added_on").range(lo, hi), "the keywords");
  const answersP = paged(
    (lo, hi) =>
      db
        .from("tracking_answers")
        .select("run_date, question_id, engine, answered, named, brands, citations")
        .eq("client_domain_id", clientId)
        .gte("run_date", earliest)
        .lte("run_date", range.to)
        .order("id")
        .range(lo, hi),
    "the answers",
  );
  const serpP = paged(
    (lo, hi) =>
      db.from("tracking_serp").select("run_date, keyword_id, position").eq("client_domain_id", clientId).gte("run_date", earliest).lte("run_date", range.to).order("id").range(lo, hi),
    "the keyword positions",
  );
  // A throw below must not leave these rejecting unobserved; each await still throws.
  for (const p of [questionsP, keywordsP, answersP, serpP]) p.catch(() => {});
  const [{ data: runRows, error: runErr }, { data: noteRows, error: noteErr }] = await Promise.all([
    db.from("tracking_runs").select("run_date, status, finished_at").eq("client_domain_id", clientId).in("status", ["complete", "partial"]).order("run_date", { ascending: false }).limit(1),
    db.from("tracking_notes").select("note_date, text").eq("client_domain_id", clientId).gte("note_date", range.from).lte("note_date", range.to).order("note_date"),
  ]);
  if (runErr) throw new Error(`could not read the runs: ${runErr.message}`);
  if (noteErr) throw new Error(`could not read the notes: ${noteErr.message}`);
  const questions = await questionsP;
  const keywords = await keywordsP;
  const answers = await answersP;
  const serp = await serpP;

  return {
    questions: questions as OverviewData["questions"],
    keywords: keywords as OverviewData["keywords"],
    answers: (answers as Record<string, unknown>[]).map((a) => ({
      run_date: a.run_date as Day,
      question_id: a.question_id as string,
      engine: a.engine as string,
      answered: a.answered as boolean,
      named: a.named as boolean,
      brands: Array.isArray(a.brands) ? (a.brands as unknown[]).filter((b): b is string => typeof b === "string") : [],
      citations: Array.isArray(a.citations) ? (a.citations as CitationRow["citations"]) : [],
    })),
    serp: serp as SerpRow[],
    lastRun: (runRows?.[0] as OverviewData["lastRun"]) ?? null,
    notes: (noteRows ?? []) as OverviewData["notes"],
  };
}
