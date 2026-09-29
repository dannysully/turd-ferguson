import { createHash, randomBytes } from "node:crypto";

/**
 * The dashboard's own login - T3 of docs/tracked-dashboard-2026-09-29/BRIEF.md
 * decision 2 (Danny, 29 Sep 2026): an email magic link through Resend, not
 * Supabase Auth, so no dashboard config, no SMTP credential and no auth-schema
 * change. Everything decidable without a socket is here, where
 * `session.test.mts` runs it; imports are relative for `node --test`.
 */

/** A login link lasts 15 minutes and works once. */
export const LOGIN_TTL_MS = 15 * 60 * 1000;

/** A session is a 30-day cookie. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Link requests per hour: 5 per email, 20 per hashed IP. */
export const LOGIN_PER_EMAIL_PER_HOUR = 5;
export const LOGIN_PER_IP_PER_HOUR = 20;

export const SESSION_COOKIE = "ac_session";

/** What the login page always says, member or not - it never discloses membership. */
export const LOGIN_SENT = "If that address has access, we've sent a link.";

/** 32 random bytes, hex. Only its sha256 is ever stored. */
export function newToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 32 bytes as hex. */
export const TOKEN_CHARS = 64;

/** A token as it arrives in a URL or form: 64 hex characters, or nothing. */
export function isTokenShape(token: unknown): token is string {
  return typeof token === "string" && token.length === TOKEN_CHARS && /^[0-9a-f]+$/.test(token);
}

/** May another link be sent? Counts are this hour's requests so far. */
export function mayRequestLink(emailCount: number, ipCount: number): boolean {
  return emailCount < LOGIN_PER_EMAIL_PER_HOUR && ipCount < LOGIN_PER_IP_PER_HOUR;
}

/** A login token row is usable once, before it expires. */
export function tokenUsable(row: { expires_at: string; used_at: string | null } | null, now: number = Date.now()): boolean {
  return !!row && row.used_at === null && Date.parse(row.expires_at) > now;
}

/** The cookie's attributes: httpOnly, Secure, SameSite=Lax, 30 days, whole site. */
export function sessionCookie(value: string) {
  return {
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
