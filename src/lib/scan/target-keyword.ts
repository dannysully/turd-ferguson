/**
 * The keyword rule for R39 (Danny, 27 Sep 2026 - search volume returns at
 * keyword level; docs/rules.md). Pure, and not yet called: the model proposes
 * 3-5 candidate head keywords per question, this decides which may stand, and
 * the volume call picks among them. Nothing wires it in until the
 * target_keyword column (migration 20260927000000) is applied and read back.
 *
 * A candidate stands when, after the filler is taken out, it still names a
 * supplier - "business cash flow finance providers" - and is not the bare
 * category. The bare category is what the old keyword tools rank on and is
 * not a buyer choosing someone.
 */

/** Words that say "choose" without saying what. Taken out, never kept. */
const FILLER = new Set([
  "best", "top", "which", "who", "offers", "offer", "the", "a", "an", "for", "in", "of", "are", "is",
  "uk", "us", "usa", "america", "britain", "united", "kingdom", "states", "england",
]);

/** What a buyer is choosing between. A candidate must keep one. */
export const SUPPLIER_NOUNS = [
  "providers", "provider", "companies", "company", "lenders", "lender", "software", "tools", "tool",
  "platforms", "platform", "agency", "agencies", "firms", "firm", "consultants", "consultancy",
  "services", "suppliers", "supplier", "vendors", "vendor", "apps", "app", "brands", "partners",
];

/** Years and list sizes - "2026", "top 10". */
const YEAR = /^\d+$/;

/** Lower case, filler and years out, single spaces. */
export function stripFiller(candidate: string): string {
  return candidate
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w) && !YEAR.test(w))
    .join(" ");
}

const hasSupplier = (k: string) => k.split(" ").some((w) => SUPPLIER_NOUNS.includes(w));

/**
 * The candidate as it would be looked up, or null when it may not stand.
 * With no supplier noun, the category's own is added (`supplierNoun`) rather
 * than the candidate being lost; the bare category is refused either way.
 */
export function normaliseCandidate(candidate: string, category: string, supplierNoun: string): string | null {
  let k = stripFiller(candidate);
  if (!k) return null;
  if (!hasSupplier(k)) {
    const noun = stripFiller(supplierNoun);
    if (!noun || !hasSupplier(noun)) return null;
    k = k + " " + noun;
  }
  if (k === stripFiller(category)) return null;
  const words = k.split(" ");
  // A supplier noun alone ("agencies") is not a head keyword.
  if (words.length < 2) return null;
  return k;
}

/**
 * The keyword for one question: the highest-volume candidate that stands;
 * when every one reads zero (or has no reading), the shortest. Null when none
 * stands. Ties go to the earlier candidate, which is the model's own order.
 */
export function pickKeyword(
  candidates: string[],
  category: string,
  supplierNoun: string,
  volumes: ReadonlyMap<string, number>,
): string | null {
  const standing = [...new Set(candidates.map((c) => normaliseCandidate(c, category, supplierNoun)).filter((k): k is string => Boolean(k)))];
  if (!standing.length) return null;
  const vol = (k: string) => volumes.get(k) ?? 0;
  const top = standing.reduce((a, b) => (vol(b) > vol(a) ? b : a));
  if (vol(top) > 0) return top;
  return standing.reduce((a, b) => (b.length < a.length ? b : a));
}
