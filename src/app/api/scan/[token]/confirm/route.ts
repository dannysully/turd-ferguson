import { after } from "next/server";

import { isMarket } from "@/lib/scan/domain";
import { runScan } from "@/lib/scan/pipeline";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

  let body: { topic?: string; market?: string; topic_variants?: string[] };
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

  // The confirmed topic is the trusted value from here on.
  const { error } = await db
    .from("scans")
    .update({
      topic,
      market,
      status: "queued",
      step: null,
      error: null,
      ...(variants ? { topic_variants: variants } : {}),
    })
    .eq("id", scan.id);

  if (error) {
    return Response.json({ error: "store_failed" }, { status: 500 });
  }

  // Return now; the run continues after the response is flushed.
  after(async () => {
    await runScan(scan.id);
  });

  return Response.json({ status: "queued" });
}
