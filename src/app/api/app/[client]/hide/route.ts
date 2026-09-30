import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { readHideCta, recordHidden } from "@/lib/tracking/ask";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * An upgrade prompt's "Hide for 30 days" (BRIEF-2 T11 part 5, 30 Sep 2026;
 * boards-3/CTAs.dc.html, the x at the prompt's top right). Posted by a plain
 * HTML form with the prompt's `cta`; writes one cta_events `hidden` row for
 * this member, which upgrade-context reads back for 30 days. Any member may
 * hide (it changes only what they see). No mail, no spend. The fixture writes
 * nothing. Returns to the Clusters page it came from.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(slug)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const cta = readHideCta(form?.get("cta"));
  const back = NextResponse.redirect(new URL(`/app/${slug}/clusters${cta === "mentioned" ? "?filter=never" : ""}`, req.url), 303);
  if (fixtureMode() || !cta) return back;

  const email = await sessionEmail();
  if (!email) return NextResponse.redirect(new URL("/app/login", req.url), 303);
  const client = (await clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (!(await recordHidden(supabaseAdmin(), { clientId: client.id, email, cta }))) console.warn("[app] hide not recorded");
  return back;
}
