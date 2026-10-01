import { NextResponse } from "next/server";

import { invite as inviteEmail } from "@/lib/email/lifecycle";
import { lifecycleOn } from "@/lib/email/lifecycle-mail";
import { siteUrl } from "@/lib/scan/verify-email";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TIER_PLAIN, type TierKey } from "@/lib/tier-text";
import { upsellMode } from "@/lib/tracking/ask";
import { trackingDay } from "@/lib/tracking/decide";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { sendInvite } from "@/lib/tracking/invite-mail";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";
import { type TeamDone, changeRole, invite, inviteMail, invitesToday, readTeam, readTeamForm, refuseActor, refuseChange, refuseInvite, removeMember, teamReturn } from "@/lib/tracking/team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Invite, change a role, remove - R142 part 2 (1 Oct 2026; BRIEF-4 P2 Team).
 * Posted by plain HTML forms on Settings, so it works with JS off; the answer
 * is a 303 back to the page with the toast in the URL. Session and membership
 * as the stop route; owners only. The rules are team.ts; the invite mail is
 * invite-mail.ts. The fixture is read-only: nothing is written or sent.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(slug)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const f = form ? readTeamForm((k) => form.get(k)) : null;
  const back = (done: TeamDone) => NextResponse.redirect(new URL(teamReturn(slug, done, f?.email ?? null), req.url), 303);
  if (!f || fixtureMode()) return back("refused");

  const email = await sessionEmail();
  if (!email) return NextResponse.redirect(new URL("/app/login", req.url), 303);
  const client = (await clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const refused = (why: string) => {
    console.warn(`[app] team ${f.op} refused: ${why}`);
    return back("refused");
  };
  const actor = refuseActor(client.role);
  if (actor) return refused(actor);

  const db = supabaseAdmin();
  // The account is read here, server-side only; clientsFor keeps account_id out of what pages get.
  const { data: row, error: rowErr } = await db.from("client_domains").select("account_id").eq("id", client.id).maybeSingle();
  if (rowErr || !row) return refused(`could not read the client's account: ${rowErr?.message ?? "none"}`);
  const accountId = row.account_id as string;
  const rows = await readTeam(db, accountId);
  if (typeof rows === "string") return refused(rows);

  if (f.op === "invite") {
    const today = trackingDay();
    const n = await invitesToday(db, { email, today });
    if (typeof n === "string") return refused(n);
    const no = refuseInvite({ rows, email: f.email, invitesToday: n });
    if (no) return refused(no);
    // Read before the write: agency mode must be known, or the mail could name a nomada tier.
    const { data: account, error: aErr } = await db.from("accounts").select("upsell_mode").eq("id", accountId).maybeSingle();
    if (aErr || !account) return refused(`could not read the account: ${aErr?.message ?? "none"}`);
    const r = await invite(db, { accountId, clientId: client.id, email: f.email, role: f.role!, by: email });
    if (!r.ok) return refused(r.message);
    const agency = upsellMode(account.upsell_mode) === "agency";
    // The branded invite (R159) names alwayscited and the tier, so never in agency mode; off until its flag is on.
    const mail =
      !agency && (await lifecycleOn(db, "invite"))
        ? inviteEmail({ tier: (client.tier in TIER_PLAIN ? client.tier : "tracked") as TierKey, domain: client.domain, link: `${siteUrl()}/app/login`, inviter: email, role: f.role! })
        : inviteMail({ inviter: email, domain: client.domain, role: f.role!, agency });
    if (!(await sendInvite({ to: f.email, replyTo: email, ...mail }))) console.warn("[app] invite saved but the mail was not sent");
    return back("invited");
  }

  const no = refuseChange({ rows, actor: email, email: f.email, op: f.op, role: f.role });
  if (no) return refused(no);
  const r = f.op === "role" ? await changeRole(db, { accountId, email: f.email, role: f.role! }) : await removeMember(db, { accountId, email: f.email, by: email });
  if (!r.ok) return refused(r.message);
  return back(f.op === "role" ? "role" : "removed");
}
