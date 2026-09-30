import "server-only";
import { Resend } from "resend";
import { CONTACT_EMAIL } from "@/config/contact";
import { mailFrom } from "@/config/mail-from";
import { headerSafe } from "@/lib/email-header";

/**
 * A member's ask from the dashboard (T11 /ask, 30 Sep 2026). To our contact
 * destination, or to the agency's contact when the account is in `agency`
 * mode (ask.ts askRecipient) - accounts.upsell_contact_email, which only
 * Nomada writes in /admin/tracking. Never to an address the request carries;
 * the member, a stored dashboard member, is the reply-to.
 *
 * Returns false rather than throwing; the route refuses the toast instead.
 */
export async function sendAsk(input: { agencyContact: string | null; replyTo: string; subject: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[app] RESEND_API_KEY is not set, ask not sent");
    return false;
  }
  try {
    const { error } = await new Resend(key).emails.send({
      from: mailFrom(),
      to: input.agencyContact ?? process.env.CONTACT_EMAIL_DESTINATION ?? CONTACT_EMAIL,
      replyTo: input.replyTo,
      subject: headerSafe(input.subject),
      text: input.text,
    });
    if (error) {
      console.error("[app] ask rejected", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[app] ask failed", err);
    return false;
  }
}
