import type { Metadata } from "next";

import { CONTACT_EMAIL } from "@/config/contact";
import { MICRO, SHELL, T } from "@/config/tokens";

export const dynamic = "force-dynamic";

/** After Stripe - noindex here, in the /checkout header rule and in robots.txt. */
export const metadata: Metadata = {
  title: "Next step after checkout",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ plan?: string | string[]; from?: string | string[] }> };

const P = { margin: "14px 0 0", fontSize: "15px", lineHeight: 1.7, color: T.soft } as const;

/**
 * Where Stripe returns a buyer (R91, pricing spec section 5). It reads
 * nothing: the Session id in the URL is not looked up, so the page does not
 * claim the payment went through - Stripe's receipt does that. The
 * onboarding call is booked by reply until a booking flow exists (pricing.ts:
 * one destination for every CTA), so the page says who writes and where.
 *
 * R148 pass 8 (1 Oct 2026): an order carrying a scan (from=scan, set in
 * session.ts) has its dashboard built by the webhook, which emails the owner
 * a sign-in link (signup.ts). The page said only "the onboarding call", so a
 * buyer had no sign it existed and no way to it. Those orders now name the
 * link and get one way on, /app/login, which sends a fresh one. plan and from
 * only choose copy; anyone can type them, and nothing is read or written.
 */
export default async function CheckoutDone({ searchParams }: Props) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const fromScan = one(sp.from) === "scan";
  const tracked = one(sp.plan) === "tracked";

  return (
    <section style={{ ...SHELL, maxWidth: "640px", paddingTop: "48px", paddingBottom: "96px" }}>
      <div style={MICRO}>Checkout</div>
      <h1 style={{ margin: "10px 0 0", fontSize: "32px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, color: T.ink }}>
        {fromScan ? "Thank you. Your dashboard is being set up." : "Thank you. Next, the onboarding call."}
      </h1>
      {fromScan ? (
        <>
          <p style={P}>
            Stripe emails your receipt. We are setting up your dashboard from your scan and sending a sign-in link to
            your work email. The first check runs tomorrow.
          </p>
          {!tracked && (
            <p style={P}>We will also email you to book the onboarding call, where we agree the prompts for each keyword.</p>
          )}
          <p style={{ margin: "24px 0 0" }}>
            <a
              href="/app/login"
              style={{ display: "inline-block", padding: "12px 16px", borderRadius: "10px", background: T.accent, color: "#ffffff", fontWeight: 600, fontSize: "15px", textDecoration: "none" }}
            >
              Go to sign in
            </a>
          </p>
          <p style={{ ...P, fontSize: "14px" }}>No email after a few minutes? Sign in asks for a new link.</p>
        </>
      ) : (
        <p style={P}>
          Stripe emails your receipt. We will email you to book the onboarding call, where we agree the prompts for
          each keyword before anything runs.
        </p>
      )}
      <p style={P}>
        Anything before then: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: T.accent }}>{CONTACT_EMAIL}</a>.
      </p>
    </section>
  );
}
