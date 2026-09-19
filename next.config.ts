import type { NextConfig } from "next";

/**
 * Response headers.
 *
 * The site was serving none of these. HSTS comes from Vercel; everything
 * below had to be asked for.
 *
 * The one that is not boilerplate is the X-Robots-Tag on /api and /scan.
 * robots.txt now closes both to crawlers, but robots.txt governs fetching and
 * says nothing to anything that has already fetched. The scan pages carry a
 * noindex meta tag; the JSON under /api returns the same brand, domain and
 * placement data and cannot carry a meta tag at all, because it is not HTML.
 * The header is the only form of the directive that reaches it.
 *
 * `:path+` on /scan, not `:path*`. The docs for this version are explicit that
 * `*` is zero or more and that `/blog/:slug*` matches `/blog` - so `/scan`
 * itself was being served `noindex, nofollow`, which is the one thing
 * src/app/robots.ts goes out of its way to avoid. It keeps `/scan` crawlable
 * on purpose: it is the action of seven `<form method="get">` on the home
 * page, the posts, the case study and both agency pages, and a linked URL
 * that is closed gets listed as a bare address instead. Verified against the
 * built server rather than inferred - `/scan` answered 200 with
 * `noindex, nofollow` on it, `/scan/abc` still does, and `/` never did.
 *
 * What is protected is a scan result, which always has a token under it, so
 * "one or more segments" is the rule that was meant. /api keeps `*`: there is
 * no page at bare /api, so the extra match costs nothing and a 404 is better
 * off noindexed anyway.
 */
const BASELINE = [
  ["x-content-type-options", "nosniff"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["x-frame-options", "SAMEORIGIN"],
  ["permissions-policy", "camera=(), microphone=(), geolocation=()"],
];

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy.
 *
 * WHAT THIS BUYS AND WHAT IT DOES NOT, because a CSP is easy to overstate.
 *
 * script-src keeps 'unsafe-inline'. This policy therefore does NOT stop an
 * injected inline script. It is not XSS protection and must not be described
 * as such in a commit message or to a customer.
 *
 * That is forced by Next's own output rather than chosen. A statically
 * generated page in this app carries four inline script tags with no
 * integrity attribute, one of them the RSC flight payload
 * (self.__next_f.push) - checked in .next/server/app/*.html, not assumed.
 * Dropping 'unsafe-inline' therefore needs a per-request nonce or a hash.
 *
 * The nonce is the documented route and it costs more here than it returns:
 * the Next docs are explicit that a nonce forces every page to render
 * dynamically, which for the static marketing pages means no CDN caching and
 * a server render per view. (Counted here as 21 when this was written; the
 * build says 20 today, because /blog reads searchParams for its filter pills
 * and buys a per-request render with it. Stated as "the static pages" rather
 * than as a number, because the number moves and nothing depends on it.) It
 * would be buying that against an injection
 * vector the site does not currently have - every dangerouslySetInnerHTML
 * here is JSON-LD built from static config, none of it from a crawled site
 * or from a visitor.
 *
 * What it does buy are the four directives that need no nonce and cannot
 * break a render:
 *   base-uri 'self'    an injected <base> cannot re-point every relative URL
 *   form-action 'self' an injected form cannot post the contact form or a
 *                      scan email address to someone else
 *   object-src 'none'  no plugin-embedded script
 *   frame-ancestors    clickjacking, and the directive browsers honour in
 *                      preference to the X-Frame-Options above
 *
 * When the inline-script hole is worth closing, the upgrade is SRI
 * (experimental.sri), not a nonce, because it keeps static rendering. It
 * hashes files and not inline scripts, so it does not close this on its own
 * today.
 *
 * challenges.cloudflare.com is Turnstile on the scan form - its script and
 * the widget's iframe. It is the site's only third-party origin.
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self' https://challenges.cloudflare.com${isDev ? " ws:" : ""}`,
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  // Omitted in development: it upgrades http subresources, which is not
  // what a localhost dev server wants.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  /**
   * Off because it was shipping a stale stylesheet to production.
   *
   * Next 16.3 puts content-addressed assets under /_next/static/immutable/,
   * drops the ?dpl= deployment query from them and serves them
   * `max-age=31536000, immutable`, on the promise that a given filename can
   * only ever hold one set of bytes. Observed on production at e65d6eb, which
   * is what this flag is being set for: the HTML was that commit's - the new
   * classes were in it, and /api/version agreed - and the one stylesheet it
   * loaded was /_next/static/immutable/chunks/0baq_3elvlaml.css, serving
   * Last-Modified 12:27 with an Age of seven hours and none of that commit's
   * rules in it. A query string does not reach past it either: the same URL
   * with ?bust=1 returned the identical cached body. So the markup shipped and
   * the CSS behind it did not, which is worse than neither shipping, because
   * every check short of reading the served stylesheet says it worked.
   *
   * What is not established is why - whether Vercel skipped the upload for a
   * path already in the shared namespace, or two builds truncated to the same
   * hash, which is the collision the adapter docs warn about and give
   * outputHashSalt for. Both are upstream of us and neither changes what to do
   * here. The filename is content-addressed - verified by rebuilding with one
   * real rule added and watching the hash move, after a first attempt with
   * only a comment proved nothing because the minifier strips those.
   *
   * Cost of turning it off: assets carry ?dpl= again and a returning visitor
   * re-downloads them after each deploy. On a site with almost no traffic that
   * is not a cost. Getting the stylesheet you just shipped is not optional.
   *
   * Reverse by deleting this line, but only alongside a check that reads the
   * served CSS rather than the HTML.
   */
  supportsImmutableAssets: false,

  /**
   * /example is gone - Danny, 19 Sep 2026: "We no longer need example you
   * can remove this." It was live for weeks and may be linked from
   * somewhere neither of us can see, so it redirects rather than 404s.
   */
  async redirects() {
    return [
      {
        source: "/example",
        destination: "/",
        permanent: true,
      },
    ];
  },

  async headers() {
    const baseline = BASELINE.map(([key, value]) => ({ key, value }));
    const csp = { key: "content-security-policy", value: CSP };
    const noIndex = { key: "x-robots-tag", value: "noindex, nofollow" };

    return [
      { source: "/:path*", headers: [...baseline, csp] },
      { source: "/api/:path*", headers: [noIndex] },
      { source: "/scan/:path+", headers: [noIndex] },
    ];
  },
};

export default nextConfig;
