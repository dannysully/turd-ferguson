import "server-only";
import { Resend } from "resend";
import { CONTACT_EMAIL } from "@/config/contact";
import { mailFrom } from "@/config/mail-from";
import { headerSafe } from "@/lib/email-header";
import { siteUrl } from "@/lib/scan/verify-email";

/**
 * The alert to Danny when somebody asks for a walkthrough. Internal only - it
 * goes to our own inbox, never to the visitor. Plain text on purpose: it is a
 * task, and the one thing in it that matters is the report link.
 *
 * Two callers since 28 September 2026: the result page (a scan, so `scan` is
 * set and the report link is the point) and the tier pages (no scan, so
 * `from` says which page asked).
 *
 * Returns false rather than throwing. The request is already stored, so a
 * failed alert is recoverable from `walkthrough_requests.notified_at is null`.
 */
export async function sendWalkthroughAlert(input: {
  kind: "video" | "demo";
  email: string;
  scan: { domain: string; brand: string | null; topic: string | null; token: string } | null;
  from?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[walkthrough] RESEND_API_KEY is not set, alert not sent");
    return false;
  }
  // The toggle's own labels (R176), so the subject says who picks it up.
  const what = input.kind === "video" ? "Loom with Luke" : "Demo with Danny";
  const scan = input.scan;
  const context = scan
    ? [
        `Scanned: ${scan.domain}${scan.brand ? " (" + scan.brand + ")" : ""}`,
        `Category: ${scan.topic ?? "not confirmed"}`,
        `Their report: ${siteUrl()}/scan/${scan.token}`,
      ]
    : [`Asked from: ${siteUrl()}${input.from ?? ""}`, "No scan yet."];
  const text = [
    `${input.email} asked for a ${input.kind === "video" ? "Loom walkthrough" : "demo call"} of alwaystracked (${what}).`,
    "",
    ...context,
    "",
    input.kind === "video"
      ? scan
        ? "Record the walkthrough against their report and reply to them with the link."
        : "Record a walkthrough of the platform and reply to them with the link."
      : "Reply to them to find a time.",
  ].join("\n");
  try {
    const { error } = await new Resend(key).emails.send({
      from: mailFrom(),
      // The contact form's destination, so it lands where contact mail already
      // does. Never an address a caller supplied - theirs is the reply-to.
      to: process.env.CONTACT_EMAIL_DESTINATION ?? CONTACT_EMAIL,
      replyTo: input.email,
      subject: headerSafe(`Walkthrough request: ${what} for ${scan ? scan.domain : input.email}`),
      text,
    });
    if (error) {
      console.error("[walkthrough] alert rejected", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[walkthrough] alert failed", err);
    return false;
  }
}
