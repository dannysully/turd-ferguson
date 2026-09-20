import "server-only";

import { Resend } from "resend";

import { SITE_URL } from "@/config/schema";
import { T } from "@/config/tokens";
import { headerSafe } from "@/lib/email-header";
import {
  type Palette,
  type ReportCounts,
  reportHtml,
  reportSubject,
  reportText,
  verifyHtml,
  verifyText,
} from "@/lib/scan/email-render";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The scan transactional email: proving an address, and telling someone the
 * report they asked for is ready.
 *
 * Sent through Resend rather than Supabase auth: the built-in SMTP is rate
 * limited to a handful of messages an hour and Supabase say plainly it is not
 * for production. Resend is already wired up with alwayscited.com verified,
 * which also means the copy and the branding are ours.
 *
 * Both messages share one shell. They were two hand-copied blobs of table
 * markup until 19 Sep 2026, and that is how they came to carry colours that
 * are not in the palette - #f6f6f8 where the ground is #f6f6f7, #eceef2 where
 * the rule is #ececee - straight through a sweep that moved all 21 pages onto
 * the tokens. A hex in a template literal in a server module is invisible to
 * a sweep of the rendered site, so the fix is to stop writing one.
 */

/**
 * The origin every email link is built on.
 *
 * The fallback is `SITE_URL` rather than a third copy of the literal. The site
 * used to write its own origin out as three named constants - this one,
 * `SITE_URL` in config/schema.ts and `BASE_URL` in app/sitemap.ts - so a domain
 * change would update two and miss one, and the one it missed sends email.
 */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL;
}

function verifyUrl(verifyToken: string): string {
  return `${siteUrl()}/api/verify/${verifyToken}`;
}

/**
 * A subject line is a mail header.
 *
 * The brand is read off a crawled third-party site, so it is arbitrary text
 * rather than something we chose: a carriage return in it is header
 * injection, and a 400-character one is a subject no client shows the end
 * of. Resend builds the MIME and most likely rejects the first case itself,
 * but the string is ours to hand over clean and it costs one pass.
 * Collapsing all whitespace takes CR and LF with it.
 */

/**
 * The email palette, taken from the design tokens rather than retyped.
 *
 * Two deliberate departures, both toward more contrast rather than less:
 *
 * - `body` is darker than `T.soft`. An email is read in clients that recolour
 *   text, at sizes we do not set, on grounds we do not control, with no
 *   stylesheet to correct any of it. #3d4451 measures 9.79 on white where
 *   `T.soft` is 4.68; on a page that headroom is waste, in an inbox it is
 *   cover.
 * - nothing here uses `T.faint`. It is 2.54 on white, and the rule written
 *   beside it in tokens.ts is that light-ground text does not use it.
 */
const E: Palette = {
  ground: T.bg,
  card: T.surface,
  ink: T.ink,
  body: "#3d4451",
  quiet: T.soft,
  line: T.line,
  accent: T.accent,
  onAccent: T.surface,
};

/** No webfont. Fontsource ships Hanken as woff2 and no mail client loads it. */
const FONT = "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif";

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
      subject: headerSafe(`Open your ${input.brand} report`),
      html: verifyHtml(E, FONT, input.brand, link),
      text: verifyText(input.brand, link),
    });
    if (error) {
      console.error("[scan] verification email rejected", error);
      return false;
    }
  } catch (err) {
    console.error("[scan] verification email failed", err instanceof Error ? err.message : err);
    return false;
  }

  // The message has gone by this point, so this failing does not make the send
  // untrue and must not turn a delivered email into a reported failure. What it
  // costs is the sixty-second cooldown in /api/scan/[token]/resend, which reads
  // this column and treats a null as "never sent" - so a lost stamp is a second
  // copy of the same message one click later. The volume ceiling on that route
  // counts through note_verify_send rather than this column, so that one holds
  // either way; this is the rate limit, not the cap.
  const { error: stampErr } = await supabaseAdmin()
    .from("leads")
    .update({ verify_sent_at: new Date().toISOString() })
    .eq("id", input.leadId);
  if (stampErr) {
    console.warn(
      `[scan] sent the verification mail for lead ${input.leadId} but could not stamp it, ` +
        `so the resend cooldown will read it as never sent: ${stampErr.message}`,
    );
  }

  return true;
}

// --------------------------------------------------------- report ready

/**
 * Tells someone their report is ready, and gives them a way back to it.
 *
 * Without this, closing the tab loses the report: the result is assembled
 * once, for the tab that asked, and there was nothing in the visitor inbox
 * pointing back at it. It also puts the sharpest number this product produces
 * - how many answers did not name them - in front of a buyer a second time.
 *
 * Never throws. A failed send must not affect an unlock that has already
 * happened, so the caller is not given anything to handle.
 */
export async function sendReportReadyEmail(input: {
  email: string;
  brand: string;
  publicToken: string;
  counts: ReportCounts;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[scan] RESEND_API_KEY is not set, report email not sent");
    return;
  }

  const link = `${siteUrl()}/scan/${input.publicToken}`;
  const subject = headerSafe(reportSubject(input.brand, input.counts));

  try {
    const { error } = await new Resend(key).emails.send({
      from: process.env.SCAN_FROM_EMAIL ?? "alwayscited <onboarding@resend.dev>",
      to: input.email,
      subject,
      html: reportHtml(E, FONT, input.brand, link, input.counts),
      text: reportText(input.brand, link, input.counts),
    });
    if (error) console.error("[scan] report email rejected", error);
  } catch (err) {
    console.error("[scan] report email failed", err instanceof Error ? err.message : err);
  }
}
