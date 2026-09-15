import "server-only";

import type { Engine } from "./engines";

/**
 * What each engine costs us per call, in USD. Measured against the live
 * DataForSEO API on 15 September 2026, not taken from a price list.
 *
 * Server-only on purpose: this is our margin, and it has no business being in
 * a JavaScript bundle a prospect can read.
 */
export const COST_PER_CALL: Record<Engine, number> = {
  google_aio: 0.0055,
  chatgpt: 0.004,
  gemini: 0.004,
  perplexity: 0.006,
  claude: 0.0471,
};

/** Estimated DataForSEO spend for one pass of `questions` questions. */
export function estimateScanCost(engines: Engine[], questions: number): number {
  return engines.reduce((total, e) => total + COST_PER_CALL[e] * questions, 0);
}
