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

  await db.from("leads").update({ verified_at: new Date().toISOString() }).eq("id", lead.id);

  const accountId = await resolveAccount(
    lead.email as string,
    (lead.account_id as string | null) ?? (scan.account_id as string | null) ?? null,
  );

  await completeUnlock(scan as unknown as UnlockableScan, accountId, lead.email as string);

  // The session for the return visit. Sent, not waited on.
  void db.auth.admin
    .inviteUserByEmail(lead.email as string, { redirectTo: target })
    .catch((err) => {
      console.warn("[scan] magic link not sent", err instanceof Error ? err.message : err);
    });

  return NextResponse.redirect(target, { status: 302 });
}
