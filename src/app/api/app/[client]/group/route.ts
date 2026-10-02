import { NextResponse } from "next/server";

import { APP_LIMITS } from "@/config/contact";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { fixtureGroup } from "@/lib/tracking/fixture-writes";
import { moveIntoCluster } from "@/lib/tracking/limits";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";
import { writeFixture } from "@/lib/tracking/repo";
import { type StopDone, readStopForm, stopReturn } from "@/lib/tracking/stop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID = /^[0-9A-Za-z_-]{1,64}$/;

/**
 * "Move into a cluster" - R170 part 2 (Danny, 2 Oct 2026, danny.md line 180).
 * Posted by the plain HTML form on each ungrouped prompt on the Clusters page:
 * the prompt and the page state in the action's query string, as the stop
 * route reads them, and the picked cluster in the body. The rules and the
 * write are limits.ts's moveIntoCluster (refuseGrouping). Session and
 * membership as the stop route; the fixture writes nothing unless
 * TRACKING_FIXTURE_WRITE=1 (R168) holds it in memory.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const f = readStopForm((k) => sp.get(k), APP_LIMITS.search);
  const form = await req.formData().catch(() => null);
  const clusterId = typeof form?.get("cluster") === "string" ? (form.get("cluster") as string) : "";
  if (!f || f.kind !== "prompt" || f.undo || !ID.test(clusterId)) return NextResponse.json({ error: "Not a move this page can make." }, { status: 400 });
  const back = (done: StopDone) => NextResponse.redirect(new URL(stopReturn(slug, f, done), req.url), 303);
  if (fixtureMode()) {
    const r = writeFixture((fx) => fixtureGroup(fx, { clusterId, id: f.id, role: fx.member.role }));
    if (r && !r.ok) console.warn(`[app] fixture move refused: ${r.message}`);
    return back(r?.ok ? "moved" : "refused");
  }

  const email = await sessionEmail();
  if (!email) return NextResponse.redirect(new URL("/app/login", req.url), 303);
  const client = (await clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const r = await moveIntoCluster(supabaseAdmin(), { clientId: client.id, clusterId, id: f.id, role: client.role });
  if (!r.ok) {
    console.warn(`[app] move refused: ${r.message}`);
    return back("refused");
  }
  return back("moved");
}
