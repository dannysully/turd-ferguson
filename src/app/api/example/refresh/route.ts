import { NextResponse } from "next/server";
import { refreshExample } from "@/lib/scan/example-cache";

/**
 * Weekly re-run of the example result. Vercel Cron calls this with
 * Authorization: Bearer <CRON_SECRET>. Refuses without it.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const outcome = await refreshExample();
  return NextResponse.json({
    ok: outcome.ok,
    refreshed: outcome.refreshed,
    read_at: outcome.result.read_at,
    sources: outcome.result.sources.length,
    error: outcome.error ?? null,
  }, { status: outcome.ok ? 200 : 502 });
}
