/**
 * The site-wide Open Graph card.
 *
 * The root layout has declared `twitter:card = summary_large_image` since the
 * redesign and there was no image anywhere on the site to put in it, so every
 * share - Slack, LinkedIn, X, WhatsApp - rendered as a bare link or an empty
 * card. Swept the deployed HTML of all 21 sitemap pages: zero og:image.
 *
 * One file fixes all of them. A root `opengraph-image` applies to every route
 * segment below it unless a segment overrides it, so this is the default card
 * for the whole site and a page that wants its own can add one beside it.
 *
 * Since 26 Sep 2026 (Danny, R26) it mirrors the homepage hero rather than
 * drawing a light card of its own: the hero's dark ground and purple wash,
 * the wordmark small top left, the hero's two-line headline with the lifted
 * purple second line, its subline, and the free engines' own marks along the
 * bottom. Every sentence is HomeHero's, verbatim - og-card.test.mts holds it.
 *
 * The type is next/og's bundled Geist rather than Hanken Grotesk. Fontsource
 * ships Hanken as woff2 only and Satori reads ttf, otf and woff - matching the
 * webfont here would mean committing a converted binary and a conversion step
 * nobody can reproduce. A neutral grotesk at the same weights was the cheaper
 * trade. The colours, the lockup and the wording are exact.
 */
import { ImageResponse } from "next/og";
import { D, WASH } from "@/components/home/dark";
import { engineMarkSvg } from "@/components/EngineLogo";
import { T } from "@/config/tokens";
import { FREE_ENGINES } from "@/lib/scan/engines";

export const alt =
  "alwayscited - Every AI tool shows you the gap. We close it. We find the pages the answers are built from, then get you named inside them. With the engine marks along the bottom.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Satori needs an explicit display:flex on any element with more than one
 * child, and it measures letter-spacing in px rather than em - so the hero's
 * -0.04em is written here at the px equivalent of each size.
 */
const frame: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  boxSizing: "border-box",
  padding: "52px 64px 56px",
  backgroundColor: D.ground,
  // The hero's own wash, read from dark.ts rather than re-tinted here.
  backgroundImage: WASH,
  color: T.surface,
};

const lockup: React.CSSProperties = {
  display: "flex",
  alignSelf: "flex-start",
  fontSize: "30px",
  fontWeight: 700,
  letterSpacing: "-0.9px",
  color: T.surface,
};

/**
 * The lockup is one unbroken word, and two flex children are not: Satori
 * applies letter-spacing within a text run and not across the boundary
 * between two of them. At 78px the join measured 13px against 2-5px inside
 * the words and took -9px; this is that metric at 30px. Re-measure if the
 * size or the font changes.
 */
const accentWord: React.CSSProperties = { color: D.accent, marginLeft: "-3.5px" };

const headline: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginTop: "78px",
  fontSize: "68px",
  fontWeight: 700,
  letterSpacing: "-2.7px",
  lineHeight: 1.06,
};
const lifted: React.CSSProperties = { color: D.accent };

const subline: React.CSSProperties = {
  display: "flex",
  marginTop: "26px",
  fontSize: "26px",
  lineHeight: 1.45,
  color: D.muted,
  textAlign: "center",
  maxWidth: "820px",
};

const markRow: React.CSSProperties = {
  display: "flex",
  marginTop: "auto",
  gap: "40px",
  alignItems: "center",
};

/** Derived from FREE_ENGINES, so the card shows the engines a free scan reads. */
const marks = FREE_ENGINES.map((e) => (
  // eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image
  <img
    key={e}
    width={44}
    height={44}
    src={`data:image/svg+xml;base64,${Buffer.from(engineMarkSvg(e, T.surface)).toString("base64")}`}
    alt=""
  />
));

/** The wording is HomeHero's, verbatim, so the card says nothing the homepage does not. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={frame}>
        <div style={lockup}>
          <span>always</span>
          <span style={accentWord}>cited</span>
        </div>
        <div style={headline}>
          <span>Every AI tool shows you the gap.</span>
          <span style={lifted}>We close it.</span>
        </div>
        <div style={subline}>We find the pages the answers are built from, then get you named inside them.</div>
        <div style={markRow}>{marks}</div>
      </div>
    ),
    size,
  );
}
