import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";
import { loadSetupConfirmed } from "@/lib/tracking/setup-data";
import { SETUP_CONFIRMED_EVENT, setupPath } from "@/lib/tracking/setup-landing";
import { refuseRole } from "@/lib/tracking/stop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 3 of /app/[client]/setup, "Confirm" (R166 part 3b, Danny, danny.md
 * line 175). Writes the one dashboard_events row named setup_confirmed and
 * answers with a 303 to the client's Overview. Once only: a client already
 * confirmed writes nothing more. Session and membership as the stop route;
 * viewers are refused; the fixture writes nothing. The internal mail to
 * Danny (step 4) is not sent from here yet.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  const done = NextResponse.redirect(new URL(`/app/${encodeURIComponent(slug)}?setup=confirmed`, req.url), 303);
  const failed = NextResponse.redirect(new URL(`${setupPath(encodeURIComponent(slug))}?confirm=failed`, req.url), 303);
  if (fixtureMode()) return done;

  const email = await sessionEmail();
  if (!email) return NextResponse.redirect(new URL("/app/login", req.url), 303);
  const client = (await clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (refuseRole(client.role)) return NextResponse.json({ error: "Viewers cannot confirm setup." }, { status: 403 });

  const already = await loadSetupConfirmed(client.id);
  if (already === null) return failed;
  if (already) return done;
  const { error } = await supabaseAdmin()
    .from("dashboard_events")
    .insert({ client_domain_id: client.id, member_email: email, event: SETUP_CONFIRMED_EVENT, path: "/setup" });
  if (error) {
    console.warn(`[app] could not confirm setup: ${error.message}`);
    return failed;
  }
  return done;
}
