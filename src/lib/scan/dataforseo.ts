import "server-only";

import { MARKETS, type Market } from "./domain";
import { type Engine, type EngineRead, PARSERS } from "./engines";

const BASE = "https://api.dataforseo.com";

/** ISO country codes for the markets we support, for the LLM Responses engines. */
const MARKET_ISO: Record<Market, string> = { UK: "GB", US: "US" };

/** The model each LLM Responses engine is asked. Sonnet, not Opus: same answer, less spend. */
const RESPONSE_MODELS = {
  perplexity: "sonar",
  claude: "claude-sonnet-5",
} as const;

export type EngineResult = EngineRead & { cost: number };

function auth(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error("DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set.");
  }
  return Buffer.from(`${login}:${password}`).toString("base64");
}

async function post(path: string, body: unknown, timeoutMs: number): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { authorization: `Basic ${auth()}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`DataForSEO ${res.status}: ${detail.slice(0, 300)}`);
    (err as { status?: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as Record<string, unknown>;
}

type Task = {
  status_code?: number;
  status_message?: string;
  cost?: number;
  result?: Array<Record<string, unknown>> | null;
};

function firstTask(body: Record<string, unknown>): Task {
  const task = ((body.tasks as Task[] | undefined) ?? [])[0];
  if (!task) throw new Error("DataForSEO returned no task");
  if (task.status_code !== 20000) {
    throw new Error(`DataForSEO task ${task.status_code}: ${task.status_message ?? "unknown"}`);
  }
  return task;
}

/**
 * Per-engine request shape. The two families differ: the scrapers take a
 * keyword and a location code, the LLM Responses endpoints take a prompt and,
 * where supported, a country ISO code.
 *
 * The scrapers document execution times of up to 120 seconds, so their timeout
 * is generous; the whole run is bounded separately by the pipeline.
 */
function request(engine: Engine, question: string, market: Market): { path: string; body: unknown; timeoutMs: number } {
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
            depth: 20,
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
            // Capped deliberately: these endpoints bill per token, so an
            // unbounded answer is an unbounded bill.
            max_output_tokens: 1200,
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
            max_output_tokens: 1200,
            web_search: true,
          },
        ],
      };
  }
}

/**
 * The shorter of what this engine needs and what the run has left, floored so a
 * budget that has already run out still makes one honest attempt rather than
 * aborting on a zero and recording an error nobody can read.
 */
function budget(timeoutMs: number, remainingMs: number | undefined): number {
  if (typeof remainingMs !== "number") return timeoutMs;
  return Math.max(5_000, Math.min(timeoutMs, remainingMs));
}

/**
 * Ask one engine one question. Cost is whatever DataForSEO billed for the task.
 *
 * budgetMs is what is left of the whole run. The per-engine timeouts here go up
 * to 130 seconds because that is what the scrapers document, and a read started
 * near the end of a run would happily spend all of it - past the pipeline
 * deadline, past the platform ceiling, and into a function that gets killed
 * with the scan still marked running. So the shorter of the two wins, and a
 * read that cannot finish inside what is left is abandoned rather than allowed
 * to outlive the run it belongs to.
 */
export async function readEngine(
  engine: Engine,
  question: string,
  market: Market,
  budgetMs?: number,
): Promise<EngineResult> {
  const { path, body, timeoutMs } = request(engine, question, market);
  const raw = await post(path, body, budget(timeoutMs, budgetMs));
  const task = firstTask(raw);
  const cost = typeof task.cost === "number" ? task.cost : 0;
  return { ...PARSERS[engine](task.result?.[0]), cost };
}

/**
 * One call for the whole question set. Missing volumes stay null, never zero.
 *
 * This is DataForSEO's AI search volume: how often a phrase is estimated to be
 * put to AI tools each month, modelled from People Also Ask data. Nobody has
 * the engines' own logs, so an estimate is the best there is. It replaced
 * Google Ads volume, which has nothing to say about fourteen long-tail
 * questions and left the figure empty on every scan.
 */
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

export async function readSearchVolumes(
  questions: string[],
  market: Market,
  timeoutMs = 45_000,
): Promise<{ volumes: Map<string, number | null>; cost: number }> {
  const volumes = new Map<string, number | null>();
  if (!questions.length) return { volumes, cost: 0 };

  const body = await post(
    "/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live",
    [{ keywords: questions, location_code: MARKETS[market].location_code, language_code: "en" }],
    timeoutMs,
  );

  const task = firstTask(body);
  type VolumeItem = { keyword?: string; ai_search_volume?: number | null };
  const first = task.result?.[0] as { items?: VolumeItem[] } | undefined;
  for (const row of first?.items ?? []) {
    if (!row.keyword) continue;
    const v = row.ai_search_volume;
    volumes.set(volumeKey(row.keyword), typeof v === "number" ? v : null);
  }
  return { volumes, cost: typeof task.cost === "number" ? task.cost : 0 };
}
