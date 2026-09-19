import type { MetadataRoute } from "next";

const BASE_URL = "https://alwayscited.com";

/**
 * The sitemap.
 *
 * Every entry used to carry `lastModified: new Date()`, which made all 21
 * URLs report the moment of the build. Today that happens to be true - the
 * whole site was rebuilt on 19 September - and from tomorrow it is a lie that
 * repeats on every deploy. A lastmod that always says "just now" is not a
 * weak signal, it is a discarded one: a crawler that finds the field
 * unreliable stops reading it for the whole site, and this is a site whose
 * product is being read accurately by crawlers.
 *
 * So the dates are literals, taken from `git log -1 --format=%cs` on each
 * page file on 19 September 2026. Three of the four blog entries show that
 * date rather than their April publication date because their copy was
 * edited on the 19th - lastmod is the last change, not the byline.
 *
 * The rule, for whoever edits a page next: change the copy on a route,
 * change its date here. A date that is stale by a week says less than one
 * that is wrong by four months, and far more than one that is always now.
 */
type Entry = [path: string, lastModified: string, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"], priority: number];

const ENTRIES: Entry[] = [
  ["", "2026-09-19", "weekly", 1.0],
  ["/alwaystracked", "2026-09-19", "monthly", 0.9],
  ["/alwaysmentioned", "2026-09-19", "monthly", 0.9],
  ["/alwayscited", "2026-09-19", "monthly", 0.9],
  ["/alwayseverywhere", "2026-09-19", "monthly", 0.8],
  ["/what-is-aeo", "2026-09-19", "monthly", 0.9],
  ["/how-it-works", "2026-09-19", "monthly", 0.9],
  ["/case-studies", "2026-09-19", "monthly", 0.8],
  ["/case-studies/vibe-retail", "2026-09-19", "monthly", 0.8],
  ["/blog", "2026-09-19", "weekly", 0.7],
  ["/blog/how-llms-pick-which-brands-to-recommend", "2026-09-19", "monthly", 0.6],
  ["/blog/aeo-vs-seo-whats-actually-different", "2026-09-19", "monthly", 0.6],
  ["/blog/why-most-aeo-audits-are-a-waste-of-money", "2026-09-19", "monthly", 0.6],
  ["/compare", "2026-09-19", "monthly", 0.8],
  ["/white-label", "2026-09-19", "monthly", 0.8],
  ["/seo-agencies", "2026-09-19", "monthly", 0.8],
  ["/pr-agencies", "2026-09-19", "monthly", 0.8],
  ["/coverage-check", "2026-09-19", "monthly", 0.7],
  ["/legal", "2026-09-19", "yearly", 0.3],
  ["/about", "2026-09-19", "yearly", 0.5],
  ["/contact", "2026-09-19", "yearly", 0.5],
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ENTRIES.map(([path, lastModified, changeFrequency, priority]) => ({
    url: BASE_URL + path,
    lastModified: new Date(lastModified),
    changeFrequency,
    priority,
  }));
}
