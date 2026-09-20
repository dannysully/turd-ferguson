/**
 * A number and the noun it counts, agreeing.
 *
 * No JSX and no imports, for the reason `tier-text.ts` and `prose.ts` have
 * none: it is reachable from `node --test`, and a rule about copy that cannot
 * be executed is a claim somebody read back by eye.
 *
 * It exists because the report already did this by hand in three places -
 * "One page is" against "12 pages are" on the gate, "of these is a page"
 * against "of these are pages" under the source table - and did not do it in
 * four others. Those four are all reachable by an ordinary visitor: a buyer
 * who drops every cluster but one runs a scan of one question, and the report
 * then said "across 1 questions" in a metric strip an agency puts in front of
 * a client. A leaderboard that finds one supplier says "1 brands in all".
 *
 * Deliberately not a pluralisation library. A noun plain "s" is wrong for
 * passes its plural explicitly; nothing here guesses at one.
 *
 * That obligation used to be a list in this comment - "brand, page, source,
 * answer, question, placement" - and nothing executed it. Measured on 20 Sep
 * 2026 it was wrong in both directions: "placement" was at no call site, and
 * tier, price, engine, domain, link and line were at one and on no list. It is
 * `plural-nouns.test.mts` now, which derives the set off source and refuses a
 * bare noun that would render "2 companys". Read the test, not a list here.
 */
export function count(n: number, singular: string, plural = singular + "s"): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** "is" or "are", for the same sentence. */
export function isAre(n: number): string {
  return n === 1 ? "is" : "are";
}
