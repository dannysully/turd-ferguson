import { NextResponse } from "next/server";

import { isMarket } from "@/lib/scan/domain";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { type KeywordCheck, verdictQuery } from "@/lib/tracking/add-cluster";
import { checkClusterKeyword } from "@/lib/tracking/check-keyword";
import { ADMIN_LIMITS, trackingDay } from "@/lib/tracking/decide";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";
import { refuseRole } from "@/lib/tracking/stop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Check keyword" in Add a cluster - BRIEF-3 T6 part 3b (30 Sep 2026). Posted
 * by the plain HTML form in the Add panel; answers with a 303 back to the
 * Clusters page carrying `?add=1&kw=&ck=` (and `vol`, `intent` on a pass),
 * from which the page rebuilds the board's words. A spender: two DataForSEO
 * reads, only after the free prechecks and under CHECKS_PER_CLIENT_PER_DAY
 * (check-keyword.ts). Session and membership as the stop route; viewers are
 * refused; the fixture reads nothing.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  const form = await req.formData().catch(() => null);
  const raw = typeof form?.get("keyword") === "string" ? (form.get("keyword") as string).trim().slice(0, ADMIN_LIMITS.question) : "";
  const back = (c: KeywordCheck | null) =>
    NextResponse.redirect(new URL(`/app/${encodeURIComponent(slug)}/clusters?${new URLSearchParams({ add: "1", ...(raw ? { kw: raw } : {}), ...(c ? verdictQuery(c) : {}) })}`, req.url), 303);
  if (!raw) return back(null);
  if (fixtureMode()) return back({ ok: false, reason: "read_failed", ask: true, message: "" });

  const email = await sessionEmail();
  if (!email) return NextResponse.redirect(new URL("/app/login", req.url), 303);
  const client = (await clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (refuseRole(client.role)) return NextResponse.json({ error: "Viewers cannot add clusters." }, { status: 403 });

  const db = supabaseAdmin();
  const { data: kws, error } = await db.from("tracked_keywords").select("keyword").eq("client_domain_id", client.id).is("stopped_on", null);
  if (error) {
    console.warn(`[app] keyword check could not read tracked keywords: ${error.message}`);
    return back({ ok: false, reason: "read_failed", ask: true, message: "" });
  }
  const r = await checkClusterKeyword(db, {
    clientId: client.id,
    email,
    keyword: raw,
    market: isMarket(client.market) ? client.market : "US",
    tracked: (kws ?? []).map((k) => k.keyword as string),
    brands: [client.brand ?? "", client.domain],
    today: trackingDay(),
  });
  return back(r);
}
