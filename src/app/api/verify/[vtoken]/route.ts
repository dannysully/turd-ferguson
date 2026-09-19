import { NextResponse } from "next/server";

import {
  SCAN_UNLOCK_COLUMNS,
  UnlockNotStamped,
  completeUnlock,
  resolveAccount,
  type UnlockableScan,
} from "@/lib/scan/unlock";
import { siteUrl } from "@/lib/scan/verify-email";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Unlocking starts the gated pass in after(), so this covers that second pass.
export const maxDuration = 300;

/**
 * The link in the verification email.
 *
 * Proving the address is what unlocks the scan, so this is the only place an
 * unlock happens once verification is on. It is deliberately idempotent: people
 * click these links twice, and forward them to themselves, and the second click
 * has to land on the report rather than on an error.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ vtoken: string }> }) {
  const { vtoken } = await ctx.params;
  const site = siteUrl();

  const db = supabaseAdmin();

  const { data: lead } = await db
    .from("leads")
    .select("id, email, scan_id, account_id, verified_at")
    .eq("verify_token", vtoken)
    .maybeSingle();

  if (!lead || !lead.scan_id) {
    return NextResponse.redirect(`${site}/scan?verify=invalid`, { status: 302 });
  }

  const { data: scan } = await db
    .from("scans")
    .select(SCAN_UNLOCK_COLUMNS)
    .eq("id", lead.scan_id)
    .maybeSingle();

  if (!scan) {
    return NextResponse.redirect(`${site}/scan?verify=invalid`, { status: 302 });
  }

  const target = `${site}/scan/${scan.public_token}`;
  const alreadyUnlocked = Boolean(scan.unlocked_at);

  // Verified and unlocked: there is nothing left to do. Send them to the report.
  if (lead.verified_at && alreadyUnlocked) return NextResponse.redirect(target, { status: 302 });

  if (!lead.verified_at) {
    /**
     * The same check again, as a claim rather than a read.
     *
     * The check above is a read followed by a write, which two requests can
     * both pass before either writes. That is not hypothetical here:
     * mail-security scanners fetch links in a message on delivery, so the
     * scanner's GET and the recipient's click routinely arrive together on
     * exactly this URL. Both would unlock, which means two report-ready emails
     * and two attempts at the gated pass.
     *
     * .is("verified_at", null) makes the update itself the arbiter, and
     * .select() is what lets us see the result: no rows back means somebody
     * else verified this lead first, and there is nothing left for this request
     * to do but show the report.
     */
    const { data: claimed } = await db
      .from("leads")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", lead.id)
      .is("verified_at", null)
      .select("id");
    if (!claimed?.length) return NextResponse.redirect(target, { status: 302 });
  } else {
    /**
     * Verified, and the scan never unlocked. That is a first click that claimed
     * the lead and then failed before the stamp landed, and until now it was
     * terminal: the claim is the only thing that had happened, the check at the
     * top of this function sent every later click straight to a report that was
     * still gated, and the address had been proven for nothing. Recovering it
     * took an edit to the database.
     *
     * Reachable only after a failure, because completeUnlock sends nothing and
     * spends nothing above its own stamp - so there is no first email to
     * duplicate here and no gated pass to pay for twice. Two clicks arriving
     * together in this state would both unlock and send, which costs one extra
     * copy of one message and needs a prior failure to reach at all. The gated
     * pass stays safe either way: it has its own compare-and-swap.
     */
    console.warn(
      "[scan] " + scan.id + " was verified but never unlocked - retrying the unlock",
    );
  }

  const accountId = await resolveAccount(
    lead.email as string,
    (lead.account_id as string | null) ?? (scan.account_id as string | null) ?? null,
  );

  try {
    await completeUnlock(scan as unknown as UnlockableScan, accountId, lead.email as string);
  } catch (err) {
    if (!(err instanceof UnlockNotStamped)) throw err;
    /**
     * Say so, and send them somewhere that explains it. The alternative is the
     * report route, which would answer this exact visitor with the gate they
     * have just proved an address to get past. Their next click on the same
     * link takes the recovery branch above and is very likely to succeed.
     */
    console.error("[scan] " + (err as Error).message);
    return NextResponse.redirect(`${site}/scan?verify=failed`, { status: 302 });
  }

  // No magic link is sent here, and adding one back would be a regression.
  // Nothing on this site reads a Supabase session - the report is authorised by
  // the token in the URL - and completeUnlock above already sends the branded
  // report-ready email through Resend.

  return NextResponse.redirect(target, { status: 302 });
}
