import "server-only";
import { Resend } from "resend";
import { CONTACT_EMAIL } from "@/config/contact";
import { mailFrom } from "@/config/mail-from";
import { headerSafe } from "@/lib/email-header";

/**
 * The order email to Danny (pricing spec section 5, R91/C4, 30 Sep 2026).
 * Sent only from the Stripe webhook, after the signature is verified and the
 * event id recorded, so at most once per paid checkout. Always to our own
 * contact destination, never the buyer; theirs is the reply-to.
 *
 * Returns false rather than throwing: a lost alert must not undo a signup.
 */
export async function sendOrderEmail(input: { subject: string; text: string; replyTo: string | null }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[stripe] RESEND_API_KEY is not set, order email not sent");
    return false;
  }
  try {
    const { error } = await new Resend(key).emails.send({
      from: mailFrom(),
      to: process.env.CONTACT_EMAIL_DESTINATION ?? CONTACT_EMAIL,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      subject: headerSafe(input.subject),
      text: input.text,
    });
    if (error) {
      console.error("[stripe] order email rejected", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[stripe] order email failed", err);
    return false;
  }
}
