import "server-only";

/** Paths worth reading beyond the homepage, in the order we prefer them. */
const INTERESTING = /\/(about|services|what-we-do|solutions|sectors|industries)/i;

const PAGE_BYTE_CAP = 200 * 1024;
const TOTAL_BUDGET_MS = 8_000;
const MAX_EXTRA_PAGES = 5;

/**
 * Why a site could not be read.
 *
 * These were one undifferentiated condition until 19 Sep 2026, and the start
 * route rendered every one of them as "Check the address and try again." Three
 * of the five are not the address being wrong, so that sentence sent a visitor
 * whose site is perfectly fine to go and correct something correct - which
 * leaves them nowhere to go, on the first thing anyone does on the site.
 *
 * It cost the log too. A class of site failing in the funnel and a handful of
 * people mistyping produced the same line.
 */
export type ReadFailure =
  /** Nothing answered on either scheme. The address really is the problem. */
  | "dns"
  /** It answered and refused us. A bot filter or a WAF, usually a 403. */
  | "blocked"
  /** The budget ran out before it answered. A slow site, not a wrong one. */
  | "timeout"
  /** It answered with something that is not a web page. */
  | "not_html"
  /** We read it, and there was too little prose to name a brand from. */
  | "too_thin";

export class UnreachableDomain extends Error {
  readonly reason: ReadFailure;
  /** The status it refused us with, where there was one. */
  readonly status?: number;

  constructor(domain: string, reason: ReadFailure, status?: number) {
    super(`could not read ${domain}: ${reason}`);
    this.name = "UnreachableDomain";
    this.reason = reason;
    this.status = status;
  }
}

/**
 * A read either produced a page or it did not, and when it did not the reason
 * is the whole point: it is what separates a wrong address from a site that is
 * up and behind a bot filter.
 */
type Fetched =
  | { ok: true; html: string }
  | { ok: false; why: "status"; status: number }
  | { ok: false; why: "not_html" }
  | { ok: false; why: "network" };

async function getText(url: string, signal: AbortSignal): Promise<Fetched> {
  try {
    const res = await fetch(url, {
      signal,
      redirect: "follow",
      headers: { "user-agent": "alwayscited-scan/1.0 (+https://alwayscited.com)" },
    });
    if (!res.ok) return { ok: false, why: "status", status: res.status };
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) return { ok: false, why: "not_html" };

    // Cap the read rather than trusting content-length.
    const buf = await res.arrayBuffer();
    return { ok: true, html: new TextDecoder().decode(buf.slice(0, PAGE_BYTE_CAP)) };
  } catch {
    return { ok: false, why: "network" };
  }
}

/** Strip scripts, styles and tags, leaving readable prose. */
function toProse(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Internal links worth following, resolved against the URL that actually
 * answered rather than a hardcoded https. Built against https unconditionally,
 * every extra page on an http-only site resolved to the scheme that had just
 * failed, so the five "about us" reads were thrown away on exactly the sites
 * least likely to have much on the homepage.
 */
function sameHostLinks(html: string, domain: string, base: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const href = m[1];
    if (!INTERESTING.test(href)) continue;
    try {
      const url = new URL(href, base);
      if (url.hostname.replace(/^www\./, "") !== domain) continue;
      url.hash = "";
      out.add(url.toString());
    } catch {
      // Ignore unparseable hrefs.
    }
  }
  return [...out].slice(0, MAX_EXTRA_PAGES);
}

/**
 * Which failure to report when the homepage never arrived.
 *
 * An expired budget outranks whatever the individual attempts said: once the
 * controller has fired, every fetch after it rejects instantly, so their
 * reasons describe the abort rather than the site.
 */
function failureFor(
  domain: string,
  signal: AbortSignal,
  first: Exclude<Fetched, { ok: true }> | null,
): UnreachableDomain {
  if (signal.aborted) return new UnreachableDomain(domain, "timeout");
  if (first?.why === "status") return new UnreachableDomain(domain, "blocked", first.status);
  if (first?.why === "not_html") return new UnreachableDomain(domain, "not_html");
  return new UnreachableDomain(domain, "dns");
}

/**
 * Read the homepage plus up to five "about us" style pages, within one 8 second
 * budget for the whole operation. Throws UnreachableDomain when the homepage
 * yields nothing usable, carrying the reason so the caller can say which of the
 * five things went wrong rather than blaming the address for all of them.
 */
export async function readSite(domain: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOTAL_BUDGET_MS);

  try {
    let html: string | null = null;
    let base = `https://${domain}/`;
    let firstFailure: Exclude<Fetched, { ok: true }> | null = null;

    for (const scheme of ["https", "http"] as const) {
      const url = `${scheme}://${domain}/`;
      const got = await getText(url, controller.signal);
      if (got.ok) {
        html = got.html;
        base = url;
        break;
      }
      // The https attempt is the one worth reporting: it is what a visitor
      // means by their address, and an http retry against a host that just
      // refused us only repeats the refusal.
      firstFailure ??= got;
    }

    if (!html) throw failureFor(domain, controller.signal, firstFailure);

    const parts = [toProse(html)];
    const links = sameHostLinks(html, domain, base);

    // Remaining pages share whatever is left of the budget, in parallel.
    const extra = await Promise.all(links.map((u) => getText(u, controller.signal)));
    for (const page of extra) {
      if (page.ok) parts.push(toProse(page.html));
    }

    const text = parts.filter(Boolean).join("\n\n").slice(0, 60_000);
    if (text.length < 200) throw new UnreachableDomain(domain, "too_thin");
    return text;
  } finally {
    clearTimeout(timer);
  }
}
