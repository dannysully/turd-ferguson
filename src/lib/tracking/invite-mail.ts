import "server-only";
import { Resend } from "resend";
import { mailFrom } from "@/config/mail-from";
import { headerSafe } from "@/lib/email-header";

/**
 * The team invite (R142 part 2, 1 Oct 2026; BRIEF-4 P2). Sent only by the
 * member route after the session, membership and owner role are checked and
 * the row is written, capped at INVITES_PER_OWNER_PER_DAY (team.ts). Plain
 * text from team.ts inviteMail; no login token - the invitee signs in the
 * normal way, which mails only a stored member.
 *
 * Returns false rather than throwing; the member is already on the team, so a
 * failed send is logged, and they can still sign in.
 */
export async function sendInvite(input: { to: string; replyTo: string; subject: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[app] RESEND_API_KEY is not set, invite not sent");
    return false;
  }
  try {
    const { error } = await new Resend(key).emails.send({
      from: mailFrom(),
      to: input.to,
      replyTo: input.replyTo,
      subject: headerSafe(input.subject),
      text: input.text,
    });
    if (error) {
      console.error("[app] invite rejected", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[app] invite failed", err);
    return false;
  }
}
