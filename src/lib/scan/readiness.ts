import "server-only";

import { type Readiness, readinessOf } from "./readiness-spec.ts";

/**
 * Everything the funnel needs to complete one scan end to end.
 *
 * The live checker renders only when all of these are present. Flipping to
 * live with a partial set is worse than staying dormant: the visitor gets a
 * domain field that accepts their brand and then fails at the reading step, or
 * refuses every submission because the bot check cannot be verified.
 *
 * The lists and the judging are in `readiness-spec.ts`, which imports nothing
 * and is what `readiness.test.mts` runs. All that is left here is the one thing
 * a test cannot supply: the real environment.
 */
export function scanReadiness(): Readiness {
  return readinessOf(process.env, process.env.NODE_ENV === "production");
}

export function scanReady(): boolean {
  return scanReadiness().ready;
}
