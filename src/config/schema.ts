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
 * What is deliberately absent:
 *
 * - **`logo`.** There is no logo file. The wordmark is drawn in markup by
 *   `BrandMark`, and the Open Graph card is a share image rather than a logo.
 *   A `logo` pointing at the OG card would be a false statement about an
 *   asset, so the property is omitted until there is a real file behind it.
 * - **`sameAs`.** Profile URLs need a source. None is recorded anywhere in
 *   this repo, and guessing at a social handle is the same error as guessing
 *   a number.
 * - **`foundingDate`, `numberOfEmployees`, `address`.** Same reason. The one
 *   place-fact on the site - "York" - is prose on /about about Nomada, not a
 *   postal address we hold.
 */

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

export const ORG_ID = SITE_URL + "/#organization";
export const SITE_ID = SITE_URL + "/#website";

/** Reference form. Every author, publisher and provider on the site uses it. */
export const ORG_REF = { "@id": ORG_ID };
export const SITE_REF = { "@id": SITE_ID };

/**
 * Emitted once, from the root layout, so it is present on every route -
 * including the ones no page component owns: /scan/[token], the 404 and the
 * error boundary.
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
        email: "hello@alwayscited.com",
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
export function ld(node: unknown): string {
  return JSON.stringify(node);
}
