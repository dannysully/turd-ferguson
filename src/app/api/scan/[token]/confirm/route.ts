import { after } from "next/server";

import { QUESTION_COUNT, QUESTION_KINDS } from "@/lib/scan/anthropic";
import { isMarket } from "@/lib/scan/domain";
import { runScan } from "@/lib/scan/pipeline";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** What the confirm screen sends back: the set, minus whatever was dropped. */
type ConfirmedQuestion = { question?: unknown; kind?: unknown };

/**
 * The questions the visitor actually approved, cleaned.
 *
 * Every one of these becomes a paid read against every engine, so the cap and
 * the length limits are enforced here rather than trusted from the screen. A
 * kind we did not write is kept as "custom": the column is free text, and
 * labelling somebody own question as one of ours would file it under a
 * heading it does not belong to.
 */
function cleanQuestions(input: unknown): { question: string; kind: string }[] | null {
  if (!Array.isArray(input)) return null;
  const seen = new Set<string>();
  const out: { question: string; kind: string }[] = [];

  for (const row of input as ConfirmedQuestion[]) {
    const question = typeof row?.question === "string" ? row.question.trim() : "";
    if (question.length < 4 || question.length > 200) continue;
    const key = question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const kind = typeof row?.kind === "string" && QUESTION_KINDS.includes(row.kind) ? row.kind : "custom";
    out.push({ question, kind });
    if (out.length >= QUESTION_COUNT) break;
  }

  return out.length ? out : null;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * The response is sent as soon as the scan is queued; the run itself continues
 * in after(), so this ceiling covers the whole pipeline, not the round trip.
 * Requires a Vercel plan whose function limit is at least this high.
 */
export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  let body: { topic?: string; market?: string; topic_variants?: string[]; questions?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const topic = (body.topic ?? "").trim();
  if (topic.length < 2 || topic.length > 120) {
    return Response.json(
      { error: "bad_topic", message: "Tell us the category in a few words." },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();
  const { data: scan } = await db
    .from("scans")
    .select("id, status, market")
    .eq("public_token", token)
    .maybeSingle();

  if (!scan) return Response.json({ error: "not_found" }, { status: 404 });
  if (scan.status === "complete") {
    return Response.json({ status: "complete" });
  }
  if (scan.status === "running" || scan.status === "queued") {
    return Response.json({ status: scan.status });
  }

  const market = isMarket(body.market) ? body.market : scan.market;

  // The variants the agency confirmed are the trusted set from here, capped so
  // an edited payload cannot widen the question spread without limit.
  const variants = Array.isArray(body.topic_variants)
    ? body.topic_variants
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().toLowerCase())
        .filter((v) => v.length >= 2 && v.length <= 80)
        .slice(0, 5)
    : undefined;

  /**
   * The confirmed topic is the trusted value from here on.
   *
   * The status checks above are a read, and this is the write - so two confirms
   * arriving together both saw a scan that was not yet queued, and both started
   * a run. A double-submitted form was enough. That is a whole second scan
   * billed, and two pipelines writing answers and citations against one scan
   * id, which inflates every count derived from them.
   *
   * So the status test moves into the update itself: the same three statuses
   * the guard above rejects, as a filter, which makes the database the arbiter
   * of who queues the scan. .select() is what makes the outcome readable - no
   * rows back means another request queued it between our read and our write,
   * and the honest answer is the status it already has rather than a second
   * run. Without .select() a zero-row update looks identical to a successful
   * one, because PostgREST answers both with a 2xx.
   */
  const { data: queued, error } = await db
    .from("scans")
    .update({
      topic,
      market,
      status: "queued",
      step: null,
      error: null,
      ...(variants ? { topic_variants: variants } : {}),
    })
    .eq("id", scan.id)
    .not("status", "in", "(queued,running,complete)")
    .select("id");

  if (error) {
    return Response.json({ error: "store_failed" }, { status: 500 });
  }

  if (!queued?.length) {
    return Response.json({ status: "queued", questions: 0 });
  }

  /**
   * The approved set, stored before the run starts.
   *
   * The confirm screen previews the questions and lets clusters, and single
   * questions, be dropped. Storing them here is what makes that mean
   * something: runScan asks the scan what it already has and writes a set only
   * when it finds none, so the screen is not a decoration over a list that is
   * regenerated a second later.
   *
   * Only ever inserted into an empty set. A second confirm on the same scan
   * leaves the first set alone rather than deleting rows that answers already
   * point at.
   */
  let stored = 0;
  const confirmed = cleanQuestions(body.questions);
  if (confirmed) {
    const existing = await db
      .from("scan_questions")
      .select("id", { count: "exact", head: true })
      .eq("scan_id", scan.id);
    if (!existing.count) {
      const rows = confirmed.map(function (q, i) {
        return { scan_id: scan.id, idx: i, question: q.question, kind: q.kind };
      });
      const { error: qErr } = await db.from("scan_questions").insert(rows);
      // Not fatal: runScan writes its own set when it finds none, so a failure
      // here costs the visitor their edits, not their scan.
      if (qErr) console.warn("[scan] could not store the confirmed questions for " + scan.id + ": " + qErr.message);
      else stored = confirmed.length;
    }
  }

  // Return now; the run continues after the response is flushed.
  after(async () => {
    await runScan(scan.id);
  });

  return Response.json({ status: "queued", questions: stored });
}
