/**
 * What a login link is worth when it is opened (R163, 1 Oct 2026, danny.md
 * line 172), pure. /app/auth reads it on the GET, without spending the
 * token, to choose between opening the dashboard on its own and saying the
 * link is spent with a one-click new one.
 */
export type LinkState = { state: "fresh"; email: string } | { state: "spent"; email: string } | { state: "unknown" };

/** A token row as dashboard_login_tokens holds it, or null when no row matches. */
export function linkState(row: { email: string; used_at: string | null; expires_at: string } | null, now: Date): LinkState {
  if (!row) return { state: "unknown" };
  // Expired and used read the same to the visitor: the way on is a new link either way.
  if (row.used_at !== null || Date.parse(row.expires_at) <= now.getTime()) return { state: "spent", email: row.email };
  return { state: "fresh", email: row.email };
}

/**
 * The fixture's links, so e2e can open each state without a database. Any
 * other well-shaped token is fresh. Never consulted outside fixture mode.
 */
export const FIXTURE_LINKS = {
  spent: "5".repeat(64),
  expired: "e".repeat(64),
} as const;

export function fixtureLinkState(token: string, email: string): LinkState {
  if (token === FIXTURE_LINKS.spent) return linkState({ email, used_at: "2026-10-01T00:00:00Z", expires_at: "2999-01-01T00:00:00Z" }, new Date());
  if (token === FIXTURE_LINKS.expired) return linkState({ email, used_at: null, expires_at: "2000-01-01T00:00:00Z" }, new Date());
  return { state: "fresh", email };
}
