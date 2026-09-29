/**
 * The one request this site makes to Stripe: create a Checkout Session
 * (R91, Danny, 29 Sep 2026; danny.md 91).
 *
 * The key is read from `process.env` at call time and goes nowhere but the
 * Authorization header - never logged, never returned. Creating a Session
 * bills nobody: Stripe charges when a buyer pays, on its own form, so this is
 * not on the vendor list in `spenders.mts` (which lists what bills us per
 * request). `fetchImpl` is there so the tests never reach Stripe.
 */

export type SessionResult = { ok: true; url: string } | { ok: false; reason: "no_key" | "refused" | "unreachable"; status?: number; code?: string };

export async function createCheckoutSession(form: URLSearchParams, fetchImpl: typeof fetch = fetch): Promise<SessionResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, reason: "no_key" };
  let res: Response;
  try {
    res = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  const body = (await res.json().catch(() => null)) as { url?: unknown; error?: { code?: unknown; type?: unknown } } | null;
  if (!res.ok || typeof body?.url !== "string" || !body.url.startsWith("https://checkout.stripe.com/")) {
    const code = body?.error?.code ?? body?.error?.type;
    return { ok: false, reason: "refused", status: res.status, code: typeof code === "string" ? code : undefined };
  }
  return { ok: true, url: body.url };
}
