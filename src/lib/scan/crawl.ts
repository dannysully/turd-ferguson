import "server-only";

/** Paths worth reading beyond the homepage, in the order we prefer them. */
const INTERESTING = /\/(about|services|what-we-do|solutions|sectors|industries)/i;

const PAGE_BYTE_CAP = 200 * 1024;
const TOTAL_BUDGET_MS = 8_000;
const MAX_EXTRA_PAGES = 5;

export class UnreachableDomain extends Error {
  constructor(domain: string) {
    super(`could not read ${domain}`);
    this.name = "UnreachableDomain";
  }
}

async function getText(url: string, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal,
      redirect: "follow",
      headers: { "user-agent": "alwayscited-scan/1.0 (+https://alwayscited.com)" },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) return null;

    // Cap the read rather than trusting content-length.
    const buf = await res.arrayBuffer();
    return new TextDecoder().decode(buf.slice(0, PAGE_BYTE_CAP));
  } catch {
    return null;
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

function sameHostLinks(html: string, domain: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const href = m[1];
    if (!INTERESTING.test(href)) continue;
    try {
      const url = new URL(href, `https://${domain}/`);
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
 * Read the homepage plus up to five "about us" style pages, within one 8 second
 * budget for the whole operation. Throws UnreachableDomain when the homepage
 * yields nothing usable, which is a failed scan rather than an empty result.
 */
export async function readSite(domain: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOTAL_BUDGET_MS);

  try {
    let html: string | null = null;
    for (const scheme of ["https", "http"]) {
      html = await getText(`${scheme}://${domain}/`, controller.signal);
      if (html) break;
    }
    if (!html) throw new UnreachableDomain(domain);

    const parts = [toProse(html)];
    const links = sameHostLinks(html, domain);

    // Remaining pages share whatever is left of the budget, in parallel.
    const extra = await Promise.all(links.map((u) => getText(u, controller.signal)));
    for (const page of extra) {
      if (page) parts.push(toProse(page));
    }

    const text = parts.filter(Boolean).join("\n\n").slice(0, 60_000);
    if (text.length < 200) throw new UnreachableDomain(domain);
    return text;
  } finally {
    clearTimeout(timer);
  }
}
