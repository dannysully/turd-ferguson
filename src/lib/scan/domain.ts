/**
 * Domain normalisation. Trim FIRST, then strip scheme, credentials, www, port
 * and path, so that padded input like "  https://WWW.Example.com/about " does
 * not leave a fragment of the scheme behind.
 */
export function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  d = d.replace(/^[^/@]*@/, "");
  d = d.split(/[/?#]/)[0];
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
