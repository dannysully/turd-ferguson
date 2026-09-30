import { NextResponse } from "next/server";

import { APP_LIMITS } from "@/config/contact";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { editPrompts, readEdits } from "@/lib/tracking/edit";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";
import { readStopForm, stopReturn } from "@/lib/tracking/stop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Save a pending cluster's prompts - BRIEF-3 T6 part 2d (30 Sep 2026). Posted
 * by the plain HTML editor on the Clusters page: the cluster and the page state
 * in the action's query string, one `p-<prompt id>` field per prompt in the
 * body. The rules and the writes are edit.ts, which refuses any prompt that
 * already has a reading. Session and membership as the stop route; the fixture
 * writes nothing.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const f = readStopForm((k) => sp.get(k), APP_LIMITS.search);
  if (!f || f.kind !== "cluster") return NextResponse.json({ error: "Not a cluster this page can edit." }, { status: 400 });
  const back = (done: "saved" | "refused") => NextResponse.redirect(new URL(stopReturn(slug, { ...f, back: { ...f.back, open: f.id } }, done), req.url), 303);
  if (fixtureMode()) return back("refused");

  const email = await sessionEmail();
  if (!email) return NextResponse.redirect(new URL("/app/login", req.url), 303);
  const client = (await clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const r = await editPrompts(supabaseAdmin(), { clientId: client.id, clusterId: f.id, edits: form ? readEdits(form.entries()) : [], role: client.role });
  if (!r.ok) {
    console.warn(`[app] cluster edit refused: ${r.message}`);
    return back("refused");
  }
  return back("saved");
}
