/**
 * The share card, as a value every page can point at.
 *
 * src/app/opengraph-image.tsx generates the card and Next wires it into the
 * root layout automatically - but Open Graph metadata is merged SHALLOWLY,
 * so a page that sets openGraph at all replaces the whole block it
 * inherited, and the file convention image goes with it.
 *
 * That is not theoretical. Every page here sets openGraph, so adding the
 * card alone left 20 of 22 prerendered pages still declaring a
 * summary_large_image card with no image in it. It only showed up on a read
 * of the built HTML, never in the source.
 *
 * So: any page that sets openGraph must also set images: OG_IMAGE.
 * twitter:image needs no equivalent - no page overrides twitter, so the
 * twitter-image convention reaches all of them on its own.
 *
 * That last sentence was true when it was typed and executed by nobody, which
 * made it a claim about the tree rather than a reason. It is a rule now:
 * `og-card.test.mts` reads `twitter:card` out of every built head against the
 * one `layout.tsx` declares, so a page that sets `twitter` at all - and drops
 * the card type the same way an `openGraph` block drops the image - fails
 * rather than shipping the card as a thumbnail.
 *
 * `url` is the field below that says WHICH picture, and until 20 September 2026
 * it was joined to nothing: the rules over this value compared `alt`, `width`,
 * `height` and `type` against the card's own exports and could not compare the
 * fifth, because the card module exports no URL. `page-head` asked that an
 * og:image was present and `structured-data` that it resolved to a route the
 * build serves - and this site serves `/icon.svg` and `/favicon.ico` too. It is
 * held now against the card's own route, derived from the file path.
 */
export const OG_IMAGE = {
  url: "/opengraph-image",
  type: "image/png",
  width: 1200,
  height: 630,
  alt: "alwayscited - be the brand AI recommends",
};
