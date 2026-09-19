import "server-only";

import { Resend } from "resend";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The scan's transactional email: proving an address, and telling someone the
 * report they asked for is ready.
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
        <tr><td style="font-size:18px;font-weight:600;color:#0f1115;padding-bottom:16px;">
          One click and your ${escapeHtml(brand)} report opens
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.55;color:#3d4451;padding-bottom:24px;">
          We ran the check, and the result is already on your page. Confirming
          this address opens the rest: which of those pages you could be placed
          into, and what each engine said word for word.
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

// --------------------------------------------------------- report ready

function reportHtml(brand: string, link: string, missed: number, total: number): string {
  const headline =
    missed > 0
      ? `${missed} of the ${total} questions we asked came back without ${escapeHtml(brand)} in the answer.`
      : `We put ${total} buying-intent questions to the engines your buyers use.`;

  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#f6f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px;">
        <tr><td style="font-size:18px;font-weight:600;color:#0f1115;padding-bottom:16px;">
          Your ${escapeHtml(brand)} report is ready
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.55;color:#3d4451;padding-bottom:24px;">
          ${headline} The report adds the pages you could be placed into,
          ranked by how many answers a placement would win, and what each
          engine said word for word.
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <a href="${link}" style="display:inline-block;background:#7C3AED;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:8px;">Open your report</a>
        </td></tr>
        <tr><td style="font-size:13px;line-height:1.55;color:#6b7280;">
          The link works on any device and does not expire. If the button does
          nothing, paste this into your browser:<br>
          <span style="color:#7C3AED;word-break:break-all;">${link}</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Tells someone their report is ready, and gives them a way back to it.
 *
 * Without this, closing the tab loses the report: the result is assembled once,
 * for the tab that asked, and there was nothing in the visitor's inbox pointing
 * back at it. It also puts the sharpest number this product produces - how many
 * answers did not name them - in front of a buyer a second time.
 *
 * Never throws. A failed send must not affect an unlock that has already
 * happened, so the caller is not given anything to handle.
 */
export async function sendReportReadyEmail(input: {
  email: string;
  brand: string;
  publicToken: string;
  missed: number;
  total: number;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[scan] RESEND_API_KEY is not set, report email not sent");
    return;
  }

  const link = `${siteUrl()}/scan/${input.publicToken}`;
  const subject =
    input.missed > 0
      ? `${input.missed} of ${input.total} AI answers did not name ${input.brand}`
      : `Your ${input.brand} report`;

  try {
    const { error } = await new Resend(key).emails.send({
      from: process.env.SCAN_FROM_EMAIL ?? "alwayscited <onboarding@resend.dev>",
      to: input.email,
      subject,
      html: reportHtml(input.brand, link, input.missed, input.total),
      text: `Your ${input.brand} report is ready.\n\nOpen it here: ${link}\n\nThe link works on any device and does not expire.`,
    });
    if (error) console.error("[scan] report email rejected", error);
  } catch (err) {
    console.error("[scan] report email failed", err instanceof Error ? err.message : err);
  }
}
