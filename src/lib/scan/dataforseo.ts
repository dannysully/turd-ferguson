import "server-only";

import {
  budgetFor,
  collectVolumes,
  firstTask,
  requestFor,
  taskCost,
  volumeKey,
} from "./dataforseo-request.ts";
import { MARKETS, type Market } from "./domain";
import { type Engine, type EngineRead, PARSERS } from "./engines";

/**
 * The HTTP half. Everything that can be decided without a credential or a
 * socket - what we ask for, how long we allow it, how a task is read back -
 * lives in `dataforseo-request.ts`, where `request-shape.test.mts` runs it.
 * Do not move any of it back: this module imports `server-only`, and Node's
 * runner cannot load that, so anything in here has no executor.
 */

const BASE = "https://api.dataforseo.com";

export { volumeKey };

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

/**
 * Ask one engine one question. Cost is whatever DataForSEO billed for the task.
 *
 * budgetMs is what is left of the whole run. The per-engine timeouts go up to
 * 130 seconds because that is what the scrapers document, and a read started
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
  const { path, body, timeoutMs } = requestFor(engine, question, market);
  const raw = await post(path, body, budgetFor(timeoutMs, budgetMs));
  const task = firstTask(raw);
  return { ...PARSERS[engine](task.result?.[0]), cost: taskCost(task) };
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
export async function readSearchVolumes(
  questions: string[],
  market: Market,
  timeoutMs = 45_000,
): Promise<{ volumes: Map<string, number | null>; cost: number }> {
  if (!questions.length) return { volumes: new Map<string, number | null>(), cost: 0 };

  const body = await post(
    "/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live",
    [{ keywords: questions, location_code: MARKETS[market].location_code, language_code: "en" }],
    timeoutMs,
  );

  const task = firstTask(body);
  return { volumes: collectVolumes(task), cost: taskCost(task) };
}
