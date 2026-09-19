/**
 * Domain normalisation. Trim FIRST, then strip scheme, then cut everything
 * from the first path, query or fragment character, and only then strip
 * credentials, port and www - so that padded input like
 * "  https://WWW.Example.com/about " does not leave a fragment of the scheme
 * behind.
 *
 * The order of those middle two steps is load-bearing and it used to be the
 * other way round. Userinfo is everything before an "@" that contains no "/",
 * and a query string is allowed to contain an "@" - so on
 * "https://example.com?email=me@other.com" the credential strip matched
 * "example.com?email=me@" and left "other.com". The function returned a
 * different company's domain, silently and plausibly: no error, no warning,
 * and isPlausibleDomain says yes to it. Down the visitor path that is a scan
 * run and billed against a site they did not type; down the citation path in
 * engines.ts it files a source under the wrong host, which moves the
 * leaderboard. RFC 3986 does not allow "/", "?" or "#" inside userinfo
 * unencoded, so cutting at the first of them first cannot lose a real
 * credential - "https://user:pass@example.com/path" still normalises to
 * example.com.
 */
export function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  d = d.split(/[/?#]/)[0];
  d = d.replace(/^[^/@]*@/, "");
  d = d.replace(/:\d+$/, "");
  d = d.replace(/^www\./, "");
  return d.replace(/\.$/, "");
}

/** A conservative hostname check: at least one dot, valid labels, plausible TLD. */
export function isPlausibleDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  if (!/^[a-z0-9.-]+$/.test(domain)) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (labels.some((l) => l.length === 0 || l.length > 63 || l.startsWith("-") || l.endsWith("-"))) {
    return false;
  }
  const tld = labels[labels.length - 1];
  return /^[a-z]{2,}$/.test(tld);
}

/** Markets the free scan supports, and their Google location codes. */
export const MARKETS = {
  UK: { location_code: 2826, label: "United Kingdom" },
  US: { location_code: 2840, label: "United States" },
} as const;

export type Market = keyof typeof MARKETS;

export function isMarket(v: unknown): v is Market {
  return v === "UK" || v === "US";
}
