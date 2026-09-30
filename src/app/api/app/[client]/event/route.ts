import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { trackingDay } from "@/lib/tracking/decide";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";
import { readUsage } from "@/lib/tracking/usage";
import { recordUsage } from "@/lib/tracking/usage-record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A usage event is an event name, a route and a few ids; anything longer is not one. */
const MAX_BODY = 1_000;

/**
 * One dashboard usage event from the page (BRIEF-2 T10, R98, 30 Sep 2026),
 * sent by UsageBeacon with `keepalive`. The events a route already handles
 * (stop, undo, add_save, csv, cta_ask, cta_hide) are recorded by that route;
 * this takes the ones only the page sees - views, clicks on range, compare,
 * engine and detail links, the Add panel opening and closing, prompts shown.
 *
 * The session decides the member; the slug must be one of their clients. It
 * answers 204 whatever happens after the checks, since nothing on the page
 * waits for it. No mail, no spend. The fixture writes nothing.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(slug)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const text = await req.text().catch(() => "");
  if (text.length > MAX_BODY) return NextResponse.json({ error: "Too long." }, { status: 413 });
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {}
  const ev = readUsage(body);
  if (!ev) return NextResponse.json({ error: "Not an event this dashboard records." }, { status: 400 });
  if (fixtureMode()) return new NextResponse(null, { status: 204 });

  const email = await sessionEmail();
  if (!email) return NextResponse.json({ error: "Signed out." }, { status: 401 });
  const client = (await clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await recordUsage(supabaseAdmin(), { clientId: client.id, email, ...ev, today: trackingDay() });
  return new NextResponse(null, { status: 204 });
}
