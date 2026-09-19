/**
 * The placement opportunity derivation, and the row types it reads.
 *
 * This is the number a visitor trades an email address for - the locked gate
 * prints the count, the unlocked table prints the rows - and until now it had
 * no check on it, for a reason worth writing down rather than repeating.
 *
 * It lived in `unlock.ts`, which opens with `import "server-only"`. That guard
 * is correct there: the file builds the paid report through the service-role
 * client. But it also makes the module unloadable outside a server component,
 * so `node --test` cannot import it, so the one function in the scan whose
 * output is sold could never have a regression test while every smaller pure
 * function in the repo has one.
 *
 * So the pure half moves here: rows in, rows out, no database, no secret,
 * nothing to guard. `unlock.ts` imports it and re-exports it, so every caller
 * and every import path is unchanged. The `server-only` protection that
 * matters is unaffected - it sits on `supabase/admin.ts`, which is what
 * actually constructs the service-role client, and every reader of these rows
 * still goes through it.
 */

export type CitationRow = { source_domain: string; question_id: string; engine: string };
export type AnswerRow = { question_id: string; engine: string; brand_named: boolean };
export type QuestionRow = { id: string; question: string };
export type KindRow = {
  domain: string;
  kind: string;
  note: string | null;
  on_topic: boolean | null;
};

/** One page a client could realistically be placed into. */
export type Opportunity = {
  domain: string;
  kind: string;
  note: string | null;
  /** Answers (question x engine) this page fed where the brand was absent. */
  absent_answers: number;
  /**
   * Distinct questions behind that count. Always <= absent_answers, because
   * one question answered by four engines is four answers. Both are shown:
   * the answer count is the reach, the question count is what a placement
   * would actually be about, and a screen that prints "7" beside a list of
   * four questions without saying which is which looks broken.
   *
   * Counted over question ids, not over the strings in `questions` below.
   * Those two are usually the same number and they are not the same fact: the
   * display list is deduplicated by text on purpose, so two question rows that
   * happen to carry the same sentence collapse into one line there. Counting
   * the collapsed list told the reader a placement was worth one question when
   * the scan had recorded two.
   */
  absent_questions: number;
  /** The questions themselves, deduplicated, for the report. */
  questions: string[];
};

/**
 * The placement opportunities: pages that fed answers the brand was NOT
 * named in, and that we could realistically be placed into.
 *
 * What this counts is exact rather than inferred. An "answer" is one
 * question on one engine, and a page qualifies for that answer only if it
 * was actually cited as a source for it and the brand was absent from it.
 * Both facts are recorded, so every number here can be read back to a row.
 *
 * What it deliberately does NOT claim: which competitors appear on the page.
 * scan_brands is aggregated per scan and per engine, not per question, so
 * there is no honest way to say "Competitor A is in this listicle" - only
 * which brands the scan saw overall. The design asked for a "who is in it"
 * column; it is not derivable and is left out rather than approximated.
 *
 * own and competitor domains are excluded: you cannot be placed into your
 * own site, and a competitor will not run your brand. Unclassified domains
 * are excluded too - a page the classifier never reached is not a page we
 * can vouch for putting a client on.
 *
 * "other" is excluded as well, and that exclusion is load-bearing. It is
 * where the classifier puts everything it cannot place: the engine's own
 * properties, gov.uk, marketplaces, financial data portals. On the first
 * real scan it put google.com on the opportunity list. A list is judged by
 * its worst row, not its best.
 *
 * on_topic false is excluded too, and it is a different test from kind. A
 * national newspaper is a placement whatever it was cited for; it is only an
 * opportunity when the pages cited are about this category. Null means the
 * row predates the column, and is allowed through so existing scans keep
 * working - only an explicit false removes a row.
 *
 * Exported and shared rather than reimplemented: the locked gate needs the
 * count of these before an email is given, and a second derivation that
 * drifted from this one would put a number on the gate that the unlocked
 * table then contradicts.
 */
export function deriveOpportunities(input: {
  citations: CitationRow[];
  answers: AnswerRow[];
  questions: QuestionRow[];
  kinds: KindRow[];
}): Opportunity[] {
  const kindOf = new Map(input.kinds.map((k) => [k.domain, k]));
  const PLACEABLE = new Set(["placement", "review"]);
  const namedAt = new Map<string, boolean>();
  for (const a of input.answers) namedAt.set(`${a.question_id}|${a.engine}`, a.brand_named);

  const questionText = new Map<string, string>();
  for (const q of input.questions) questionText.set(q.id, q.question);

  const oppBy = new Map<string, Opportunity>();
  /**
   * The question ids behind each domain's count, kept beside the display list
   * rather than derived from it. See `absent_questions` above.
   */
  const questionIdsBy = new Map<string, Set<string>>();
  const seenAnswer = new Set<string>();
  for (const c of input.citations) {
    const classified = kindOf.get(c.source_domain);
    const k = classified?.kind ?? null;
    if (!k || !PLACEABLE.has(k)) continue;
    if (classified?.on_topic === false) continue;
    const answerKey = `${c.source_domain}|${c.question_id}|${c.engine}`;
    if (seenAnswer.has(answerKey)) continue;
    seenAnswer.add(answerKey);
    if (namedAt.get(`${c.question_id}|${c.engine}`) !== false) continue;
    const row: Opportunity = oppBy.get(c.source_domain) ?? {
      domain: c.source_domain,
      kind: k,
      note: classified?.note ?? null,
      absent_answers: 0,
      absent_questions: 0,
      questions: [],
    };
    row.absent_answers += 1;
    const ids = questionIdsBy.get(c.source_domain) ?? new Set<string>();
    ids.add(c.question_id);
    questionIdsBy.set(c.source_domain, ids);
    const qt = questionText.get(c.question_id);
    if (qt && !row.questions.includes(qt)) row.questions.push(qt);
    oppBy.set(c.source_domain, row);
  }
  for (const row of oppBy.values()) {
    row.absent_questions = questionIdsBy.get(row.domain)?.size ?? row.questions.length;
  }
  return [...oppBy.values()].sort(
    (a, b) => b.absent_answers - a.absent_answers || a.domain.localeCompare(b.domain),
  );
}
