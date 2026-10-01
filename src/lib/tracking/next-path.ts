/**
 * Where a signed-out visitor was going (R164, 1 Oct 2026, danny.md line 173).
 *
 * Every /app page sends a visitor with no session to /app/login?next=<path>;
 * next rides the login email's link and the /app/auth POST, and the sign-in
 * lands there. It is a redirect target taken from a URL, so it is accepted
 * only as a path inside the dashboard: it starts `/app/`, and it carries no
 * `//`, no backslash (browsers read `\` as `/`), no scheme, no control
 * character. The login and auth pages themselves are refused, so a link can
 * never send its reader round in a loop. Anything else is null, and the
 * caller falls back to the client's dashboard.
 */
export const NEXT_MAX = 512;

export function safeNext(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw || raw.length > NEXT_MAX) return null;
  if (!raw.startsWith("/app/")) return null;
  if (raw.includes("//") || raw.includes("\\") || raw.includes(":") || /[\u0000-\u001f\u007f]/.test(raw)) return null;
  if (/^\/app\/(login|auth)(?:[/?#]|$)/.test(raw)) return null;
  return raw;
}

/** The login page for a signed-out visitor to `path` (with its query), carrying next when it is safe. */
export function loginHref(path: string, search: Record<string, string | string[] | undefined> = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    for (const one of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, one);
  }
  const qs = q.toString();
  const next = safeNext(qs ? `${path}?${qs}` : path) ?? safeNext(path);
  return next ? `/app/login?next=${encodeURIComponent(next)}` : "/app/login";
}
