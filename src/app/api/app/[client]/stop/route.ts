import { NextResponse } from "next/server";

import { APP_LIMITS } from "@/config/contact";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { trackingDay } from "@/lib/tracking/decide";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";
import { type StopDone, readStopForm, stop, stopReturn, undoStop } from "@/lib/tracking/stop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stop a prompt or a cluster, or undo a stop - BRIEF-3 T6 part 2b (30 Sep
 * 2026). Posted by the plain HTML forms on the Clusters page, so it works with
 * JS off; the answer is a 303 back to the page with the toast in the URL.
 *
 * The session decides the member and their role, and the slug must be one of
 * their clients - anyone else gets the same 404 the page gives. The rules and
 * the writes are stop.ts, which refuses a viewer again and scopes every read
 * and write to this client. The fixture is read-only: nothing is written.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  // The form carries everything in the action's query string; the body is empty.
  const sp = new URL(req.url).searchParams;
  const f = readStopForm((k) => sp.get(k), APP_LIMITS.search);
  if (!f) return NextResponse.json({ error: "Not a stop this page can make." }, { status: 400 });
  const back = (done: StopDone) => NextResponse.redirect(new URL(stopReturn(slug, f, done), req.url), 303);
  if (fixtureMode()) return back("refused");

  const email = await sessionEmail();
  if (!email) return NextResponse.redirect(new URL("/app/login", req.url), 303);
  const client = (await clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const p = { kind: f.kind, clientId: client.id, id: f.id, today: trackingDay(), role: client.role };
  const r = f.undo ? await undoStop(supabaseAdmin(), p) : await stop(supabaseAdmin(), { ...p, by: email });
  if (!r.ok) {
    console.warn(`[app] ${f.undo ? "undo" : "stop"} ${f.kind} refused: ${r.message}`);
    return back("refused");
  }
  return back(f.undo ? "undone" : "stopped");
}
