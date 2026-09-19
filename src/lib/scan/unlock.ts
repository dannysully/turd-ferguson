import "server-only";

import { after } from "next/server";

import { runGatedScan } from "@/lib/scan/pipeline";
import { getSettings } from "@/lib/scan/settings";
import { spentSince } from "@/lib/scan/spend";
import { sendReportReadyEmail } from "@/lib/scan/verify-email";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { selectAll } from "@/lib/supabase/page";

/**
 * What unlocking a scan actually does, in one place.
 *
 * It lives here rather than in the unlock route because two different requests
 * now perform it: the unlock itself when verification is off, and the verify
 * link when it is on. Having one copy is what stops the two paths drifting into
 * subtly different unlocks.
 */

export type UnlockableScan = {
  id: string;
  public_token: string;
  domain: string;
  brand_name: string | null;
  topic: string | null;
  market: string | null;
  gated_engines: string[] | null;
  gated_status: string | null;
};

export const SCAN_UNLOCK_COLUMNS =
  "id, public_token, domain, brand_name, topic, market, status, account_id, gated_engines, gated_status";

/** Finds or creates the account behind an address. */
export async function resolveAccount(email: string, existingId: string | null): Promise<string | null> {
  if (existingId) return existingId;
  const db = supabaseAdmin();

  const { data: existing } = await db.from("accounts").select("id").ilike("email", email).maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await db
    .from("accounts")
    .insert({ email, agency_domain: email.split("@")[1] })
    .select("id")
    .single();
  if (error || !created) return null;
  return created.id as string;
}

/**
 * Attaches the account, stamps the unlock, and starts the engines the email
 * bought. Idempotent on the gated pass: a second unlock of the same scan claims
 * nothing and re-spends nothing.
 */
export async function completeUnlock(
  scan: UnlockableScan,
  accountId: string | null,
  email: string,
): Promise<{ gatedStarted: boolean; gatedEngines: string[] }> {
  const db = supabaseAdmin();

  const { data: clientDomain } = await db
    .from("client_domains")
    .upsert(
      {
        account_id: accountId,
        domain: scan.domain,
        brand_name: scan.brand_name,
        topic: scan.topic,
        market: scan.market,
      },
      { onConflict: "account_id,domain,topic,market" },
    )
    .select("id")
    .single();

  await db
    .from("scans")
    .update({
      account_id: accountId,
      client_domain_id: clientDomain?.id ?? null,
      unlocked_at: new Date().toISOString(),
    })
    .eq("id", scan.id);

  // Tell them it is ready and give them a way back to it. Closing the tab used
  // to lose the report entirely: it is assembled once, for the tab that asked.
  //
  // after() rather than a floating promise - the response is already on its way
  // out, and a bare promise gets killed with the function.
  after(async () => {
    const [{ data: qs }, { data: rows }] = await Promise.all([
      db.from("scan_questions").select("id").eq("scan_id", scan.id),
      db.from("scan_answers").select("question_id, answered, brand_named").eq("scan_id", scan.id),
    ]);

    const answers = (rows ?? []) as Array<{ question_id: string; answered: boolean; brand_named: boolean }>;
    const questions = (qs ?? []) as Array<{ id: string }>;

    // "Answered by someone, named by nobody" - the same figure the screen
    // leads on. A question no engine answered is not a miss, it is a silence.
    const missed = questions.filter((q) => {
      const forQuestion = answers.filter((a) => a.question_id === q.id);
      return forQuestion.some((a) => a.answered) && !forQuestion.some((a) => a.brand_named);
    }).length;

    await sendReportReadyEmail({
      email,
      brand: scan.brand_name ?? scan.domain,
      publicToken: scan.public_token,
      missed,
      total: questions.length,
    });
  });

  let gatedStarted = false;
  const gatedEngines = ((scan.gated_engines ?? []) as string[]).filter(Boolean);

  if (gatedEngines.length && scan.gated_status === "none") {
    // The spend cap covers gated runs too, or a burst of unlocks outspends the
    // day's budget after the count cap has already been passed.
    const settings = await getSettings();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const spentToday = await spentSince(since, { excludeTrackingRuns: false });

    if (spentToday < settings.daily_cost_cap_usd) {
      const { error: claimErr } = await db
        .from("scans")
        .update({ gated_status: "queued" })
        .eq("id", scan.id)
        .eq("gated_status", "none");
      if (!claimErr) {
        gatedStarted = true;
        after(async () => {
          await runGatedScan(scan.id);
        });
      }
    }
  }

  return { gatedStarted, gatedEngines };
}

export type UnlockPayload = {
  brands: Array<{ brand: string; mentions: number; is_subject: boolean; engines: string[] }>;
  brands_by_engine: Array<{ engine: string; brand: string; mentions: number; is_subject: boolean }>;
  sources: Array<{
    source: string;
    mentions: number;
    engines: string[];
    ai_search_volume: number | null;
    urls: string[];
    /** own | competitor | review | placement | other. Null until classified. */
    kind: string | null;
    note: string | null;
  }>;
  questions: Array<{
    idx: number;
    question: string;
    kind: string;
    search_volume: number | null;
    /** The subject's Google organic position for this question. Null: not in the top twenty. */
    google_rank: number | null;
    engines: Array<{
      engine: string;
      answered: boolean;
      brand_named: boolean;
      response_text: string | null;
    }>;
  }>;
  /**
   * Pages that fed answers the brand was absent from and that a client could
   * realistically be placed into, most valuable first. This is the gated
   * finding - the reason an email address is worth giving up.
   *
   * absent_answers counts question x engine pairs, each one recorded, so the
   * figure reads back to rows rather than being an estimate. There is no
   * "which competitors are on this page" field because the schema cannot
   * support one honestly.
   */
  opportunities: Array<{
    domain: string;
    kind: string;
    note: string | null;
    absent_answers: number;
    absent_questions: number;
    questions: string[];
  }>;
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
   */
  absent_questions: number;
  /** The questions themselves, deduplicated, for the report. */
  questions: string[];
};

type CitationRow = { source_domain: string; question_id: string; engine: string };
type AnswerRow = { question_id: string; engine: string; brand_named: boolean };
type QuestionRow = { id: string; question: string };
type KindRow = { domain: string; kind: string; note: string | null; on_topic: boolean | null };

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
    const qt = questionText.get(c.question_id);
    if (qt && !row.questions.includes(qt)) row.questions.push(qt);
    oppBy.set(c.source_domain, row);
  }
  for (const row of oppBy.values()) row.absent_questions = row.questions.length;
  return [...oppBy.values()].sort(
    (a, b) => b.absent_answers - a.absent_answers || a.domain.localeCompare(b.domain),
  );
}

/**
 * What the locked gate is allowed to know: how many opportunities there are
 * and roughly what they look like, never which pages they are. The domains
 * are the thing being traded for an email address, so they are not fetched
 * into a payload that a locked screen receives.
 */
export async function opportunityShape(
  scanId: string,
): Promise<{ count: number; answers: number; kinds: Record<string, number> }> {
  const db = supabaseAdmin();
  // Citations and source kinds are paged: both scale with what the engines
  // cited rather than with what we asked, and an unpaged read silently stops
  // at the 1000th row. The count on the locked screen is the number being
  // traded for an email address, so it has to be the whole count.
  const [citations, { data: answers }, { data: questions }, kinds] = await Promise.all([
    selectAll<CitationRow>((from, to) =>
      db
        .from("scan_citations")
        .select("source_domain, question_id, engine")
        .eq("scan_id", scanId)
        .order("id", { ascending: true })
        .range(from, to),
    ),
    db.from("scan_answers").select("question_id, engine, brand_named").eq("scan_id", scanId),
    db.from("scan_questions").select("id, question").eq("scan_id", scanId),
    selectAll<KindRow>((from, to) =>
      db
        .from("scan_sources")
        .select("domain, kind, note, on_topic")
        .eq("scan_id", scanId)
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);

  const opportunities = deriveOpportunities({
    citations,
    answers: (answers ?? []) as AnswerRow[],
    questions: (questions ?? []) as QuestionRow[],
    kinds,
  });

  const byKind: Record<string, number> = {};
  for (const o of opportunities) byKind[o.kind] = (byKind[o.kind] ?? 0) + 1;
  return {
    count: opportunities.length,
    answers: opportunities.reduce((n, o) => n + o.absent_answers, 0),
    kinds: byKind,
  };
}

/** Everything the gate was holding back, assembled once. */
export async function buildUnlockPayload(scanId: string): Promise<UnlockPayload> {
  const db = supabaseAdmin();

  type CitationWithVolume = CitationRow & {
    url: string | null;
    title: string | null;
    scan_questions?: unknown;
  };
  type EngineBrandRow = { engine: string; brand: string; mentions: number; is_subject: boolean };

  /**
   * The three that scale with what the engines gave back are paged. This is
   * the paid report: an unpaged citation read stops at the 1000th row, and a
   * source that falls off the end is missing from the source list, from share
   * of voice and from the placement list at once - with nothing on the page
   * to say the list is partial.
   */
  const [brands, sources, { data: questions }, { data: answers }, kinds] = await Promise.all([
    selectAll<EngineBrandRow>((from, to) =>
      db
        .from("scan_brands")
        .select("engine, brand, mentions, is_subject")
        .eq("scan_id", scanId)
        .order("id", { ascending: true })
        .range(from, to),
    ),
    selectAll<CitationWithVolume>((from, to) =>
      db
        .from("scan_citations")
        .select("source_domain, url, title, question_id, engine, scan_questions(search_volume)")
        .eq("scan_id", scanId)
        .order("id", { ascending: true })
        .range(from, to),
    ),
    db
      .from("scan_questions")
      .select("id, idx, question, kind, search_volume, google_rank")
      .eq("scan_id", scanId)
      .order("idx", { ascending: true }),
    db
      .from("scan_answers")
      .select("question_id, engine, answered, brand_named, response_text")
      .eq("scan_id", scanId),
    selectAll<KindRow>((from, to) =>
      db
        .from("scan_sources")
        .select("domain, kind, note, on_topic")
        .eq("scan_id", scanId)
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);

  const brandRows = brands;
  const overall = new Map<string, { brand: string; mentions: number; is_subject: boolean; engines: string[] }>();
  for (const b of brandRows) {
    const row = overall.get(b.brand) ?? { brand: b.brand, mentions: 0, is_subject: b.is_subject, engines: [] };
    row.mentions += b.mentions;
    row.is_subject = row.is_subject || b.is_subject;
    if (!row.engines.includes(b.engine)) row.engines.push(b.engine);
    overall.set(b.brand, row);
  }
  const leaderboard = [...overall.values()].sort((a, b) => b.mentions - a.mentions);

  type SourceRow = {
    source: string;
    mentions: number;
    engines: string[];
    ai_search_volume: number | null;
    urls: string[];
    kind: string | null;
    note: string | null;
  };
  const kindOf = new Map(kinds.map((k) => [k.domain, k]));
  const bySource = new Map<string, SourceRow>();
  const counted = new Set<string>();
  for (const c of sources) {
    const row: SourceRow = bySource.get(c.source_domain) ?? {
      source: c.source_domain,
      mentions: 0,
      engines: [],
      ai_search_volume: null,
      urls: [],
      kind: kindOf.get(c.source_domain)?.kind ?? null,
      note: kindOf.get(c.source_domain)?.note ?? null,
    };
    const key = `${c.source_domain}|${c.question_id}|${c.engine}`;
    if (!counted.has(key)) {
      counted.add(key);
      row.mentions += 1;
      const embedded = c.scan_questions as unknown;
      const q = Array.isArray(embedded) ? embedded[0] : embedded;
      const v = (q as { search_volume?: number | null } | null)?.search_volume;
      if (typeof v === "number") row.ai_search_volume = (row.ai_search_volume ?? 0) + v;
    }
    if (!row.engines.includes(c.engine)) row.engines.push(c.engine);
    if (c.url && !row.urls.includes(c.url)) row.urls.push(c.url);
    bySource.set(c.source_domain, row);
  }
  const fullSources = [...bySource.values()].sort(
    (a, b) => b.mentions - a.mentions || (b.ai_search_volume ?? 0) - (a.ai_search_volume ?? 0),
  );

  const answerRows = (answers ?? []) as Array<{
    question_id: string;
    engine: string;
    answered: boolean;
    brand_named: boolean;
    response_text: string | null;
  }>;
  const questionDetail = (questions ?? []).map((q) => ({
    idx: q.idx as number,
    question: q.question as string,
    kind: q.kind as string,
    search_volume: (q.search_volume ?? null) as number | null,
    google_rank: (q.google_rank ?? null) as number | null,
    engines: answerRows
      .filter((a) => a.question_id === q.id)
      .map((a) => ({
        engine: a.engine,
        answered: a.answered,
        brand_named: a.brand_named,
        // Null for scans that ran before the prose was stored, and for any the
        // purge has already reclaimed. The screen says so rather than showing a
        // blank and letting it read as "the engine said nothing".
        response_text: (a.response_text ?? null) as string | null,
      })),
  }));

  const opportunities = deriveOpportunities({
    citations: sources,
    answers: answerRows,
    questions: (questions ?? []) as QuestionRow[],
    kinds,
  });

  return {
    brands: leaderboard,
    brands_by_engine: brandRows,
    sources: fullSources,
    questions: questionDetail,
    opportunities,
  };
}
