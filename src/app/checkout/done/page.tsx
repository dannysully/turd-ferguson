import type { Metadata } from "next";

import { CONTACT_EMAIL } from "@/config/contact";
import { MICRO, SHELL, T } from "@/config/tokens";

export const dynamic = "force-dynamic";

/** After Stripe - noindex here, in the /checkout header rule and in robots.txt. */
export const metadata: Metadata = {
  title: "Next step: your onboarding call",
  robots: { index: false, follow: false },
};

/**
 * Where Stripe returns a buyer (R91, pricing spec section 5). It reads
 * nothing: the Session id in the URL is not looked up, so the page does not
 * claim the payment went through - Stripe's receipt does that. The
 * onboarding call is booked by reply until a booking flow exists (pricing.ts:
 * one destination for every CTA), so the page says who writes and where.
 */
export default function CheckoutDone() {
  return (
    <section style={{ ...SHELL, maxWidth: "640px", paddingTop: "48px", paddingBottom: "96px" }}>
      <div style={MICRO}>Checkout</div>
      <h1 style={{ margin: "10px 0 0", fontSize: "32px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, color: T.ink }}>
        Thank you. Next, the onboarding call.
      </h1>
      <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.7, color: T.soft }}>
        Stripe emails your receipt. We will email you to book the onboarding call, where we agree the prompts for
        each keyword before anything runs.
      </p>
      <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.7, color: T.soft }}>
        Anything before then: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: T.accent }}>{CONTACT_EMAIL}</a>.
      </p>
    </section>
  );
}
