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
 * Returns false rather than throwing. The request is already stored, so a
 * failed alert is recoverable from `walkthrough_requests.notified_at is null`.
 */
export async function sendWalkthroughAlert(input: {
  kind: "video" | "demo";
  email: string;
  domain: string;
  brand: string | null;
  topic: string | null;
  token: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[walkthrough] RESEND_API_KEY is not set, alert not sent");
    return false;
  }
  const what = input.kind === "video" ? "Loom walkthrough" : "demo call";
  const report = `${siteUrl()}/scan/${input.token}`;
  const text = [
    `${input.email} asked for a ${what} of alwaystracked.`,
    "",
    `Scanned: ${input.domain}${input.brand ? " (" + input.brand + ")" : ""}`,
    `Category: ${input.topic ?? "not confirmed"}`,
    `Their report: ${report}`,
    "",
    input.kind === "video"
      ? "Record the walkthrough against their report and reply to them with the link."
      : "Reply to them to find a time.",
  ].join("\n");
  try {
    const { error } = await new Resend(key).emails.send({
      from: mailFrom(),
      // The contact form's destination, so it lands where contact mail already
      // does. Never an address a caller supplied - theirs is the reply-to.
      to: process.env.CONTACT_EMAIL_DESTINATION ?? CONTACT_EMAIL,
      replyTo: input.email,
      subject: headerSafe(`Walkthrough request: ${what} for ${input.domain}`),
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
