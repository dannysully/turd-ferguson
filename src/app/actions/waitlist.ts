"use server";

import { Resend } from "resend";

/**
 * Pre-launch capture, used only while the live scan is unconfigured.
 *
 * It deliberately produces no result of any kind. Showing an anonymous visitor
 * a fabricated verdict about their own brand is worse than showing them
 * nothing, so this takes the domain and the address and says plainly that a
 * person will run it.
 */
export type WaitlistResult = { ok: true } | { ok: false; message: string };

export async function requestScan(input: {
  domain: string;
  email: string;
  topic: string;
}): Promise<WaitlistResult> {
  const domain = input.domain.trim();
  const email = input.email.trim();

  if (!/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(domain)) {
    return { ok: false, message: "Enter a domain, like client-domain.com" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
    return { ok: false, message: "That email address does not look right." };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // No silent success. If we cannot record the request, we say so.
    console.error("[waitlist] RESEND_API_KEY is not set, request not recorded");
    return { ok: false, message: "We could not record that just now. Please email hello@alwayscited.com." };
  }

  try {
    /**
     * The SDK does not throw for a rejected send.
     *
     * A non-2xx, an unparseable error body and a failed fetch all resolve
     * with a null data and an error object, so the catch below covers almost
     * nothing and awaiting the call was never the same as checking it. An
     * unverified sending domain, a rate limit or a suppressed recipient came
     * back here as success, and this returned ok to a visitor whose request
     * had gone nowhere and whom nobody was going to email.
     *
     * The comment at the top of this file says no silent success, and this
     * was the one path in the tree that had one: the contact action and both
     * scan emails read the returned error already.
     */
    const dispatch = await new Resend(key).emails.send({
      from: process.env.SCAN_FROM_EMAIL ?? "alwayscited <onboarding@resend.dev>",
      to: process.env.CONTACT_EMAIL_DESTINATION ?? "hello@alwayscited.com",
      replyTo: email,
      subject: `Scan request: ${domain}`,
      text: [
        `Domain: ${domain}`,
        `Topic:  ${input.topic.trim() || "(not given)"}`,
        `Email:  ${email}`,
        "",
        "Sent from the domain field while the live scan is switched off.",
      ].join("\n"),
    });
    if (dispatch.error) {
      console.error("[waitlist] send rejected", dispatch.error);
      return { ok: false, message: "We could not record that just now. Please email hello@alwayscited.com." };
    }
  } catch (e) {
    console.error("[waitlist] send failed", e);
    return { ok: false, message: "We could not record that just now. Please email hello@alwayscited.com." };
  }

  return { ok: true };
}
