import "server-only";

import { Resend } from "resend";

import { T } from "@/config/tokens";
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

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://alwayscited.com";
}

function verifyUrl(verifyToken: string): string {
  return `${siteUrl()}/api/verify/${verifyToken}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
function headerSafe(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 120);
}

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
const E = {
  ground: T.bg,
  card: T.surface,
  ink: T.ink,
  body: "#3d4451",
  quiet: T.soft,
  line: T.line,
  accent: T.accent,
  onAccent: T.surface,
} as const;

/** No webfont. Fontsource ships Hanken as woff2 and no mail client loads it. */
const FONT = "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif";

/**
 * Every field is HTML, already escaped by the caller. The shell escapes
 * nothing: it was escaping the title and the preview line on top of a brand
 * the caller had escaped already, so an ampersand in a company name reached
 * the inbox as &amp;amp;.
 */
type Shell = {
  /** Shown by a client rendering the message in a browser view. Not the subject. */
  title: string;
  /**
   * The inbox preview line, shown after the subject in every mail client
   * there is. With none set a client takes the first text it finds, which
   * here is the heading - so the reader saw the same sentence twice and
   * learned nothing from the second.
   */
  preheader: string;
  heading: string;
  /** Escaped HTML. */
  body: string;
  cta: { href: string; label: string };
  /** Escaped HTML, small print under the button. */
  footnote: string;
  /** Escaped HTML under a rule, or nothing. */
  aside?: string;
};

/**
 * The chrome both messages share: a 520px card on the page ground, a head
 * that declares its own encoding, an inbox preview line, and a button that
 * survives Outlook.
 *
 * Three things here are not decoration.
 *
 * There was no head element at all, and so no charset. The brand in the
 * heading is read off a crawled site and can hold any character there is;
 * Resend sets utf-8 on the part header, which is what has been carrying it,
 * but a document that declares its own encoding does not depend on that.
 *
 * max-width does nothing in Outlook desktop, which lays out with Word, so the
 * card ran the full width of the window there. The conditional comment gives
 * Outlook a fixed 520 and leaves every other client the fluid card.
 *
 * Outlook also drops padding on an anchor, which left the button as bare text
 * on a purple rectangle. mso-padding-alt on the cell puts it back.
 *
 * None of those three is verified in a mail client - there is no client in
 * here to verify them in. They are the documented behaviours and the standard
 * fixes for them. What is verified is the markup.
 */
function shell(s: Shell): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${s.title}</title>
</head>
<body style="margin:0;padding:0;background:${E.ground};font-family:${FONT};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${E.ground};">${s.preheader}${"&#8203;".repeat(60)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${E.ground};">
<tr><td align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="520" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${E.card};border-radius:12px;">
<tr><td style="padding:32px;">
<div style="font-size:18px;font-weight:600;line-height:1.35;color:${E.ink};padding-bottom:16px;">${s.heading}</div>
<div style="font-size:15px;line-height:1.55;color:${E.body};padding-bottom:24px;">${s.body}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="${E.accent}" style="border-radius:8px;mso-padding-alt:12px 22px;">
<a href="${s.cta.href}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:${E.onAccent};text-decoration:none;">${s.cta.label}</a>
</td>
</tr></table>
<div style="font-size:13px;line-height:1.55;color:${E.quiet};padding-top:24px;">${s.footnote}</div>
${s.aside ? `<div style="font-size:13px;line-height:1.55;color:${E.quiet};margin-top:24px;padding-top:24px;border-top:1px solid ${E.line};">${s.aside}</div>` : ""}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body></html>`;
}

function linkFallback(link: string): string {
  return `If the button does nothing, paste this into your browser:<br><span style="color:${E.accent};word-break:break-all;">${escapeHtml(link)}</span>`;
}

function verifyHtml(brand: string, link: string): string {
  const b = escapeHtml(brand);
  return shell({
    title: `Open your ${b} report`,
    preheader: "Confirming your address opens the placements and the full transcripts.",
    heading: `One click and your ${b} report opens`,
    body:
      "We ran the check, and the result is already on your page. Confirming " +
      "this address opens the rest: which of those pages you could be placed " +
      "into, and what each engine said word for word.",
    cta: { href: link, label: "Open the report" },
    footnote: linkFallback(link),
    aside: "If you did not ask for this, ignore it and nothing opens.",
  });
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
      subject: headerSafe(`Open your ${input.brand} report`),
      html: verifyHtml(input.brand, link),
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

/**
 * The headline is the sharpest number this product produces, so it is built
 * once and used by both the HTML and the plain-text part. The text part used
 * to drop it, which meant a client showing text only got the blandest
 * version of the one thing worth saying.
 */
function reportHeadline(brand: string, missed: number, total: number): string {
  return missed > 0
    ? `${missed} of the ${total} questions we asked came back without ${brand} in the answer.`
    : `We put ${total} buying-intent questions to the engines your buyers use.`;
}

function reportHtml(brand: string, link: string, missed: number, total: number): string {
  const b = escapeHtml(brand);
  return shell({
    title: `Your ${b} report is ready`,
    preheader: reportHeadline(b, missed, total),
    heading: `Your ${b} report is ready`,
    body:
      reportHeadline(b, missed, total) +
      " The report adds the pages you could be placed into, ranked by how many " +
      "answers a placement would win, and what each engine said word for word.",
    cta: { href: link, label: "Open your report" },
    footnote: "The link works on any device and does not expire. " + linkFallback(link),
  });
}

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
  missed: number;
  total: number;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[scan] RESEND_API_KEY is not set, report email not sent");
    return;
  }

  const link = `${siteUrl()}/scan/${input.publicToken}`;
  const subject = headerSafe(
    input.missed > 0
      ? `${input.missed} of ${input.total} AI answers did not name ${input.brand}`
      : `Your ${input.brand} report`,
  );

  try {
    const { error } = await new Resend(key).emails.send({
      from: process.env.SCAN_FROM_EMAIL ?? "alwayscited <onboarding@resend.dev>",
      to: input.email,
      subject,
      html: reportHtml(input.brand, link, input.missed, input.total),
      text: `${reportHeadline(input.brand, input.missed, input.total)}\n\nOpen your report: ${link}\n\nThe link works on any device and does not expire.`,
    });
    if (error) console.error("[scan] report email rejected", error);
  } catch (err) {
    console.error("[scan] report email failed", err instanceof Error ? err.message : err);
  }
}
