/**
 * R162 (1 Oct 2026, danny.md line 171): is this request a prefetch or an RSC
 * fetch rather than a page the visitor opened? Next's <Link> prefetches its
 * target on sight; when that target was /admin, proxy.ts answered 401 with
 * WWW-Authenticate and Chrome put its native sign-in box over a client's
 * dashboard. proxy.ts answers these with a bare 404 unless they already carry
 * the admin credentials. Plain standard-library code, so the test can import it.
 *
 * Next deletes its own flight headers (`RSC`, `Next-Router-Prefetch`) before
 * proxy runs (next/dist/server/web/adapter.js, FLIGHT_HEADERS), so they are
 * checked only in case that changes. What does reach proxy is the browser's
 * `Sec-Fetch-Mode`: a page someone opened is `navigate`, and every fetch -
 * prefetch, RSC or otherwise - is not. A client without it (curl, an old
 * browser) is treated as a page and still challenged.
 */
export function isPrefetch(get: (name: string) => string | null): boolean {
  const mode = get("sec-fetch-mode");
  if (mode !== null && mode !== "navigate") return true;
  if (get("next-router-prefetch") !== null) return true;
  if (get("rsc") !== null) return true;
  // `Purpose` is the old prefetch hint; `Sec-Purpose` is Chrome's speculation rules.
  return [get("purpose"), get("sec-purpose")].some((v) => v !== null && /\bprefetch\b/i.test(v));
}
