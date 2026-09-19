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
 * dynamically, which for 21 static marketing pages means no CDN caching and
 * a server render per view. It would be buying that against an injection
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
      { source: "/scan/:path*", headers: [noIndex] },
    ];
  },
};

export default nextConfig;
