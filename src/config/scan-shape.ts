// Relative, and with the extension, so Node's own runner can load this module:
// it strips types but resolves neither the `@/` alias nor an extensionless
// specifier. Same move engines.ts made on `./domain.ts`, for the same reason -
// this file decides every number the homepage prints about a scan and had no
// executor while it could not be imported. tsconfig allows the .ts specifier
// and noEmit means none of it reaches a build artefact.
import { ENGINE_SPECS, FREE_ENGINES } from "../lib/scan/engines.ts";

/**
 * How the site describes the shape of a scan.
 *
 * Every number and every engine name a marketing page prints about the scan
 * comes from here, because three of them had gone stale the same way. 3586cbf
 * moved Perplexity into the free pass and Claude out of it; the homepage kept
 * two worked examples that named Claude and never named Perplexity, one of
 * them under a column headed "Which engines". /about, whose whole subject is
 * scoping a figure to its denominator, illustrated the rule with "70 answers,
 * across 14 questions and 5 engines" - a denominator no scan this product runs
 * can produce.
 *
 * opengraph-image.tsx and what-is-aeo already derived theirs, and the comment
 * on the first says why: a typed count is a claim about what the product does
 * that nothing keeps true. This is that claim, named once.
 */

/**
 * How many questions a scan asks, defined here and nowhere else.
 *
 * It lived here and in lib/scan/anthropic.ts, as 14 in both, with a comment
 * on this line asking whoever changed one to remember the other. That file is
 * server-only and pulls the Anthropic SDK along behind it, so a marketing page
 * cannot import it to print a number - hence the copy. The fix is the other
 * direction: this module is already the client-safe one, so the number sits
 * here and anthropic.ts re-exports it as QUESTION_COUNT.
 *
 * What the duplicate risked is the whole point of this file. The prompt asks
 * the model for exactly QUESTION_COUNT questions and the response schema
 * validates on it; the homepage, HomeFaq and /about print QUESTIONS. Change
 * the pipeline on its own and every page on the site quotes a number the
 * product has stopped doing, with nothing failing to say so.
 */
export const QUESTIONS = 5;
// Five since 24 September 2026, down from fourteen. Danny: fourteen read as too
// many and too niche. Five is one per question kind, each written as a buyer
// asking for a recommendation, which is what makes an engine name suppliers at
// all. It is also one wave: 5 x 4 engines = 20 reads against CONCURRENCY 28,
// where fourteen was two.

/** Engines a free scan reads. */
export const FREE_ENGINE_COUNT = FREE_ENGINES.length;

/** Question x engine: the denominator under any share-of-answers figure. */
export const FREE_ANSWERS = QUESTIONS * FREE_ENGINE_COUNT;

/** Their labels, in the order a scan runs them. */
export const FREE_ENGINE_LABELS = FREE_ENGINES.map((e) => ENGINE_SPECS[e].label);

/** "a, b, c and d". */
export function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

/**
 * The engines a worked-example row names, picked by position in the free set
 * rather than by name.
 *
 * Position is what makes the example unable to drift. A name typed into the
 * row is a second copy of the engine list that nothing reconciles with the
 * first; a position past the end of a shortened set simply drops out, so the
 * example says less rather than saying something untrue.
 */
export function pickEngines(picks: readonly number[]): string[] {
  return picks.map((i) => FREE_ENGINE_LABELS[i]).filter((l) => Boolean(l));
}

/** "2 of 4", counted over what the row names rather than typed beside it. */
export function namedOf(picks: readonly number[]): string {
  return pickEngines(picks).length + " of " + FREE_ENGINE_COUNT;
}
