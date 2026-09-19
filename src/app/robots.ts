import type { MetadataRoute } from "next";

/**
 * What a crawler may read.
 *
 * Two kinds of path are closed here, and the reason is different for each.
 *
 * `/scan/<token>` is somebody's own result. The page server-renders their
 * brand, domain, positioning and - once unlocked - the whole paid report into
 * the HTML. It has carried a noindex, nofollow tag since it was built, and
 * that is the right tag, but a meta tag is a directive about indexing,
 * addressed to search engines. The eight agents named below are governed by
 * this file, and until now this file said Allow / to every one of them by
 * name. A scan link that reached anywhere public - an unfurl, a forwarded
 * mail in an archived list - was fetchable by all of them.
 *
 * The disallow is on /scan/ with the trailing slash, so the /scan entry page
 * itself stays open: it is the target of the no-JS GET forms on the home page
 * and the posts, and a disallowed URL that is linked from the site gets
 * listed as a bare address, which is worse than the noindex it already
 * carries.
 *
 * /api/ returns the same data as JSON and carries no tag at all.
 *
 * /admin/ answers 401 to everyone via proxy.ts, so that line changes nothing
 * today. It is here so that the day the auth moves, the crawl rule does not
 * have to be remembered separately.
 */
const CLOSED = ["/scan/", "/api/", "/admin/"];

const AGENTS = [
  "*",
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "PerplexityBot",
  "anthropic-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: AGENTS.map((userAgent) => ({
      userAgent,
      allow: "/",
      disallow: CLOSED,
    })),
    sitemap: "https://alwayscited.com/sitemap.xml",
  };
}
