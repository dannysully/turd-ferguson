/**
 * One validator for an address, not three.
 *
 * `src/lib/scan/domain.ts` is this file's precedent and its argument. The
 * waitlist action hand-rolled a domain regex while `normalizeDomain` and
 * `isPlausibleDomain` sat in the tree with tests over them, the two disagreed in
 * both directions, and `email-header.test.mts` now holds the negative that stops
 * it coming back. **The same file's email check was a second copy of exactly
 * that defect and nobody had counted it** - there were three, in three places
 * that all take an address from a stranger:
 *
 * | where | pattern | what it does with the address |
 * |---|---|---|
 * | `app/contact/actions.ts` | `[^\s@]+@[^\s@]+\.[^\s@]+` | reply-to on mail to us |
 * | `app/actions/waitlist.ts` | `[^\s@]+@[^\s@]+\.[a-z]{2,}` | reply-to on mail to us |
 * | `api/scan/[token]/unlock` | `[^\s@]+@[^\s@]+\.[a-z]{2,}` | `to:` on mail to *them*, a `leads` row, an `accounts` row |
 *
 * ## What the disagreement actually was, measured rather than argued
 *
 * Strictly one-directional: everything the funnel took, the contact form took.
 * Four inputs split the three, and two of the four are real addresses rather
 * than junk - `me@example.xn--p1ai` and `юзер@сайт.рф`, which is the same TLD
 * written the two ways it is written. The contact form accepted both and the
 * two funnel doors refused them. The other two splits are `me@example.c0m` and
 * `me@example.x`, which the contact form should not have been taking.
 *
 * So the merge is not a compromise between three patterns. It takes the funnel's
 * strictness about what a TLD may be and drops the funnel's assumption that a
 * TLD is ASCII, which no door meant to assert and only the copies happened to.
 *
 * ## Why this file imports nothing
 *
 * `node --test` cannot load a module that imports `server-only` or resolves `@/`,
 * and ten modules in this tree have been split for that reason. This one is a
 * pure shape check with no dependency, so the test beside it runs the real
 * function rather than retyping the pattern - which is the whole point, because
 * a test that retypes the thing it checks is the blind-tripwire recipe this
 * repo has now paid for five times.
 *
 * ## What is deliberately NOT here
 *
 * **The length bound.** It lives in `config/contact.ts` - `CONTACT_LIMITS.email`,
 * `WAITLIST_LIMITS.email`, `SCAN_LIMITS.email`, all 254 for RFC 5321 - and that
 * file is the single denominator `input-bounds.test.mts` sweeps to prove every
 * bound has a server that reads it. A second bound in here would be the exact
 * species this file exists to remove, one concern along, and it would make that
 * census able to pass over a table nothing reads. Each caller applies its own.
 *
 * This is a plausibility check and it does not pretend to be more. No regex
 * decides whether an address is deliverable; the only thing that does is sending
 * to it, which is what the verification email is for.
 */

/** Trimmed, and lowercased so a stored form and a compared form cannot drift. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * The last label of the domain.
 *
 * `\p{L}{2,}` rather than `[a-z]{2,}`, which is what makes `рф` a TLD. The
 * `u` flag is required for `\p{L}` to mean anything at all - without it the
 * escape is a syntax error, so this cannot silently degrade to matching a
 * literal "p" the way a mistyped character class would.
 *
 * The punycode alternative is separate because `xn--p1ai` holds digits and
 * hyphens and cannot be a run of letters. It is not decoration: an address is
 * carried over SMTP in its A-label form, so the punycode spelling is the one a
 * mail client is most likely to hand over.
 *
 * Two characters minimum, because every TLD that has ever been delegated is at
 * least two and a single character after a dot is a typo rather than a domain.
 */
const TLD = /^(?:xn--[a-z0-9-]{2,}|\p{L}{2,})$/u;

/**
 * Whether this could be an address.
 *
 * One `@`, by construction rather than by counting: both sides exclude it, so a
 * string with two cannot match. Neither side may hold whitespace, which is also
 * what makes a newline impossible here - the reason the three copies were all
 * written this way, and the half of header safety that is not `headerSafe`.
 */
export function isPlausibleEmail(address: string): boolean {
  const m = /^([^\s@]+)@([^\s@]+)$/.exec(address);
  if (!m) return false;

  const labels = m[2].toLowerCase().split(".");
  // A domain with no dot is a local hostname, not something mail leaves the
  // building for. An empty label is a leading, trailing or doubled dot.
  if (labels.length < 2) return false;
  if (labels.some((l) => l.length === 0)) return false;

  return TLD.test(labels[labels.length - 1]);
}
