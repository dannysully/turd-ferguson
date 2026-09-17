import "server-only";

import { Resend } from "resend";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The verification email.
 *
 * Sent through Resend rather than Supabase auth: the built-in SMTP is rate
 * limited to a handful of messages an hour and Supabase say plainly it is not
 * for production. Resend is already wired up with alwayscited.com verified,
 * which also means the copy and the branding are ours.
 */

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://alwayscited.com";
}

function verifyUrl(verifyToken: string): string {
  return `${siteUrl()}/api/verify/${verifyToken}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

function html(brand: string, link: string): string {
  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#f6f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px;">
        <tr><td style="font-size:18px;font-weight:600;color:#0B1220;padding-bottom:16px;">
          One click and your ${escapeHtml(brand)} report opens
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.55;color:#3d4451;padding-bottom:24px;">
          We ran the check. Confirming this address opens the full leaderboard,
          every source the engines drew on, and what each one said.
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <a href="${link}" style="display:inline-block;background:#7C3AED;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:8px;">Open the report</a>
        </td></tr>
        <tr><td style="font-size:13px;line-height:1.55;color:#6b7280;">
          If the button does nothing, paste this into your browser:<br>
          <span style="color:#7C3AED;word-break:break-all;">${link}</span>
        </td></tr>
        <tr><td style="font-size:13px;line-height:1.55;color:#6b7280;padding-top:24px;border-top:1px solid #eceef2;">
          If you did not ask for this, ignore it and nothing opens.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Sends it and stamps when. Returns false rather than throwing: a send that
 * fails must surface to the caller as a retryable state, not a 500 on a form
 * the visitor has already filled in correctly.
 */
export async function sendVerificationEmail(input: {
  email: string;
  brand: string;
  verifyToken: string;
  leadId: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[scan] RESEND_API_KEY is not set, verification email not sent");
    return false;
  }

  const link = verifyUrl(input.verifyToken);
  try {
    const { error } = await new Resend(key).emails.send({
      from: process.env.SCAN_FROM_EMAIL ?? "alwayscited <onboarding@resend.dev>",
      to: input.email,
      subject: `Open your ${input.brand} report`,
      html: html(input.brand, link),
      text: `We ran the check on ${input.brand}.\n\nOpen the full report: ${link}\n\nIf you did not ask for this, ignore it and nothing opens.`,
    });
    if (error) {
      console.error("[scan] verification email rejected", error);
      return false;
    }
  } catch (err) {
    console.error("[scan] verification email failed", err instanceof Error ? err.message : err);
    return false;
  }

  await supabaseAdmin()
    .from("leads")
    .update({ verify_sent_at: new Date().toISOString() })
    .eq("id", input.leadId);

  return true;
}
