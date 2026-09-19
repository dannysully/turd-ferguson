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
 * The type is next/og's bundled Geist rather than Hanken Grotesk. Fontsource
 * ships Hanken as woff2 only and Satori reads ttf, otf and woff - matching the
 * webfont here would mean committing a converted binary and a conversion step
 * nobody can reproduce. A neutral grotesk at the same weights was the cheaper
 * trade. The colours, the lockup and the wording are exact.
 */
import { ImageResponse } from "next/og";
import { T } from "@/config/tokens";
import { ENGINE_SPECS, FREE_ENGINES } from "@/lib/scan/engines";

export const alt = "alwayscited - be the brand AI recommends";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Read from config rather than typed, so the card cannot go stale the way a
 * hardcoded count did on the docs. Four free engines today, none gated.
 */
const engines = FREE_ENGINES.map((e) => ENGINE_SPECS[e].label).join("   \u00b7   ");

/**
 * Satori needs an explicit display:flex on any element with more than one
 * child, and it measures letter-spacing in px rather than em - so the board's
 * -0.03em is written here at the px equivalent of each size.
 */
const frame: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  boxSizing: "border-box",
  padding: "56px",
  background: T.bg,
};

const card: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "0 72px",
  background: T.surface,
  border: "1px solid " + T.line,
  borderRadius: "28px",
};
const lockup: React.CSSProperties = {
  display: "flex",
  fontSize: "78px",
  fontWeight: 700,
  letterSpacing: "-2.34px",
  color: T.ink,
};

/**
 * The lockup is one unbroken word, and two flex children are not: Satori
 * applies letter-spacing within a text run and not across the boundary
 * between two of them, and each run carries its own sidebearings. Measured
 * off the rendered png, letters inside "always" and "cited" sit 2-5px apart
 * and the join sat at 13px. This closes it to the same rhythm.
 *
 * Re-measure if the size or the font changes - it is a metric, not a guess.
 */
const accentWord: React.CSSProperties = { color: T.accent, marginLeft: "-9px" };

const headline: React.CSSProperties = {
  display: "flex",
  marginTop: "26px",
  fontSize: "42px",
  fontWeight: 600,
  letterSpacing: "-1.26px",
  color: T.ink,
};
const rule: React.CSSProperties = {
  marginTop: "38px",
  width: "104px",
  height: "4px",
  borderRadius: "2px",
  background: T.accent,
};

const engineRow: React.CSSProperties = {
  display: "flex",
  marginTop: "26px",
  fontSize: "23px",
  fontWeight: 500,
  color: T.soft,
};
/**
 * The wording is verbatim from the root layout title, so the card cannot
 * assert anything the site does not already say.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div style={frame}>
        <div style={card}>
          <div style={lockup}>
            <span>always</span>
            <span style={accentWord}>cited</span>
          </div>
          <div style={headline}>Be the brand AI recommends</div>
          <div style={rule} />
          <div style={engineRow}>{engines}</div>
        </div>
      </div>
    ),
    size,
  );
}
