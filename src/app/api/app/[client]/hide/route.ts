import { NextResponse } from "next/server";

import { APP_LIMITS } from "@/config/contact";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readHideCta, recordHidden } from "@/lib/tracking/ask";
import { trackingDay } from "@/lib/tracking/decide";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";
import { readKept } from "@/lib/tracking/stop";
import { recordUsage } from "@/lib/tracking/usage-record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * An upgrade prompt's "Hide for 30 days" (BRIEF-2 T11 part 5, 30 Sep 2026;
 * boards-3/CTAs.dc.html, the x at the prompt's top right). Posted by a plain
 * HTML form with the prompt's `cta`; writes one cta_events `hidden` row for
 * this member, which upgrade-context reads back for 30 days. Any member may
 * hide (it changes only what they see). No mail, no spend. The fixture writes
 * nothing. Returns to the Clusters page it came from, with the range, filter
 * and search its action carries (DS16, 2 Oct 2026); "mentioned" still lands
 * on the never-named filter.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(slug)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const cta = readHideCta(form?.get("cta"));
  const view = readKept((k) => new URL(req.url).searchParams.get(k), APP_LIMITS.search);
  // DS29: `hid=1` draws "Hidden for 30 days" on the way back - only once the row is recorded (the fixture records nothing and says so anyway).
  const to = (hid: boolean) => {
    const q = new URLSearchParams({ ...view, ...(cta === "mentioned" ? { filter: "never" } : {}), ...(hid ? { hid: "1" } : {}) }).toString();
    return NextResponse.redirect(new URL(`/app/${slug}/clusters${q ? `?${q}` : ""}`, req.url), 303);
  };
  const back = to(false);
  if (!cta) return back;
  if (fixtureMode()) return to(true);

  const email = await sessionEmail();
  if (!email) return NextResponse.redirect(new URL("/app/login", req.url), 303);
  const client = (await clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const hid = await recordHidden(supabaseAdmin(), { clientId: client.id, email, cta });
  if (!hid) console.warn("[app] hide not recorded");
  await recordUsage(supabaseAdmin(), { clientId: client.id, email, event: "cta_hide", path: null, props: { cta }, today: trackingDay() });
  return to(hid);
}
