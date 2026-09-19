/**
 * Tier names, and where a written one is a lockup rather than a string.
 *
 * The names and the splitting rule live here, with no JSX and no imports, for
 * the reason `prose.ts` does: `TierName.tsx` cannot be loaded by `node --test`,
 * so anything only reachable through it is a claim read back by eye. The rule
 * below decides how the four priced pages render, so it is worth executing.
 */

export type TierKey = "tracked" | "mentioned" | "cited" | "everywhere";

/** Unstyled one-word forms for every context that strips colour. */
export const TIER_PLAIN: Record<TierKey, string> = {
  tracked: "alwaystracked",
  mentioned: "alwaysmentioned",
  cited: "alwayscited",
  everywhere: "alwayseverywhere",
};

const TIER_BY_PLAIN = new Map<string, TierKey>(
  (Object.keys(TIER_PLAIN) as TierKey[]).map((key) => [TIER_PLAIN[key], key]),
);

/**
 * No tier name is a prefix of another, so alternation order does not matter.
 *
 * Both guards are load-bearing. `alwayscited` is the company's domain as well
 * as a plan, so preceded by a slash, a dot or a word character it is part of a
 * URL, a slug or a longer word rather than a name being said. The lookahead
 * rejects `alwayscited.com` by requiring that a following dot not begin a
 * label - which still lets a sentence end on the name, where the dot is a full
 * stop followed by a space or by nothing.
 */
const TIER_IN_PROSE =
  /(?<![\w/.-])(alwaystracked|alwaysmentioned|alwayscited|alwayseverywhere)(?![\w-]|\.[a-z])/g;

export type TierSegment = { text: string } | { tier: TierKey };

/**
 * Splits a plain sentence into the runs of text around any tier name in it.
 *
 * A trailing qualifier such as "pro" stays in the following text segment,
 * which is what `TierName`'s own `qualifier` does with it: the qualifier is
 * ink, outside the brand word.
 */
export function splitTierNames(text: string): TierSegment[] {
  const out: TierSegment[] = [];
  let last = 0;

  for (const match of text.matchAll(TIER_IN_PROSE)) {
    const tier = TIER_BY_PLAIN.get(match[1]);
    const at = match.index ?? 0;
    if (!tier) continue;
    if (at > last) out.push({ text: text.slice(last, at) });
    out.push({ tier });
    last = at + match[1].length;
  }

  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
