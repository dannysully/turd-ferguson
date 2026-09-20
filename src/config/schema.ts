/**
 * The site's one structured-data entity.
 *
 * Before this file, eight pages each declared their own anonymous
 * `Organization` named "alwayscited" as author or publisher, and the homepage
 * declared none at all. To anything reading the markup that is eight unrelated
 * organisations that happen to share a name - there was no node to resolve
 * them to, because there was no `@id` anywhere on the site.
 *
 * That matters more here than it would on most sites: we sell being the entity
 * an answer engine recognises, and we had never declared ourselves as one.
 *
 * So the organisation is defined once, emitted once from the root layout, and
 * referenced by `@id` everywhere else. Adding a fact about the company is now
 * an edit to one object rather than eight.
 *
 * `logo` was absent until 20 Sep 2026 on a stated reason - "there is no logo
 * file" - and the build contradicted it. `src/app/icon.svg` is the brand mark
 * as a square SVG and Next serves it at `/icon.svg`; `structured-data.test.mts`
 * names that file in its own comment while listing every image on this site.
 * Both icon routes were read from production on 20 Sep 2026 and return the
 * bytes on disk - `/icon.svg` 597, `/favicon.ico` 19,515. So the reason for
 * the absence was false, and the property that a search engine reads for the
 * organisation panel was missing from the one entity this product exists to
 * make resolvable.
 *
 * It is the SVG rather than the `.ico`: same mark, one file, and the `.ico` is
 * a 256px raster of it kept for browsers that ask for one. What is claimed is
 * only that this URL is our logo, which is true of the file. Nothing here
 * claims what any engine does with it - that would need a dated source and
 * vendor docs are unreachable from this session.
 *
 * What is still deliberately absent:
 *
 * - **`sameAs`.** Profile URLs need a source. None is recorded anywhere in
 *   this repo, and guessing at a social handle is the same error as guessing
 *   a number. `organization-entity.test.mts` re-earns that reason against the
 *   built pages rather than leaving it as prose, because the day the footer
 *   links a profile the absence stops being honest.
 * - **`foundingDate`, `numberOfEmployees`, `address`.** Same reason. The one
 *   place-fact on the site - "York" - is prose on /about about Nomada, not a
 *   postal address we hold.
 */

import { CONTACT_EMAIL } from "./contact.ts";

export const SITE_URL = "https://alwayscited.com";

/**
 * The company name.
 *
 * Deliberately not `TIER_PLAIN.cited`, even though the two strings are
 * identical. That collision is the point of the "the core tier shares the
 * company name" convention: here the string means the business, and on a
 * package page the same string means the $2,495 plan. Sourcing both from one
 * constant would make a future rename of either silently rename the other.
 */
export const BRAND = "alwayscited";

/**
 * The brand mark, and the only image on this site that is a logo rather than
 * a share card. Served by Next's `icon` file convention from
 * `src/app/icon.svg`; the hash the head puts on the href is a cache-buster and
 * not part of the route, so the bare path is the stable URL.
 */
export const LOGO_URL = SITE_URL + "/icon.svg";

export const ORG_ID = SITE_URL + "/#organization";
export const SITE_ID = SITE_URL + "/#website";

/** Reference form. Every author, publisher and provider on the site uses it. */
export const ORG_REF = { "@id": ORG_ID };
export const SITE_REF = { "@id": SITE_ID };

/**
 * Emitted once, from the root layout, so it is present on every route that
 * renders inside that layout - including the ones no marketing page owns:
 * /scan/[token], the 404, and the route-level error boundary in error.tsx.
 *
 * **Not every route.** Measured off the built pages: 30 of the 31 swept states
 * carry this graph and `_global-error.html` does not, because Next's global
 * error fallback renders its own document rather than the root layout. This
 * said "the error boundary" flatly, which is true of error.tsx and false of
 * the one route that has no layout at all. `layout.tsx` and `error.tsx` both
 * already record that there is no global-error.tsx; this file was the copy
 * that did not. `structured-data.test.mts` holds the absence and re-earns it,
 * so the day that page gains a block the exemption fails rather than widens.
 *
 * `parentOrganization` was already published on /about, in prose and in that
 * page's own schema. It moves here rather than being asserted anew.
 */
export const siteGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: BRAND,
      url: SITE_URL,
      logo: LOGO_URL,
      description:
        "Editorial placements in the third-party pages AI search systems already read for a category, so a brand is named inside the answer rather than ranked in the links under it.",
      parentOrganization: {
        "@type": "Organization",
        name: "Nomada Digital",
        url: "https://nomadadigital.co.uk",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        email: CONTACT_EMAIL,
      },
    },
    {
      "@type": "WebSite",
      "@id": SITE_ID,
      name: BRAND,
      url: SITE_URL,
      inLanguage: "en-GB",
      publisher: ORG_REF,
      // No SearchAction: there is no site search, and declaring one that does
      // not exist is worse than declaring nothing.
    },
  ],
};

/** Serialise a node for a script tag of type application/ld+json. */
/**
 * Serialise a JSON-LD node for a <script> tag.
 *
 * The escape is the whole point. JSON.stringify will happily emit the
 * characters "</script>" inside a string value, which closes the tag early
 * and turns anything after it into markup - the standard way a JSON-LD block
 * becomes an injection. Escaping < to its unicode form is still valid JSON
 * and still parses to the same object, so it costs nothing.
 *
 * Nothing untrusted reaches this today: every caller builds its node from
 * static config, not from a crawled site or a visitor. This is here so that
 * stops being load-bearing the first time someone renders a brand name into
 * a schema node.
 */
export function ld(node: unknown): string {
  return JSON.stringify(node).replace(/</g, "\\u003c");
}
