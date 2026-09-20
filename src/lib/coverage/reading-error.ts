// Relative and extensionful: this module is loaded by `node --test` as well as
// by Next, and `@/` does not resolve there. Same reason `config/scan-shape.ts`
// imports `../lib/scan/engines.ts` - do not tidy either back.
import { REAPED_FREE } from "../scan/stall.ts";

/**
 * What a benchmark reader may be told about a reading that failed.
 *
 * `scans.error` is an operator's column. `pipeline.ts` writes
 * `describeAnthropicError(err).slice(0, 500)` into it, and that function ends
 * in `err instanceof Error ? err.message : String(err)` - so whatever was
 * thrown lands there whole. Its named branches are no safer: one returns "the
 * ANTHROPIC_API_KEY is not valid", two more interpolate a raw SDK message, and
 * `stall.ts` writes its own sentence in from the reaper.
 *
 * **The scan funnel closed this exact door and wrote down why.** The header of
 * `api/scan/[token]/status/route.ts` is the argument in full: those columns
 * hold "a Postgres message naming our tables, or a vendor error naming the
 * vendor and the state of our account with them", all of which "reached the
 * screen verbatim, because the flow printed `data.error` as the failure
 * message". The poll stopped handing them out; the detail stays in the column
 * for the admin page and in the log.
 *
 * `/coverage-check/[token]` printed `reading.error` verbatim. Same column, same
 * content, a page reachable by anyone holding the token and asking for no
 * credential at all - `RerunButton.tsx` says so in its own first line. The
 * benchmark was built after the scan poll was narrowed, so it never inherited
 * the narrowing, and nothing joined the two: `stall.ts` stated as a fact that
 * the admin page "is the only thing that reads those columns". It was the
 * premise, and it was false.
 *
 * ---
 *
 * **An allowlist, not a filter.** A denylist of things not to print has to be
 * right about every message a future dependency can throw. This is right by
 * construction about all of them: a reason is published only if it was written
 * to be read by the person who typed the domain in, and anything else becomes
 * the sentence below. The cost is that a reason we could have named arrives
 * generic until somebody adds it here, which is the direction to fail in.
 *
 * The page's own comment is still honoured and is the reason this is not just
 * a deletion: "a benchmark that failed for a reason we can name and does not
 * name it sends the reader to guess at their own campaign."
 */

/** When we have nothing we are willing to print, we say so rather than guess. */
export const UNNAMED = "We could not complete it.";

/**
 * The reasons that are already visitor copy, each rewritten for this page.
 *
 * The reaper's sentence is imported rather than retyped. It is the two-copies
 * species otherwise, and the untested copy is always the one that goes stale -
 * a reworded reap would silently fall off this list and start reading as
 * `UNNAMED`, which looks exactly like working correctly.
 */
const PUBLISHED: ReadonlyArray<readonly [string, string]> = [
  [
    REAPED_FREE,
    "It ran past the time we allow a reading and was stopped before it could record anything.",
  ],
  [
    "the language model is rate limited",
    "One of the engines was rate limiting us at the time, so the questions could not all be asked.",
  ],
];

/**
 * The stored reason, or the generic one.
 *
 * Exact match, not a prefix or an `includes`. Two of `describeAnthropicError`'s
 * branches are template literals opening with a fixed phrase and closing with a
 * raw vendor message, so a prefix test would publish the whole string on the
 * strength of its first four words - which is the defect with an extra step.
 */
export function visitorReason(stored: string | null | undefined): string {
  if (!stored) return UNNAMED;
  const trimmed = stored.trim();
  for (const [reason, copy] of PUBLISHED) if (trimmed === reason) return copy;
  return UNNAMED;
}

/** The published set, for the test that keeps it joined to what writes it. */
export const PUBLISHED_REASONS = PUBLISHED.map(([reason]) => reason);
