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

  // Unclaimed means never unlocked. Once verification is on, unlocked_at is
  // only ever set by a proven address, so this stays the right test.
  const { data: stale, error: sErr } = await db
    .from("scans")
    .select("id")
    .is("unlocked_at", null)
    .lt("created_at", cutoff);

  if (sErr) {
    return NextResponse.json({ error: `could not read scans: ${sErr.message}` }, { status: 502 });
  }

  const ids = (stale ?? []).map((r) => r.id as string);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, cutoff, scans: 0, answers_cleared: 0 });
  }

  let cleared = 0;
  const failures: string[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = ids.slice(i, i + CHUNK);
    const { data, error } = await db
      .from("scan_answers")
      .update({ response_text: null })
      .in("scan_id", batch)
      .not("response_text", "is", null)
      .select("id");
    if (error) failures.push(error.message);
    else cleared += data?.length ?? 0;
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
