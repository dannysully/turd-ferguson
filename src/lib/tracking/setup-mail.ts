import "server-only";
import { Resend } from "resend";
import { CONTACT_EMAIL } from "@/config/contact";
import { mailFrom } from "@/config/mail-from";
import { headerSafe } from "@/lib/email-header";

/**
 * Setup confirmed (R166 step 4, Danny, danny.md line 175): one internal
 * message to our own contact destination when a client's owner or editor
 * presses Confirm on /app/[client]/setup - never to the client. Sent only by
 * the setup route, after it writes the one setup_confirmed row; a client
 * already confirmed writes nothing and sends nothing, so it is once a client.
 * The member is the reply-to.
 *
 * Returns false rather than throwing; the confirm stands either way.
 */
export async function sendSetupConfirmed(input: {
  domain: string;
  slug: string;
  tier: string;
  member: string;
  /** R166 part 5: a keyword a setup card checked and passed, verified by the route; not yet set on the cluster. */
  checked?: { cluster: string; keyword: string; volume: number; intent: string } | null;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[app] RESEND_API_KEY is not set, setup mail not sent");
    return false;
  }
  try {
    const { error } = await new Resend(key).emails.send({
      from: mailFrom(),
      to: process.env.CONTACT_EMAIL_DESTINATION ?? CONTACT_EMAIL,
      replyTo: input.member,
      subject: headerSafe(`Setup confirmed: ${input.domain}`),
      text: [
        `${input.member} confirmed setup for ${input.domain} (tier: ${input.tier}).`,
        "",
        `Their clusters and prompts are as shown on /app/${input.slug}/clusters and in /admin/tracking.`,
        ...(input.checked
          ? [
              "",
              `They checked a keyword for the cluster "${input.checked.cluster}": ${input.checked.keyword} (${input.checked.volume.toLocaleString("en-GB")} searches a month, ${input.checked.intent} intent). It passed; set it on the cluster by hand.`,
            ]
          : []),
      ].join("\n"),
    });
    if (error) {
      console.error("[app] setup mail rejected", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[app] setup mail failed", err);
    return false;
  }
}
