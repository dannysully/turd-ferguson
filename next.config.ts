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
 * No Content-Security-Policy. Next inlines its own bootstrap script, so a
 * useful CSP needs a per-request nonce and a proxy change, and a CSP shipped
 * without checking every page renders is how a site goes blank on a Saturday.
 * It is worth doing properly and it is not this commit.
 */
const BASELINE = [
  ["x-content-type-options", "nosniff"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["x-frame-options", "SAMEORIGIN"],
  ["permissions-policy", "camera=(), microphone=(), geolocation=()"],
];

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
    const noIndex = { key: "x-robots-tag", value: "noindex, nofollow" };

    return [
      { source: "/:path*", headers: baseline },
      { source: "/api/:path*", headers: [noIndex] },
      { source: "/scan/:path*", headers: [noIndex] },
    ];
  },
};

export default nextConfig;
