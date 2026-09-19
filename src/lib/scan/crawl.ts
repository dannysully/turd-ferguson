import "server-only";

import { checkHost } from "./address";

/** Paths worth reading beyond the homepage, in the order we prefer them. */
const INTERESTING = /\/(about|services|what-we-do|solutions|sectors|industries)/i;

const PAGE_BYTE_CAP = 200 * 1024;
const TOTAL_BUDGET_MS = 8_000;
const MAX_EXTRA_PAGES = 5;

/**
 * Redirects followed per page, now that they are followed by hand.
 *
 * fetch would have followed twenty of them. Every hop is a fresh address that
 * has to be checked, and the chains a real site needs - http to https, apex to
 * www, a missing trailing slash - are three at the outside.
 */
const MAX_REDIRECTS = 5;

/** The 3xx statuses that carry a Location worth following. */
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

const USER_AGENT = "alwayscited-scan/1.0 (+https://alwayscited.com)";

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
  | "too_thin"
  /**
   * It resolves somewhere that is not a public web server, or it redirected
   * somewhere that is not. Not a site we will read on anyone's behalf.
   */
  | "private";

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
  | { ok: false; why: "private" }
  | { ok: false; why: "network" };

// The three refusals that carry nothing of their own, named once so the read
// loop keeps its branches on one line each.
const FAILED_NETWORK: Fetched = { ok: false, why: "network" };
const FAILED_PRIVATE: Fetched = { ok: false, why: "private" };
const FAILED_NOT_HTML: Fetched = { ok: false, why: "not_html" };

/**
 * The first PAGE_BYTE_CAP bytes, and no more of them read than that.
 *
 * `await res.arrayBuffer()` and then slicing capped the *decode* and not the
 * read: the whole response was pulled into memory first, so the cap bounded
 * nothing that costs anything. The address is typed by a visitor on a public
 * endpoint, so the size of that response is chosen by whoever is asking - a few
 * hundred megabytes of anything, served slowly enough to stay inside the
 * budget, is a function killed for memory on the first thing anyone does here.
 *
 * Reading the stream and cancelling at the cap also stops the transfer, which
 * the old shape could not: it had already paid for every byte before it threw
 * any of them away.
 */
async function bodyUpTo(body: ReadableStream<Uint8Array>, cap: number): Promise<Uint8Array> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < cap) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    // The stream is either finished or being abandoned mid-body. Both want the
    // same call, and a reader that has already ended treats it as a no-op.
    await reader.cancel().catch(() => {});
  }

  const out = new Uint8Array(Math.min(total, cap));
  let at = 0;
  for (const chunk of chunks) {
    if (at >= out.length) break;
    const take = Math.min(chunk.byteLength, out.length - at);
    out.set(chunk.subarray(0, take), at);
    at += take;
  }
  return out;
}

/**
 * The encoding the response declared, or utf-8 where it declared nothing.
 *
 * TextDecoder was built with no argument, which is utf-8 whatever the site
 * said. A page served as windows-1252 or iso-8859-1 - still ordinary on older
 * British and European sites, which is the market this scans - reached the
 * brand read with a replacement character wherever an accent or a curly quote
 * had been. That is not a rendering blemish here: the prose it mangles is the
 * only thing the model is given to name the company from.
 *
 * The header is the authority and a meta tag inside the document is not read.
 * An unknown label makes TextDecoder throw, so that falls back rather than
 * failing the read.
 */
function decodeBody(bytes: Uint8Array, contentType: string): string {
  const declared = /charset\s*=\s*"?([\w.:-]+)"?/i.exec(contentType)?.[1];
  if (declared) {
    try {
      return new TextDecoder(declared).decode(bytes);
    } catch {
      // Not a label TextDecoder knows. utf-8 below.
    }
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Fetch one page, following redirects by hand so that every hop is checked.
 *
 * redirect: follow handed the whole chain to fetch, which left only the first
 * address ours to judge. A public site answering 302 to a link-local address
 * was followed with nothing looking at it - and that is the cheaper half of
 * this, because it needs no DNS record of your own at all.
 *
 * trusted is the hostname the caller has already resolved and cleared, which
 * is the scanned domain itself. Every other host, including a www variant of
 * it, is checked here before it is fetched.
 */
async function getText(url: string, signal: AbortSignal, trusted: string): Promise<Fetched> {
  let current = url;

  for (let hop = 0; ; hop++) {
    let target: URL;
    try {
      target = new URL(current);
    } catch {
      return FAILED_NETWORK;
    }
    // A redirect to file: or data: is not a page, and not ours to open.
    if (target.protocol !== "https:" && target.protocol !== "http:") return FAILED_NETWORK;
    if (target.hostname !== trusted) {
      const where = await checkHost(target.hostname, signal);
      if (where === "private") return FAILED_PRIVATE;
      if (where === "unresolved") return FAILED_NETWORK;
    }

    let res: Response;
    try {
      res = await fetch(current, {
        signal,
        redirect: "manual",
        headers: { "user-agent": USER_AGENT },
      });
    } catch {
      return FAILED_NETWORK;
    }

    const location = REDIRECTS.has(res.status) ? res.headers.get("location") : null;
    if (location) {
      // The body of a redirect is never read, whatever size it arrived at.
      await res.body?.cancel().catch(() => {});
      if (hop >= MAX_REDIRECTS) return FAILED_NETWORK;
      try {
        current = new URL(location, current).toString();
      } catch {
        return FAILED_NETWORK;
      }
      continue;
    }

    // Nothing reads the body on either refusal, so it is dropped rather than
    // left for the collector at whatever size it arrived.
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      return { ok: false, why: "status", status: res.status };
    }
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) {
      await res.body?.cancel().catch(() => {});
      return FAILED_NOT_HTML;
    }
    if (!res.body) return { ok: true, html: "" };

    // The cap is on bytes, so a multi-byte character straddling it decodes to
    // one replacement character at the very end of 200KB of prose.
    //
    // Wrapped, because the headers arriving is not the body arriving. The only
    // try/catch in here was around fetch(), which resolves as soon as the
    // status line is in - so a site that answered inside the budget and was
    // still streaming when the 8 second controller fired rejected inside
    // bodyUpTo and threw straight out of readSite.
    //
    // Checked rather than reasoned: a fetch aborted after its headers have
    // arrived rejects at reader.read(), not at fetch(). readSite's whole
    // contract is that it throws UnreachableDomain, and the start route splits
    // its five 422s from the 502 on exactly that - so the escape turned the
    // slow site the `timeout` reason exists to name into "read_failed", which
    // is the code that means the language model was the problem. It also
    // logged through describeAnthropicError and wrote a model-call debit for a
    // call that was never made.
    try {
      return { ok: true, html: decodeBody(await bodyUpTo(res.body, PAGE_BYTE_CAP), type) };
    } catch {
      return FAILED_NETWORK;
    }
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
  if (first?.why === "private") return new UnreachableDomain(domain, "private");
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
    // Where the address points is settled before a single byte is fetched.
    // Both schemes below share the hostname, so this is one lookup for the pair
    // rather than one per attempt.
    const where = await checkHost(domain, controller.signal);
    if (where === "private") throw new UnreachableDomain(domain, "private");
    if (where === "unresolved") throw failureFor(domain, controller.signal, null);

    let html: string | null = null;
    let base = `https://${domain}/`;
    let firstFailure: Exclude<Fetched, { ok: true }> | null = null;

    for (const scheme of ["https", "http"] as const) {
      const url = `${scheme}://${domain}/`;
      const got = await getText(url, controller.signal, domain);
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

    // `html === null` rather than `!html`, because "" is a page that answered.
    // A 200 carrying text/html and an empty body took the falsy branch, and
    // with no failure recorded against it failureFor fell through to `dns` -
    // "Nothing answered at yourdomain.com. Check the address and try again."
    // Something did answer; there was nothing in it. That is `too_thin`, which
    // the length check below reaches now that "" gets there.
    if (html === null) throw failureFor(domain, controller.signal, firstFailure);

    const parts = [toProse(html)];
    const links = sameHostLinks(html, domain, base);

    // Remaining pages share whatever is left of the budget, in parallel.
    //
    // allSettled, because these are best effort and the loop below already
    // says so by testing `ok`. Under Promise.all a single rejection discarded
    // the homepage prose that had already been read and failed the whole scan
    // - and it fired on exactly the sites where the extra pages are worth
    // most, the ones whose homepage ate enough of the budget to leave these
    // mid-body when the controller fired.
    const extra = await Promise.allSettled(links.map((u) => getText(u, controller.signal, domain)));
    for (const page of extra) {
      if (page.status === "fulfilled" && page.value.ok) parts.push(toProse(page.value.html));
    }

    const text = parts.filter(Boolean).join("\n\n").slice(0, 60_000);
    if (text.length < 200) throw new UnreachableDomain(domain, "too_thin");
    return text;
  } finally {
    clearTimeout(timer);
  }
}
