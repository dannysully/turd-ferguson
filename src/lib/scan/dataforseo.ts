import "server-only";

import { MARKETS, type Market } from "./domain";
import { parseOverview, type OverviewRead } from "./overview";

const BASE = "https://api.dataforseo.com";


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
    headers: {
      authorization: `Basic ${auth()}`,
      "content-type": "application/json",
    },
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
  const tasks = (body.tasks as Task[] | undefined) ?? [];
  const task = tasks[0];
  if (!task) throw new Error("DataForSEO returned no task");
  if (task.status_code !== 20000) {
    throw new Error(`DataForSEO task ${task.status_code}: ${task.status_message ?? "unknown"}`);
  }
  return task;
}

/**
 * One AI Overview read for one question.
 *
 * Brand matching uses the concatenated element `text`, not `markdown`: markdown
 * carries inline link URLs, and a brand whose name appears only inside a URL
 * has not been named by the Overview.
 */
export async function readOverview(question: string, market: Market, timeoutMs = 60_000): Promise<OverviewRead> {
  const body = await post(
    "/v3/serp/google/organic/live/advanced",
    [
      {
        keyword: question,
        location_code: MARKETS[market].location_code,
        language_code: "en",
        device: "desktop",
        depth: 20,
        load_async_ai_overview: true,
      },
    ],
    timeoutMs,
  );

  const task = firstTask(body);
  const cost = typeof task.cost === "number" ? task.cost : 0;
  return { ...parseOverview(task.result?.[0]), cost };
}

/** One call for the whole question set. Missing volumes stay null, never zero. */
export async function readSearchVolumes(
  questions: string[],
  market: Market,
  timeoutMs = 45_000,
): Promise<{ volumes: Map<string, number | null>; cost: number }> {
  const volumes = new Map<string, number | null>();
  if (!questions.length) return { volumes, cost: 0 };

  const body = await post(
    "/v3/keywords_data/google_ads/search_volume/live",
    [
      {
        keywords: questions,
        location_code: MARKETS[market].location_code,
        language_code: "en",
      },
    ],
    timeoutMs,
  );

  const task = firstTask(body);
  for (const row of task.result ?? []) {
    const keyword = row.keyword as string | undefined;
    if (!keyword) continue;
    const v = row.search_volume;
    volumes.set(keyword, typeof v === "number" ? v : null);
  }
  return { volumes, cost: typeof task.cost === "number" ? task.cost : 0 };
}
