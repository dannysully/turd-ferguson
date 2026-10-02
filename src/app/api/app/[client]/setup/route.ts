import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { fixtureWrites } from "@/lib/tracking/fixture-writes";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";
import { confirmFixtureSetup, trackingRepo } from "@/lib/tracking/repo";
import { loadSetupConfirmed } from "@/lib/tracking/setup-data";
import { SETUP_CONFIRMED_EVENT, setupPath } from "@/lib/tracking/setup-landing";
import { sendSetupConfirmed } from "@/lib/tracking/setup-mail";
import { refuseRole } from "@/lib/tracking/stop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 3 of /app/[client]/setup, "Confirm" (R166 part 3b, Danny, danny.md
 * line 175). Writes the one dashboard_events row named setup_confirmed and
 * answers with a 303 to the client's Overview. Once only: a client already
 * confirmed writes nothing more. Session and membership as the stop route;
 * viewers are refused; the fixture writes nothing unless
 * TRACKING_FIXTURE_WRITE=1 (R168) holds the confirm in memory. Step 4: the
 * internal mail to us (setup-mail.ts) goes once, after the row is written;
 * the fixture never sends.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  const done = NextResponse.redirect(new URL(`/app/${encodeURIComponent(slug)}?setup=confirmed`, req.url), 303);
  const failed = NextResponse.redirect(new URL(`${setupPath(encodeURIComponent(slug))}?confirm=failed`, req.url), 303);
  if (fixtureMode()) {
    // R168: with TRACKING_FIXTURE_WRITE=1 the confirm is held in memory, and a viewer is refused as below.
    if (fixtureWrites()) {
      const repo = trackingRepo();
      const me = await repo.sessionEmail();
      const role = me ? (await repo.clientsFor(me)).find((c) => c.slug === slug)?.role : undefined;
      if (refuseRole(role ?? "")) return NextResponse.json({ error: "Viewers cannot confirm setup." }, { status: 403 });
      confirmFixtureSetup();
    }
    return done;
  }

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
  // Step 4: once a client - only after the one row is written, never on a repeat.
  await sendSetupConfirmed({ domain: client.domain, slug: client.slug, tier: client.tier, member: email });
  return done;
}
