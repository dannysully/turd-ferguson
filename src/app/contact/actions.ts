"use server";

import { Resend } from "resend";

/**
 * Contact form submission. This previously logged to the server console behind
 * a TODO, which silently dropped every enquiry while the whole site pointed
 * its CTAs here. It now sends, and reports an error rather than a false
 * success when sending is not configured.
 */

const CONTACT_EMAIL_DESTINATION =
  process.env.CONTACT_EMAIL_DESTINATION ?? "hello@alwayscited.com";
const FROM = process.env.SCAN_FROM_EMAIL ?? "alwayscited <onboarding@resend.dev>";

export type ContactFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const company = formData.get("company")?.toString().trim();
  const website = formData.get("website")?.toString().trim();
  const message = formData.get("message")?.toString().trim();

  if (!name || !email || !message) {
    return { status: "error", message: "Name, email, and message are required." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      status: "error",
      message:
        "We could not send that just now. Please email hello@alwayscited.com directly and we will pick it up.",
    };
  }

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: FROM,
      to: CONTACT_EMAIL_DESTINATION,
      replyTo: email,
      subject: `Contact form: ${name}`,
      text: [
        `Name:    ${name}`,
        `Email:   ${email}`,
        `Company: ${company || "not given"}`,
        `Website: ${website || "not given"}`,
        "",
        message,
      ].join("\n"),
    });
    if (error) {
      return {
        status: "error",
        message:
          "We could not send that just now. Please email hello@alwayscited.com directly and we will pick it up.",
      };
    }
  } catch {
    return {
      status: "error",
      message:
        "We could not send that just now. Please email hello@alwayscited.com directly and we will pick it up.",
    };
  }

  return { status: "success" };
}
