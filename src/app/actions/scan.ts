"use server";

import { Resend } from "resend";

/**
 * Scan request submission.
 *
 * The scan backend does not exist yet, so this collects the request and emails
 * it to us rather than rendering a result. Nothing is estimated and no figure
 * is shown to the user - the report is produced by hand until the aggregate
 * endpoints are live.
 *
 * If RESEND_API_KEY is unset the action returns an error the user can act on.
 * It never reports success for a submission that went nowhere.
 */

const DESTINATION = process.env.CONTACT_EMAIL_DESTINATION ?? "hello@alwayscited.com";
const FROM = process.env.SCAN_FROM_EMAIL ?? "alwayscited <onboarding@resend.dev>";

export type ScanState =
  | { status: "idle" }
  | { status: "success"; email: string }
  | { status: "error"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitScanRequest(
  _prev: ScanState,
  formData: FormData
): Promise<ScanState> {
  const domain = formData.get("domain")?.toString().trim() ?? "";
  const topic = formData.get("topic")?.toString().trim() ?? "";
  const market = formData.get("market")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";

  if (!domain || !topic || !email) {
    return { status: "error", message: "We need the domain, the topic and your email." };
  }
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "That email address does not look right." };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      status: "error",
      message:
        "We could not submit that just now. Email hello@alwayscited.com with the domain and topic and we will run it by hand.",
    };
  }

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: FROM,
      to: DESTINATION,
      replyTo: email,
      subject: `Scan request: ${domain}`,
      text: [
        `Domain: ${domain}`,
        `Topic:  ${topic}`,
        `Market: ${market || "not given"}`,
        `Email:  ${email}`,
      ].join("\n"),
    });
    if (error) {
      return {
        status: "error",
        message:
          "We could not submit that just now. Email hello@alwayscited.com with the domain and topic and we will run it by hand.",
      };
    }
  } catch {
    return {
      status: "error",
      message:
        "We could not submit that just now. Email hello@alwayscited.com with the domain and topic and we will run it by hand.",
    };
  }

  return { status: "success", email };
}
