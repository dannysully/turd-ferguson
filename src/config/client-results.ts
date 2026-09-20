/**
 * The real client figures this site publishes, named once.
 *
 * Every other number on this site is either derived from config or openly
 * labelled example data. These four are neither: they are readings from a
 * real client account, attested by Danny as the account owner, and AGENTS.md
 * puts them outside "ship it rough" for that reason - "a number about a
 * client's result" carries `[VERIFY]` until there is a dated source, and the
 * cost of a wrong one is not a scruffy page.
 *
 * They were typed as literals in four files: `home/Results.tsx`,
 * `/case-studies`, `/case-studies/vibe-retail` and `scan/HeroSequence.tsx`.
 * That is the species this tree keeps paying for - the date formatter existed
 * twice and the untested copy was the one missing a guard, the honeypot
 * existed twice and the untested copy was the one missing the field, the
 * contact address was typed thirteen times across seven files before
 * `CONTACT_EMAIL` (349dcda). Here the untested copy is `HeroSequence.tsx`,
 * which is the one surface on this site nobody has ever watched render
 * (blocked.md 15).
 *
 * And it is not a hypothetical drift. `Results.tsx` carries a paragraph
 * recording that this exact set has already drifted once: the visibility
 * figure "was published here as 25% against the full question set and on the
 * case study as 14% against both that and ChatGPT alone - three readings of
 * one number", reconciled by hand on 19 Sep 2026. A comment asking the next
 * person to remember the other copies is what `scan-shape.ts` was written to
 * replace.
 *
 * **What makes each of these a claim rather than a boast is the scope beside
 * it, so the scope is not a separate field a surface may forget.** A reading
 * is a number *and* what it was measured against; `Results.tsx` spends a
 * paragraph on why the two keyword readings must not be collapsed, because
 * showing them as one would claim #1 in eight weeks, which is not what
 * happened. `/about` publishes the general form of the same rule and calls it
 * the point of the page: *"A percentage without its denominator is not a
 * finding."*
 *
 * `client-results.test.mts` holds both halves - the figure is typed nowhere
 * else, and no published surface prints one without its scope. It found two
 * live instances of the second when it was written: the homepage printed
 * "0% to 25%" with no denominator anywhere on the page, and the case study's
 * JSON-LD `description` - a string an answer engine reads detached from the
 * page that carries the qualifier - did the same.
 */

export type ClientResult = {
  /** The figure exactly as every surface prints it. */
  value: string;
  /**
   * The shortest phrase that must accompany the figure wherever it is
   * published. Surfaces may say more - the case study says "Over eight weeks,
   * against the position at the start of the programme" - and the sweep
   * checks only that this much is there, because the alternative is a rule
   * that forbids a page from writing its own sentence.
   *
   * Lowercase and prose-shaped, so it reads correctly interpolated into a
   * label: "Money keyword, at " + scope.
   */
  scope: string;
  /** Who stood behind it and when. Not rendered; re-earned by the sweep. */
  attested: string;
};

const ATTESTED = "Danny, as the account owner, 19 Sep 2026";

/**
 * The money keyword at eight weeks and the same keyword at four months.
 *
 * Two entries rather than one on purpose. They are readings from different
 * dates: the campaign produced #4 in eight weeks and the keyword carried on
 * climbing afterwards, so a single "#83 to #1 in eight weeks" would be a
 * claim about a client's result that nothing supports.
 */
export const KEYWORD_EIGHT_WEEKS: ClientResult = {
  value: "#83 to #4",
  scope: "eight weeks",
  attested: ATTESTED,
};

export const KEYWORD_FOUR_MONTHS: ClientResult = {
  value: "#83 to #1",
  scope: "four months",
  attested: ATTESTED,
};

/**
 * The one percentage on this site that is a real client reading.
 *
 * Its denominator is ChatGPT alone, not the full question set - that was the
 * ambiguity the 19 Sep attestation settled - so the scope names the prompts
 * rather than the answers.
 */
export const CHATGPT_VISIBILITY: ClientResult = {
  value: "0% to 25%",
  scope: "tracked prompts",
  attested: ATTESTED,
};

/**
 * The AI Overview citation count.
 *
 * Deliberately outside the two sweeps below, and recorded here rather than
 * dropped silently, because a bare `"3"` cannot be censused: a single digit
 * occurs in a price, a date, a viewBox and a hex colour, so a rule matching
 * it as a literal reports the whole tree and a rule requiring a scope beside
 * it reports every page. The surfaces that print it scope it in words
 * anyway - "AI Overview citations on commercial questions" on the homepage,
 * "On commercial questions, where the placed article was named as a source"
 * on the case study - and that is prose no check here can hold. Same shape as
 * the no-op injections recorded in the harnesses: written down so the next
 * run does not re-derive it, or "fix" it by adding a rule that fires
 * everywhere.
 */
export const AI_OVERVIEW_CITATIONS: ClientResult = {
  value: "3",
  scope: "on commercial questions",
  attested: ATTESTED,
};

/** The figures whose value is distinctive enough to census. */
export const SWEPT_RESULTS: readonly ClientResult[] = [
  KEYWORD_EIGHT_WEEKS,
  KEYWORD_FOUR_MONTHS,
  CHATGPT_VISIBILITY,
];

/** Every attested figure, swept or not. */
export const CLIENT_RESULTS: readonly ClientResult[] = [...SWEPT_RESULTS, AI_OVERVIEW_CITATIONS];
