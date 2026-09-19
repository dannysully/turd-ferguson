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
 */
export const OG_IMAGE = {
  url: "/opengraph-image",
  type: "image/png",
  width: 1200,
  height: 630,
  alt: "alwayscited - be the brand AI recommends",
};
