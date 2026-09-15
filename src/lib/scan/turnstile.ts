import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Server-side Turnstile verification. Returns true only on an explicit success
 * from Cloudflare: a network failure is a failure, not a pass, or the bot
 * filter can be defeated by making the verify endpoint unreachable.
 */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // An unconfigured Turnstile is only allowed outside production, so that local
  // development works without a Cloudflare account.
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
