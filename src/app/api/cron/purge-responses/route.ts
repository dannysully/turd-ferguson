import { NextResponse } from "next/server";

import { getSettings } from "@/lib/scan/settings";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
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
   * PostgREST caps a select at its configured maximum, 1000 rows by default,
   * and says so nowhere in the response: a short answer and a truncated one
   * look identical. Unpaged, this cleared the first thousand stale scans and
   * left the rest, on the one job whose whole purpose is keeping a retention
   * promise the privacy policy makes in public. Nothing here writes to
   * `scans`, so the ordered set does not shift underneath the paging.
   */
  const PAGE = 1000;
  const ids: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error: sErr } = await db
      .from("scans")
      .select("id")
      .is("unlocked_at", null)
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);

    if (sErr) {
      return NextResponse.json({ error: `could not read scans: ${sErr.message}` }, { status: 502 });
    }

    const page = data ?? [];
    ids.push(...page.map((r) => r.id as string));
    if (page.length < PAGE) break;
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
