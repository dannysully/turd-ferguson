import { NextResponse } from "next/server";

import {
  SCAN_UNLOCK_COLUMNS,
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

  // A second click has nothing left to do. Send them to the report.
  if (lead.verified_at) return NextResponse.redirect(target, { status: 302 });

  /**
   * The same check again, as a claim rather than a read.
   *
   * The check above is a read followed by a write, which two requests can both
   * pass before either writes. That is not hypothetical here: mail-security
   * scanners fetch links in a message on delivery, so the scanner's GET and the
   * recipient's click routinely arrive together on exactly this URL. Both would
   * unlock, which means two report-ready emails and two attempts at the gated
   * pass.
   *
   * .is("verified_at", null) makes the update itself the arbiter, and .select()
   * is what lets us see the result: no rows back means somebody else verified
   * this lead first, and there is nothing left for this request to do but show
   * the report.
   */
  const { data: claimed } = await db
    .from("leads")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", lead.id)
    .is("verified_at", null)
    .select("id");
  if (!claimed?.length) return NextResponse.redirect(target, { status: 302 });

  const accountId = await resolveAccount(
    lead.email as string,
    (lead.account_id as string | null) ?? (scan.account_id as string | null) ?? null,
  );

  await completeUnlock(scan as unknown as UnlockableScan, accountId, lead.email as string);

  // No magic link is sent here, and adding one back would be a regression.
  // Nothing on this site reads a Supabase session - the report is authorised by
  // the token in the URL - and completeUnlock above already sends the branded
  // report-ready email through Resend.

  return NextResponse.redirect(target, { status: 302 });
}
