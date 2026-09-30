import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyCheck } from "@/lib/tracking/add-cluster";
import { ADMIN_LIMITS, trackingDay } from "@/lib/tracking/decide";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";
import { addCluster } from "@/lib/tracking/new-cluster";
import { recordUsage } from "@/lib/tracking/usage-record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Start tracking this cluster" - BRIEF-3 T6 part 3c (30 Sep 2026). Posted by
 * step 2 of the Add panel: the keyword, its checked volume and intent with the
 * signature Check keyword gave them, and the five prompts p-0 to p-4. No paid
 * read: a verdict whose signature does not verify for this client and today
 * is refused, so the check cannot be skipped. The writes are new-cluster.ts
 * through limits.ts. Session and membership as the stop route; the fixture
 * writes nothing.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  const page = `/app/${encodeURIComponent(slug)}/clusters`;
  const back = (q: Record<string, string>) => NextResponse.redirect(new URL(`${page}?${new URLSearchParams(q)}`, req.url), 303);
  if (fixtureMode()) return back({ done: "refused", kind: "cluster", id: "new" });

  const email = await sessionEmail();
  if (!email) return NextResponse.redirect(new URL("/app/login", req.url), 303);
  const client = (await clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const field = (k: string) => (typeof form?.get(k) === "string" ? (form.get(k) as string).slice(0, ADMIN_LIMITS.question) : "");
  const keyword = field("keyword");
  const volume = Number(field("vol"));
  const intent = field("intent");
  const day = trackingDay();
  if (!verifyCheck({ clientId: client.id, keyword, volume, intent, day }, field("sig") || null, process.env.CRON_SECRET ?? "")) {
    console.warn("[app] add cluster refused: the keyword check did not verify");
    return back({ done: "refused", kind: "cluster", id: "new" });
  }
  const r = await addCluster(supabaseAdmin(), {
    clientId: client.id,
    tier: client.tier,
    keyword,
    volume,
    intent,
    prompts: [0, 1, 2, 3, 4].map((i) => field(`p-${i}`)),
    today: day,
    by: email,
    role: client.role,
  });
  if (!r.ok) {
    console.warn(`[app] add cluster refused: ${r.message}`);
    return back({ done: "refused", kind: "cluster", id: "new" });
  }
  await recordUsage(supabaseAdmin(), { clientId: client.id, email, event: "add_save", path: "/clusters", today: day });
  return back({ done: "added", kind: "cluster", id: r.clusterId, open: r.clusterId });
}
