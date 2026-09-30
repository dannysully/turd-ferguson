import { NextResponse } from "next/server";

import { APP_LIMITS } from "@/config/contact";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { trackingDay } from "@/lib/tracking/decide";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";
import { fillSlot } from "@/lib/tracking/slot";
import { type StopDone, readStopForm, stopReturn } from "@/lib/tracking/stop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fill a free slot: track a new prompt in a cluster - BRIEF-3 T6 part 2c (30
 * Sep 2026). Posted by the plain HTML free-slot form on the Clusters page: the
 * cluster, the angle and the page state in the action's query string, the typed
 * prompt in the body. The rules and the insert are slot.ts through limits.ts.
 * Session and membership as the stop route; the fixture writes nothing.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const f = readStopForm((k) => sp.get(k), APP_LIMITS.search);
  if (!f || f.kind !== "cluster") return NextResponse.json({ error: "Not a prompt this page can add." }, { status: 400 });
  const back = (done: StopDone, id = f.id) => NextResponse.redirect(new URL(stopReturn(slug, { ...f, kind: done === "added" ? "prompt" : "cluster", id }, done), req.url), 303);
  if (fixtureMode()) return back("refused");

  const email = await sessionEmail();
  if (!email) return NextResponse.redirect(new URL("/app/login", req.url), 303);
  const client = (await clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const text = typeof form?.get("text") === "string" ? (form.get("text") as string) : "";
  const r = await fillSlot(supabaseAdmin(), { clientId: client.id, clusterId: f.id, angle: sp.get("angle"), text, today: trackingDay(), by: email, role: client.role });
  if (!r.ok) {
    console.warn(`[app] free slot refused: ${r.message}`);
    return back("refused");
  }
  return back("added", r.id);
}
