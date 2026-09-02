/**
 * Renders a tier name as a single lowercase word, stem in ink and accent in
 * brand purple, matching the logo lockup.
 *
 * This is the only place tier names are coloured. Do not hand-colour spans
 * elsewhere.
 *
 * Colour is never the only signal: each tier's accent word is unique
 * (tracked / mentioned / cited / everywhere), so a tier stays identifiable
 * with colour disabled. For plain-text contexts - title tags, meta, alt text,
 * aria-label, email, invoices, slugs, JSON-LD - use TIER_PLAIN instead, which
 * carries no markup.
 */

export type TierKey = "tracked" | "mentioned" | "cited" | "everywhere";

const TIER_PARTS: Record<TierKey, { stem: string; accent: string }> = {
  tracked: { stem: "always", accent: "tracked" },
  mentioned: { stem: "always", accent: "mentioned" },
  cited: { stem: "always", accent: "cited" },
  everywhere: { stem: "always", accent: "everywhere" },
};

/** Unstyled one-word forms for every context that strips colour. */
export const TIER_PLAIN: Record<TierKey, string> = {
  tracked: "alwaystracked",
  mentioned: "alwaysmentioned",
  cited: "alwayscited",
  everywhere: "alwayseverywhere",
};

export default function TierName({
  tier,
  qualifier,
}: {
  tier: TierKey;
  /** Plan variant such as "pro". Rendered in ink, outside the brand word. */
  qualifier?: string;
}) {
  const { stem, accent } = TIER_PARTS[tier];
  // Kept on one line deliberately: the stem and accent must produce a single
  // unbroken word in the DOM. A reformat that splits these onto separate lines
  // risks introducing whitespace between them.
  return (
    <span className="tier-name">{stem}<span className="tier-name__accent">{accent}</span>{qualifier ? ` ${qualifier}` : null}</span>
  );
}
