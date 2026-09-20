import "server-only";

import { after } from "next/server";

import {
  deriveOpportunities,
  type AnswerRow,
  type CitationRow,
  type KindRow,
  type QuestionRow,
} from "@/lib/scan/opportunities";
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
  unlocked_at: string | null;
  gated_engines: string[] | null;
  gated_status: string | null;
};

export const SCAN_UNLOCK_COLUMNS =
  "id, public_token, domain, brand_name, topic, market, status, account_id, unlocked_at, gated_engines, gated_status";

/**
 * The unlock did not take, so nothing downstream of it may behave as though it
 * did. Thrown rather than returned because every caller has to stop: an unlock
 * that half-happens is the failure this file is written around.
 */
export class UnlockNotStamped extends Error {
  constructor(scanId: string, detail: string) {
    super("unlock not stamped on " + scanId + ": " + detail);
    this.name = "UnlockNotStamped";
  }
}

/**
 * Finds or creates the account behind an address.
 *
 * Matched with eq on a lowercased address rather than ilike. ilike takes a SQL
 * LIKE pattern and an email address is not one: an underscore matches any
 * single character, so a stored a_b@x.com matched anything submitted as
 * aXb@x.com and handed that visitor the other persons account row. Percent and
 * asterisk are wildcards on the same path. All three are legal in an address
 * and all three pass the routes regex, so this needed no malformed input to
 * happen - an underscore was enough, and underscores are common.
 *
 * Nothing reads account_id back to a visitor today, so what this produced was
 * wrong attribution rather than disclosure: the scan, and the client_domains
 * row under it, were attached to somebody elses account. It stops being only
 * attribution the day there is an account view.
 *
 * That last sentence names a trigger this file cannot notice, so it is
 * executable rather than prose now: `account-disclosure.test.mts` pins every
 * read of the column, every file that mentions it, and the two things that
 * would publish it without any select changing - a `select("*")` and a spread
 * of the row into a response. Add the account view and it fails and says so.
 *
 * eq is a safe replacement because this function is the only thing that
 * inserts into accounts, and it now lowercases on the way in as well as on the
 * way out - so the stored form and the compared form cannot drift.
 */
export async function resolveAccount(email: string, existingId: string | null): Promise<string | null> {
  if (existingId) return existingId;
  const db = supabaseAdmin();

  const address = email.trim().toLowerCase();

  const { data: existing } = await db.from("accounts").select("id").eq("email", address).maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await db
    .from("accounts")
    .insert({ email: address, agency_domain: address.split("@")[1] })
    .select("id")
    .single();

  /**
   * A failed insert here is usually a race, not a failure, and it used to be
   * read as one.
   *
   * The select above and this insert are two requests, so two unlocks of the
   * same new address at once both found no row and both inserted. The loser
   * hit accounts_email_key, got an error, and returned null - and the route
   * turns a null into a 500 and the message "account_failed". So a visitor who
   * double-clicked the unlock button, or whose mail scanner fetched the verify
   * link as they clicked it, handed over their email address and was shown a
   * hard error for an unlock that had in fact just succeeded.
   *
   * Two requests arriving together on this path is ordinary rather than
   * exotic: it is the same pattern that made the gated claim, the verify link
   * and the confirm route each need a claim they could read back.
   *
   * So the unique index is the arbiter and losing to it is a normal outcome:
   * read the row the winner wrote. Only an address that is neither insertable
   * nor findable is a real failure, and that one now says so in the log rather
   * than arriving at the route as an indistinguishable null.
   */
  if (created) return created.id as string;

  const { data: raced } = await db.from("accounts").select("id").eq("email", address).maybeSingle();
  if (raced) return raced.id as string;

  console.warn(
    "[scan] could not resolve an account: " + (error?.message ?? "no row and no error"),
  );
  return null;
}

/**
 * Attaches the account, stamps the unlock, and starts the engines the email
 * bought. Idempotent on the gated pass: a second unlock of the same scan claims
 * nothing and re-spends nothing, whether it arrives after the first or
 * alongside it. The concurrent half of that is new - see the claim below.
 *
 * Throws UnlockNotStamped if the stamp did not take, and everything after the
 * stamp is deliberately below it - see the check for why.
 */
export async function completeUnlock(
  scan: UnlockableScan,
  accountId: string | null,
  email: string,
): Promise<{ gatedStarted: boolean; gatedEngines: string[] }> {
  const db = supabaseAdmin();

  /**
   * Not fatal, and said rather than implied.
   *
   * A failed upsert leaves client_domain_id null below, and the unlock still
   * happens - which is the right order of priorities, because the visitor's
   * report matters more than the join row. What it must not do is fail
   * silently: this is the only link between an account and the domain it
   * unlocked, so a lost one is a lead whose domain nothing records, and
   * nothing anywhere said so.
   */
  const { data: clientDomain, error: clientDomainErr } = await db
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

  if (clientDomainErr) {
    console.warn(
      "[scan] could not attach a client domain to " + scan.id + ", unlocking without one: " +
        clientDomainErr.message,
    );
  }

  /**
   * The stamp, and why its result is read.
   *
   * unlocked_at is the whole gate. /api/scan/<token>/full serves the report on
   * that column alone, so a scan the stamp did not reach is a report nobody can
   * open again - including the person who has just given us their address.
   *
   * This was written as a fire-and-forget update. postgrest-js reports a failed
   * write on the returned `error` and throws nothing, so a write that did not
   * happen was indistinguishable here from one that did, and the two things
   * below it ran anyway: a branded email telling them the report is ready, with
   * a link that 403s, and the gated pass - dozens of paid engine reads whose
   * results land on a row no request can ever serve. The failure and the
   * success were the same code path and the same screen.
   *
   * .select() is what makes it legible: Prefer: return=representation sends the
   * updated rows back, so no rows is a stamp that did not land rather than a
   * silence that reads as success. Do not drop it.
   */
  const { data: stamped, error: stampErr } = await db
    .from("scans")
    .update({
      account_id: accountId,
      client_domain_id: clientDomain?.id ?? null,
      unlocked_at: new Date().toISOString(),
    })
    .eq("id", scan.id)
    .select("id");

  if (stampErr || !stamped?.length) {
    throw new UnlockNotStamped(scan.id, stampErr?.message ?? "no row came back");
  }

  // Tell them it is ready and give them a way back to it. Closing the tab used
  // to lose the report entirely: it is assembled once, for the tab that asked.
  //
  // Below the stamp on purpose. This message promises a link that only works
  // once unlocked_at is set, so it is not sent until that is a fact.
  //
  // after() rather than a floating promise - the response is already on its way
  // out, and a bare promise gets killed with the function.
  after(async () => {
    const [{ data: qs, error: qsErr }, { data: rows, error: rowsErr }] = await Promise.all([
      db.from("scan_questions").select("id").eq("scan_id", scan.id),
      db.from("scan_answers").select("question_id, answered, brand_named").eq("scan_id", scan.id),
    ]);

    /**
     * No message rather than a message with an invented number in it.
     *
     * Both errors were discarded, so a read that did not answer became an empty
     * list and every count below it came out zero - and neither branch of this
     * message is number-free. The subject took `Your <brand> report`, which is
     * harmless, but the body took `reportHeadline`'s else branch and told a lead
     * "We put 0 buying-intent questions to the engines your buyers use", in
     * writing, about a scan that had just asked fourteen of them and charged us
     * for every one. A published number we cannot stand behind is the one thing
     * "ship it rough" does not cover.
     *
     * Returning costs them the link back to the report, which is a real cost and
     * the smaller one: the unlock is already stamped, this runs in after() with
     * the response and the assembled report already on their screen, and
     * /scan/<token> serves it on every later visit. Logged at error because
     * nothing else records that a lead's message went unsent.
     */
    if (qsErr || rowsErr) {
      console.error(
        "[scan] could not count " + scan.id + " for its report email, so none was sent: " +
          (qsErr?.message ?? "") + (qsErr && rowsErr ? "; " : "") + (rowsErr?.message ?? ""),
      );
      return;
    }

    const answers = (rows ?? []) as Array<{ question_id: string; answered: boolean; brand_named: boolean }>;
    const questions = (qs ?? []) as Array<{ id: string }>;

    /**
     * Both measures, because the message sends both and they are not the same
     * number.
     *
     * The subject is counted over answers, which is the figure the report's own
     * h1 leads on - one engine's reply to one question. The body is counted
     * over questions, where a miss means every engine that replied left the
     * brand out. Until now only the question pair was computed and the subject
     * printed it under the word "answers", so a four-engine scan told a buyer
     * "9 of 14 AI answers" for a set of 56 answers, and the page they clicked
     * through to said something else.
     *
     * brand_named is only ever set on a row that answered - readAndStore writes
     * `read.answered && namesBrand(...)` - so the subtraction cannot go
     * negative.
     */
    const totalAnswers = answers.filter((a) => a.answered).length;
    const namedAnswers = answers.filter((a) => a.brand_named).length;

    // "Answered by someone, named by nobody". A question no engine answered is
    // not a miss, it is a silence - so it is outside both halves of this pair.
    const byQuestion = questions.map((q) => answers.filter((a) => a.question_id === q.id));
    const answeredQuestions = byQuestion.filter((rs) => rs.some((a) => a.answered)).length;
    const missedQuestions = byQuestion.filter(
      (rs) => rs.some((a) => a.answered) && !rs.some((a) => a.brand_named),
    ).length;

    await sendReportReadyEmail({
      email,
      brand: scan.brand_name ?? scan.domain,
      publicToken: scan.public_token,
      counts: {
        missedAnswers: totalAnswers - namedAnswers,
        totalAnswers,
        missedQuestions,
        answeredQuestions,
        askedQuestions: questions.length,
      },
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
      /**
       * The claim, and why it reads the row back.
       *
       * This is a compare-and-swap: only the request that moves gated_status
       * off 'none' is allowed to start the pass. It was written as one and did
       * not work as one. PostgREST answers an UPDATE that matched no rows with
       * 204 No Content, and postgrest-js only sets `error` on a non-2xx, so the
       * request that LOST the race got error null and read that as a win. Both
       * callers then started the gated pass.
       *
       * That is not a near-miss. This pass re-asks every question on the gated
       * engines, so a double start is dozens of reads paid for twice, and it
       * writes a second set of answers and citations - which inflates the
       * leaderboard and every source mention count derived from them. Two
       * requests reaching here at once is ordinary: the verify link is fetched
       * by mail-security scanners at about the same moment the recipient
       * clicks it.
       *
       * .select() sends Prefer: return=representation, so the rows actually
       * updated come back and an empty array is the lost race, distinguishable
       * from a failure. Do not drop it.
       */
      const { data: claimed, error: claimErr } = await db
        .from("scans")
        .update({ gated_status: "queued" })
        .eq("id", scan.id)
        .eq("gated_status", "none")
        .select("id");
      if (claimErr) {
        console.warn(
          "[scan] " + scan.id + " gated pass not claimed: " + claimErr.message,
        );
      } else if (!claimed?.length) {
        // Somebody else claimed it between our read and our update. Theirs runs.
        console.warn(
          "[scan] " + scan.id + " gated pass already claimed by a concurrent unlock",
        );
      } else {
        gatedStarted = true;
        after(async () => {
          await runGatedScan(scan.id);
        });
      }
    } else {
      /**
       * Said out loud, because nothing else records it.
       *
       * The row keeps gated_status 'none', which is also what a scan with no
       * gated engines looks like, so an email traded for a pass the budget
       * turned away left no trace anywhere. It is not an error - the cap is
       * doing its job - but it is the number worth knowing when deciding
       * whether the cap is set right.
       */
      console.warn(
        "[scan] " + scan.id + " gated pass skipped: spent " + spentToday.toFixed(4) +
          " of a " + settings.daily_cost_cap_usd + " cap in the last 24h",
      );
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

/**
 * The derivation itself is in `./opportunities`, which carries no
 * `server-only` import and so can be loaded by `node --test`. Re-exported here
 * because this is where every caller already reaches for it, and because the
 * gate and the unlocked table must never derive the count from two places.
 */
export type {
  AnswerRow,
  CitationRow,
  KindRow,
  Opportunity,
  QuestionRow,
} from "@/lib/scan/opportunities";
export { deriveOpportunities } from "@/lib/scan/opportunities";

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
  const [citations, { data: answers, error: answersErr }, { data: questions, error: questionsErr }, kinds] =
    await Promise.all([
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

  /**
   * A read that failed is not a gate with nothing behind it.
   *
   * Both errors were discarded, and the answers read is the one that decides the
   * whole number: `deriveOpportunities` only counts a citation whose answer is
   * recorded as `brand_named === false`, so an empty answer set skips every
   * citation and this returns a flat `count: 0`. Every caller was written
   * against the opposite. `/api/scan/<token>/opportunities` says in a comment
   * that "a failed read reports as a failure rather than as a count of zero,
   * which on this screen would read as 'there is nothing behind the gate'" - and
   * then answered 200 with `ready: true, count: 0`, which is precisely that
   * sentence. `/scan/<token>` calls it inside a try that logs and falls back to
   * the copy with no number in it, and never reached the catch.
   *
   * So a database blip told a visitor standing at the gate that there were no
   * pages to be placed into. That is a measured finding on this product - a real
   * zero is as much an answer as a fourteen - which is exactly why it must never
   * be the thing a failure degrades to. Thrown, and all three callers already
   * have the branch for it.
   */
  if (answersErr) {
    throw new Error("could not read the answers behind the gate: " + answersErr.message);
  }
  if (questionsErr) {
    throw new Error("could not read the questions behind the gate: " + questionsErr.message);
  }

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
  const [
    brands,
    sources,
    { data: questions, error: questionsErr },
    { data: answers, error: answersErr },
    kinds,
  ] = await Promise.all([
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

  /**
   * The property `/api/scan/<token>/full` already claims, finally true.
   *
   * That route's comment reads "the per-scan reads used to swallow their own
   * error and hand back no rows... They throw now" - and the three paged ones
   * did, through `selectAll`. These two never have. So a fault on either one
   * assembled a report with no questions, no transcripts and - because
   * `deriveOpportunities` needs the answers to know the brand was absent - no
   * placements, and handed it back as a 200 to the person who had just given
   * their address for it. The failure and the finding were the same screen, on
   * the one payload this product sells.
   *
   * Thrown so the callers' existing branches fire: /full answers 502
   * report_failed, /scan/<token> logs and lets the client fetch retry, and the
   * unlock route says the report could not be assembled rather than serving an
   * empty one.
   */
  if (questionsErr) {
    throw new Error("could not read the questions for the report: " + questionsErr.message);
  }
  if (answersErr) {
    throw new Error("could not read the answers for the report: " + answersErr.message);
  }

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
