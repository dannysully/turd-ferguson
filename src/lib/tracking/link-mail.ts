import "server-only";
import { Resend } from "resend";
import { CONTACT_EMAIL } from "@/config/contact";
import { mailFrom } from "@/config/mail-from";
import { headerSafe } from "@/lib/email-header";

/**
 * The Sunday link check's alert (BRIEF-2 T12, R96, 30 Sep 2026): one message
 * per client per Sunday run, listing the placements whose link went, to our
 * own contact destination only - never a client or a publisher. Sent from the
 * tracking runner, which only the cron's signed dispatch starts.
 *
 * Returns false rather than throwing; the rows are flagged either way.
 */
export async function sendLinkAlerts(input: { domain: string; lines: string[] }): Promise<boolean> {
  if (!input.lines.length) return true;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[track] RESEND_API_KEY is not set, link alert not sent");
    return false;
  }
  try {
    const { error } = await new Resend(key).emails.send({
      from: mailFrom(),
      to: process.env.CONTACT_EMAIL_DESTINATION ?? CONTACT_EMAIL,
      subject: headerSafe(`Placement link check: ${input.lines.length} to look at for ${input.domain}`),
      text: [`The Sunday link check found ${input.lines.length} placement${input.lines.length === 1 ? "" : "s"} to look at for ${input.domain}:`, "", ...input.lines.map((l) => `- ${l}`), "", "Status is unchanged; the rows are flagged in /admin/tracking."].join("\n"),
    });
    if (error) {
      console.error("[track] link alert rejected", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[track] link alert failed", err);
    return false;
  }
}
