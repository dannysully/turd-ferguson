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

import { splitTierNames, TIER_PLAIN, type TierKey } from "@/lib/tier-text";

// Re-exported so every existing import site keeps its one obvious source for
// these. They live in lib/tier-text.ts because the splitting rule below has to
// be loadable by `node --test`, and this file is JSX.
export { TIER_PLAIN, type TierKey };

const TIER_PARTS: Record<TierKey, { stem: string; accent: string }> = {
  tracked: { stem: "always", accent: "tracked" },
  mentioned: { stem: "always", accent: "mentioned" },
  cited: { stem: "always", accent: "cited" },
  everywhere: { stem: "always", accent: "everywhere" },
};

/**
 * A plain sentence with any tier name in it rendered as the lockup.
 *
 * This exists because one string legitimately has to serve two contexts at
 * once. A package page's standfirst is body copy, where the rule is TierName;
 * it is also the `description` of that page's Service JSON-LD, which is one of
 * the contexts that strips colour and so must stay TIER_PLAIN. Splitting it
 * into two strings is how the two drift apart. So the string stays plain,
 * feeds the schema as it is, and is rendered through this on the way to the
 * page.
 *
 * Matching is deliberately narrow. A tier name is only a lockup when it is a
 * word in prose: preceded by a slash, a dot or a word character it is part of
 * a URL or a slug, and `alwayscited.com` is the company's domain rather than a
 * plan. A trailing qualifier such as "pro" is left as plain text after the
 * word, which is what TierName's own `qualifier` does with it.
 */
export function TierText({ children }: { children: string }) {
  return (
    <>
      {splitTierNames(children).map((seg, n) =>
        "tier" in seg ? <TierName key={n} tier={seg.tier} /> : seg.text,
      )}
    </>
  );
}

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
