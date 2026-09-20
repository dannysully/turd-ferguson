/**
 * The pure half of the DataForSEO client: what we ask for, how long we allow
 * it, and how we read a task back. No credentials and no network, so Node's
 * own runner can execute it.
 *
 * It was split out of `dataforseo.ts` on 20 September 2026 for exactly that
 * reason. That file is `server-only` and the only module in the tree that
 * spends money, and it was one of the source files no test named - a test
 * written in place would have had to retype every request body to compare
 * against, which is how this repo's four blind tripwires were built. What is
 * here is the half a test can run; `dataforseo.ts` keeps `auth()`, `post()`
 * and the two exported reads.
 *
 * Imports are relative and carry the extension deliberately. Node strips types
 * but does not resolve `@/` or an extensionless specifier, and tidying either
 * back is what makes this module untestable again.
 */

import { MARKETS, type Market } from "./domain.ts";
import type { Engine } from "./engines.ts";

/** ISO country codes for the markets we support, for the LLM Responses engines. */
export const MARKET_ISO: Record<Market, string> = { UK: "GB", US: "US" };

/** The model each LLM Responses engine is asked. Sonnet, not Opus: same answer, less spend. */
export const RESPONSE_MODELS = {
  perplexity: "sonar",
  claude: "claude-sonnet-5",
} as const;

/**
 * How deep the Google SERP is read.
 *
 * Named because five doc comments across four files describe the rank this
 * produces as "the top twenty", and until now every one of them was a number
 * typed in prose next to a number typed in a request body, with nothing
 * connecting the two. Change the request and the descriptions keep their old
 * value; that is this repo's own defect species and `request-shape.test.mts`
 * now fails when they disagree.
 *
 * The organic results come back on the same response as the Overview, so the
 * depth costs nothing extra.
 */
export const SERP_DEPTH = 20;

/**
 * Per-answer output ceiling on the LLM Responses endpoints, which bill per
 * token. An unbounded answer is an unbounded bill.
 */
export const MAX_OUTPUT_TOKENS = 1200;

/** The floor `budgetFor` will not go below, so a spent budget still tries once. */
export const MIN_BUDGET_MS = 5_000;

export type EngineRequest = { path: string; body: unknown; timeoutMs: number };

/**
 * Per-engine request shape. The two families differ: the scrapers take a
 * keyword and a location code, the LLM Responses endpoints take a prompt and,
 * where supported, a country ISO code.
 *
 * The scrapers document execution times of up to 120 seconds, so their timeout
 * is generous; the whole run is bounded separately by the pipeline.
 */
export function requestFor(engine: Engine, question: string, market: Market): EngineRequest {
  switch (engine) {
    case "google_aio":
      return {
        path: "/v3/serp/google/organic/live/advanced",
        timeoutMs: 60_000,
        body: [
          {
            keyword: question,
            location_code: MARKETS[market].location_code,
            language_code: "en",
            device: "desktop",
            depth: SERP_DEPTH,
            load_async_ai_overview: true,
          },
        ],
      };

    case "chatgpt":
      return {
        path: "/v3/ai_optimization/chat_gpt/llm_scraper/live/advanced",
        timeoutMs: 130_000,
        body: [
          {
            keyword: question,
            location_code: MARKETS[market].location_code,
            language_code: "en",
            // Without this the model answers from memory and cites nothing,
            // which is not the question we are asking.
            force_web_search: true,
          },
        ],
      };

    case "gemini":
      return {
        path: "/v3/ai_optimization/gemini/llm_scraper/live/advanced",
        timeoutMs: 130_000,
        body: [
          {
            keyword: question,
            location_code: MARKETS[market].location_code,
            language_code: "en",
          },
        ],
      };

    case "perplexity":
      return {
        path: "/v3/ai_optimization/perplexity/llm_responses/live",
        timeoutMs: 130_000,
        body: [
          {
            user_prompt: question,
            model_name: RESPONSE_MODELS.perplexity,
            max_output_tokens: MAX_OUTPUT_TOKENS,
            temperature: 0.2,
            web_search_country_iso_code: MARKET_ISO[market],
          },
        ],
      };

    case "claude":
      return {
        path: "/v3/ai_optimization/claude/llm_responses/live",
        timeoutMs: 130_000,
        body: [
          {
            user_prompt: question,
            model_name: RESPONSE_MODELS.claude,
            max_output_tokens: MAX_OUTPUT_TOKENS,
            web_search: true,
            /**
             * The same market parameter Perplexity takes, on the same endpoint
             * family. It was absent, which made Claude the one engine of the
             * five whose request carried nothing derived from the market: a UK
             * scan asked it a question with no country at all, and a "who are
             * the best suppliers" answer with no country is a different answer.
             *
             * It has never shipped a wrong reading, because `GATED_ENGINES` is
             * empty and `FREE_ENGINES` leaves Claude out, so nothing has run
             * this branch on a live scan. It would have on the first run after
             * anyone put Claude in either list from `app_settings`, which is a
             * jsonb edit and no deploy.
             */
            web_search_country_iso_code: MARKET_ISO[market],
          },
        ],
      };
  }
}

/**
 * The shorter of what this engine needs and what the run has left, floored so a
 * budget that has already run out still makes one honest attempt rather than
 * aborting on a zero and recording an error nobody can read.
 *
 * The `Number.isFinite` guard is not decoration. `remainingMs` arrives as
 * `deadline - Date.now()`, and `typeof NaN === "number"` is true - so a NaN
 * reached `Math.min`, survived `Math.max`, and was handed to
 * `AbortSignal.timeout`, which coerces it to 0 and aborts the read before the
 * request is sent. Every engine read for the rest of the pass would have
 * failed instantly with a TimeoutError, on a scan already marked running and
 * already billed for whatever went out before it.
 */
export function budgetFor(timeoutMs: number, remainingMs: number | undefined): number {
  if (!Number.isFinite(remainingMs as number)) return timeoutMs;
  return Math.max(MIN_BUDGET_MS, Math.min(timeoutMs, remainingMs as number));
}

export type Task = {
  status_code?: number;
  status_message?: string;
  cost?: number;
  result?: Array<Record<string, unknown>> | null;
};

/** DataForSEO's "everything is fine" task status. Anything else is an error. */
export const TASK_OK = 20000;

export function firstTask(body: Record<string, unknown>): Task {
  const tasks = body.tasks;
  const task = (Array.isArray(tasks) ? (tasks as Task[]) : [])[0];
  if (!task) throw new Error("DataForSEO returned no task");
  if (task.status_code !== TASK_OK) {
    throw new Error(`DataForSEO task ${task.status_code}: ${task.status_message ?? "unknown"}`);
  }
  return task;
}

/**
 * What the task billed. A missing or non-numeric cost is zero, and so is a
 * negative one - a cost that moves the run's spend total downwards is the one
 * shape that can talk the daily cap into allowing a scan it should refuse.
 */
export function taskCost(task: Task): number {
  const c = task.cost;
  return typeof c === "number" && Number.isFinite(c) && c > 0 ? c : 0;
}

/**
 * How a question is keyed into the volume map, on both sides.
 *
 * DataForSEO lowercases every keyword it echoes back. The questions we send are
 * only lowercase by convention: the prompt asks the model to write them that
 * way, and the confirm screen lets a visitor edit any of them and type their
 * own, where a capital is the norm rather than the exception. So the map was
 * keyed on the API's lowercased string and read with ours, and any question
 * carrying a capital - a market, a product name, anything somebody typed -
 * looked up nothing and was stored as a null volume.
 *
 * That is the silent kind of wrong. A null volume is also exactly what a
 * question with no measured volume looks like, so the report could not tell a
 * measurement we lost from a measurement that does not exist, and neither could
 * anyone reading it.
 */
export function volumeKey(question: string): string {
  return question.trim().toLowerCase();
}

type VolumeItem = { keyword?: string; ai_search_volume?: number | null };

/**
 * The volume map for one task's result. Missing volumes stay null, never zero -
 * a measured zero and an absent measurement are different findings and the
 * report shows them differently.
 */
export function collectVolumes(task: Task): Map<string, number | null> {
  const volumes = new Map<string, number | null>();
  const first = task.result?.[0] as { items?: VolumeItem[] } | undefined;
  for (const row of first?.items ?? []) {
    if (!row.keyword) continue;
    const v = row.ai_search_volume;
    volumes.set(volumeKey(row.keyword), typeof v === "number" ? v : null);
  }
  return volumes;
}
