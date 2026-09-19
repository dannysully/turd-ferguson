"use server";

import { Resend } from "resend";

import { CONTACT_LIMITS as LIMITS } from "@/config/contact";
import { headerSafe } from "@/lib/email-header";

/**
 * Contact form submission. This previously logged to the server console behind
 * a TODO, which silently dropped every enquiry while the whole site pointed
 * its CTAs here. It now sends, and reports an error rather than a false
 * success when sending is not configured.
 *
 * Every value below is typed by a stranger into a form with no captcha, so it
 * is treated as hostile: the subject goes through headerSafe, and each field
 * is bounded before it is put in a message.
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

  /**
   * The honeypot.
   *
   * This action has always read a `website` field that the form has never
   * rendered, so it reported "not given" on every enquiry ever sent. The form
   * renders it now, hidden, and a filled one is an automated submission: no
   * human can see the field, let alone type in it.
   *
   * It answers the bot with a success rather than an error, because an error
   * tells whoever is probing which field gave them away.
   *
   * It is logged. A hidden field that silently eats a real enquiry is exactly
   * the failure mode that looks identical to working, so if a browser ever
   * autofills this despite the guards, the evidence is in the function log
   * rather than nowhere.
   */
  if (website) {
    console.warn("[contact] honeypot filled, not sending", { email, website });
    return { status: "success" };
  }

  if (name.length > LIMITS.name) {
    return { status: "error", message: "That name is longer than we can send. Please shorten it." };
  }
  if (company && company.length > LIMITS.company) {
    return { status: "error", message: "That agency name is longer than we can send. Please shorten it." };
  }
  if (message.length > LIMITS.message) {
    return {
      status: "error",
      message:
        "That message is over " +
        LIMITS.message +
        " characters. Send the short version and we will ask for the rest.",
    };
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
      subject: headerSafe(`Contact form: ${name}`),
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
