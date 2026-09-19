import { NextResponse } from "next/server";

import { constantTimeEqual } from "@/lib/constant-time";
import { getSettings } from "@/lib/scan/settings";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { selectAll } from "@/lib/supabase/page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Supabase chokes on an unbounded `in` list, so ids go over in batches. */
const CHUNK = 500;

/**
 * Reclaims the prose from scans nobody ever claimed.
 *
 * Every run captures what each engine said, because the free pass happens
 * before an email exists and the text cannot be fetched again afterwards. That
 * is a deliberate trade: spend the storage on every scan, then take it back
 * from the ones that never turned into a lead.
 *
 * Only `response_text` is cleared. The measured facts - whether an engine
 * answered, whether it named the brand, what it cited - are the scan and they
 * stay. An unclaimed scan keeps its numbers forever and loses only its
 * transcript.
 *
 * Vercel Cron calls this with Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  /**
   * Constant-time, to match the admin proxy next door rather than differ from
   * it for no stated reason. Timing analysis across a network on a bearer
   * token is not a practical attack and this is not claimed as a fix for one;
   * what it fixes is two secret comparisons in one codebase that did not look
   * alike, which is how the weaker one survives a reading.
   */
  const offered = req.headers.get("authorization") ?? "";
  if (!constantTimeEqual(offered, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  let retentionDays = 7;
  try {
    retentionDays = (await getSettings()).response_retention_days;
  } catch {
    // A settings read that fails must not turn into an unbounded purge. Fall
    // back to the documented default rather than guessing wider.
  }
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  /**
   * Unclaimed means never unlocked. Once verification is on, unlocked_at is
   * only ever set by a proven address, so this stays the right test.
   *
   * Read through `selectAll`, which is the loop this route used to hand-roll.
   * The hand-rolled one stopped on the first page shorter than 1000 - sound
   * only while `db-max-rows` is at least 1000, which is a project setting
   * nothing in this repo can read. Its own comment said, correctly, that a
   * short answer and a truncated one look identical, and then it treated a
   * short answer as the end of the table. At a ceiling of 500 this job cleared
   * 500 stale scans a night and reported success, however many were waiting:
   * the failure is a transcript kept past the retention window with nothing
   * anywhere saying so, on the one job whose whole purpose is keeping a
   * promise the privacy policy makes in public.
   *
   * `selectAll` advances by the rows that came back and stops on an empty page,
   * so the ceiling's value cannot affect the result. That fix landed in
   * `6ab14f9` for the reads under the paid report, and page.ts names this route
   * as the place the defect was found first - it was the one caller left still
   * doing it by hand.
   *
   * Ordered by the primary key rather than by created_at, which is the rule
   * page.ts states. `range` is offset and limit, so the order has to be total:
   * created_at is not unique, and two scans sharing a timestamp across a page
   * boundary are ordered by whatever the planner chose for that request. A row
   * can then land on both pages or on neither. Landing on both is harmless
   * here, since the update is idempotent - landing on neither is the failure
   * above. Nothing here writes to `scans`, so the set does not shift underneath
   * the paging, and nothing reads these in date order.
   */
  let ids: string[];
  try {
    const stale = await selectAll<{ id: string }>((from, to) =>
      db
        .from("scans")
        .select("id")
        .is("unlocked_at", null)
        .lt("created_at", cutoff)
        .order("id", { ascending: true })
        .range(from, to),
    );
    ids = stale.map((r) => r.id);
  } catch (err) {
    // selectAll throws where the old loop returned an error object, and this
    // job answering 200 on a read it could not complete is the same silence as
    // stopping short of the table.
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `could not read scans: ${message}` }, { status: 502 });
  }

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, cutoff, scans: 0, answers_cleared: 0 });
  }

  let cleared = 0;
  const failures: string[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = ids.slice(i, i + CHUNK);
    /**
     * `count: exact` rather than counting a returned representation. The
     * number comes back in the Content-Range header, which is the true number
     * of rows the update touched - where `select("id")` asked PostgREST to
     * send every cleared id back so we could call `.length` on it, and a row
     * ceiling sits over anything PostgREST returns. A batch of 500 scans is
     * up to tens of thousands of answers; none of those ids were ever read.
     */
    const { count, error } = await db
      .from("scan_answers")
      .update({ response_text: null }, { count: "exact" })
      .in("scan_id", batch)
      .not("response_text", "is", null);
    if (error) failures.push(error.message);
    else cleared += count ?? 0;
  }

  return NextResponse.json(
    {
      ok: failures.length === 0,
      cutoff,
      retention_days: retentionDays,
      scans: ids.length,
      answers_cleared: cleared,
      errors: failures.length ? failures : undefined,
    },
    { status: failures.length ? 502 : 200 },
  );
}
