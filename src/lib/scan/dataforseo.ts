import "server-only";

import { budgetFor, firstTask, requestFor, taskCost } from "./dataforseo-request.ts";
import { type Market } from "./domain";
import { type Engine, type EngineRead, PARSERS } from "./engines";

/**
 * The HTTP half. Everything that can be decided without a credential or a
 * socket - what we ask for, how long we allow it, how a task is read back -
 * lives in `dataforseo-request.ts`, where `request-shape.test.mts` runs it.
 * Do not move any of it back: this module imports `server-only`, and Node's
 * runner cannot load that, so anything in here has no executor.
 */

const BASE = "https://api.dataforseo.com";

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
 * `readSearchVolumes` was here and came out on 20 September 2026.
 *
 * It called `/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live`
 * once per scan for the whole question set. Removed on Danny's instruction: it
 * was a serial third-party round trip inside the phase the progress bar holds
 * at 85%, for a figure this site already tells visitors it does not use.
 *
 * That last part is not a rationalisation after the fact - it is published
 * copy on two surfaces and it predates the removal. The homepage FAQ answers
 * "Why is there no search volume anywhere in this?" with a dated reading
 * ("On a real scan we ran in September, every question came back at zero
 * volume"), and the confirm screen's own footer reads "No search volume
 * against them, deliberately". The code was paying for the number on every
 * scan while both surfaces said we do not use one; the removal closes that,
 * and no copy changed because none of it was false.
 *
 * `request-shape.test.mts` refuses the endpoint by name. A removal rots back
 * in, so it is asserted rather than merely done.
 */
