"use server";

import { Resend } from "resend";

import { CONTACT_LIMITS as LIMITS } from "@/config/contact";
import { isPlausibleEmail } from "@/lib/email-address";
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

/**
 * What was typed, handed back so an error does not destroy it.
 *
 * React resets a `<form action={fn}>` on every submission, and it is not
 * conditional on the action succeeding: `startHostTransition` in the shipped
 * react-dom calls `requestFormReset` before it calls the action at all, the
 * form fiber gets flag 1024, and the root's mutation commit ends in
 * `recursivelyResetForms`, which calls `form.reset()`. So every error return
 * below used to wipe all four fields - and the worst of them is the one that
 * says "please email hello@alwayscited.com directly", which deletes the
 * message at the moment it tells somebody to send it somewhere else.
 *
 * The reset restores each field to its `defaultValue`, and the commit order is
 * what makes echoing work rather than a guess: host props are written by
 * `commitHostUpdate` earlier in the same mutation pass than the reset runs, so
 * a `defaultValue` fed from this state is already on the node when `reset()`
 * reads it. ContactForm does exactly that.
 *
 * Bounded on the way out, for the same reason `website` is bounded on the way
 * to the log. A real visitor can never trip this - the inputs carry
 * CONTACT_LIMITS as maxLength, so the over-length branches below are only
 * reachable by a post that never rendered the page - but that post is the one
 * this echoes back into HTML, and an unbounded reflection is paid for by the
 * megabyte whether or not React escapes it.
 */
export type ContactValues = { name: string; email: string; company: string; message: string };

export type ContactFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; values: ContactValues };

const clamp = (v: string | undefined, max: number) => (v ?? "").slice(0, max);

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const company = formData.get("company")?.toString().trim();
  const website = formData.get("website")?.toString().trim();
  const message = formData.get("message")?.toString().trim();

  // Built once, before the first refusal, so no branch below can be the one
  // that forgot. The honeypot is deliberately not in it: nothing renders that
  // field with a value, and echoing a bot's own string back at it is the tell
  // the success return two screens down exists to withhold.
  const values: ContactValues = {
    name: clamp(name, LIMITS.name),
    email: clamp(email, LIMITS.email),
    company: clamp(company, LIMITS.company),
    message: clamp(message, LIMITS.message),
  };

  if (!name || !email || !message) {
    return { status: "error", message: "Name, email, and message are required.", values };
  }

  // Bounded before the regex, because the regex is two unbounded runs either
  // side of an @ and will happily accept a megabyte of them. This is the field
  // that becomes a header rather than a body line, and it was the one field
  // the comment above promised was bounded and was not.
  if (email.length > LIMITS.email) {
    return { status: "error", message: "That email address is longer than an address can be.", values };
  }

  // The shared, tested check rather than a fourth private pattern. This copy was
  // the laxest of the three - it took `me@example.c0m` and `me@example.x`, which
  // the two funnel doors refused - and the merge narrows it to their rule while
  // widening all three to a TLD that is not ASCII. See @/lib/email-address.
  if (!isPlausibleEmail(email)) {
    return { status: "error", message: "Please enter a valid email address.", values };
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
    // Bounded at the log rather than refused above it. Refusing an oversized
    // honeypot would answer a bot with an error that no human submission can
    // produce, which tells whoever is probing exactly which field gave them
    // away - the thing the success return below exists to avoid. email is
    // already bounded by the check above this one; website was not bounded
    // anywhere, on either side, and it is attacker-controlled by definition.
    console.warn("[contact] honeypot filled, not sending", {
      email,
      website: website.slice(0, LIMITS.website),
    });
    return { status: "success" };
  }

  if (name.length > LIMITS.name) {
    return { status: "error", message: "That name is longer than we can send. Please shorten it.", values };
  }
  if (company && company.length > LIMITS.company) {
    return { status: "error", message: "That agency name is longer than we can send. Please shorten it.", values };
  }
  if (message.length > LIMITS.message) {
    return {
      status: "error",
      message:
        "That message is over " +
        LIMITS.message +
        " characters. Send the short version and we will ask for the rest.",
      values,
    };
  }

  /**
   * Every exit below this line is the same sentence to the visitor and, until
   * now, nothing at all to us.
   *
   * A form that stops delivering looks identical from outside to one that
   * never gets used: the sender is told to email us directly, they do or they
   * do not, and no line anywhere records that the route is broken. This is the
   * silent-failure path AGENTS.md warns about, on the one form on the site.
   * The reasons are distinguishable and worth distinguishing - a key that is
   * not set is a deploy, a Resend error is a sending domain or a revoked key,
   * and a throw is neither.
   */
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[contact] RESEND_API_KEY is not set, so an enquiry could not be sent");
    return {
      status: "error",
      message:
        "We could not send that just now. Please email hello@alwayscited.com directly and we will pick it up.",
      values,
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
        // No Website line. That field is the honeypot and a filled one never
        // reaches here, so the line could only ever read "not given" - which
        // reads as an enquirer who declined to give one, on a form that has
        // never asked.
        "",
        message,
      ].join("\n"),
    });
    if (error) {
      console.error("[contact] Resend refused an enquiry: " + (error.message || error.name));
      return {
        status: "error",
        message:
          "We could not send that just now. Please email hello@alwayscited.com directly and we will pick it up.",
        values,
      };
    }
  } catch (err) {
    console.error("[contact] could not send an enquiry: " + ((err as Error)?.message ?? "unknown"));
    return {
      status: "error",
      message:
        "We could not send that just now. Please email hello@alwayscited.com directly and we will pick it up.",
      values,
    };
  }

  return { status: "success" };
}
