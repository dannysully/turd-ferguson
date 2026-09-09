/**
 * DataForSEO client.
 *
 * Credentials come from the environment only. Never hardcode them here - this
 * repository is public.
 *
 * We use Live Google AI Mode SERP Advanced, which returns the ai_overview
 * element including a references array of the pages Google drew on to answer.
 * That references list is the whole point: it is "which sources the engines
 * cite for this topic".
 *
 * Every response carries a per-task `cost` in USD. We log the returned value
 * and never a price-list estimate.
 */

const ENDPOINT = "https://api.dataforseo.com/v3/serp/google/ai_mode/live/advanced";

/** Google location codes for the two launch markets. */
export const MARKET_LOCATION: Record<string, number> = {
  UK: 2826,
  US: 2840,
};

export type CitedSource = {
  domain: string;
  url: string;
  title: string;
};

export type ScanResult = {
  /** Whether an AI Overview appeared at all for the question. */
  overviewPresent: boolean;
  /** Distinct domains cited, in the order Google returned them. */
  sources: CitedSource[];
  /** True when the client's own domain is among the cited sources. */
  brandCited: boolean;
  /** USD, as returned by the API. Never estimated. */
  cost: number;
};

export class DataForSeoNotConfigured extends Error {}

function authHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new DataForSeoNotConfigured("DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are not set");
  }
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

/** Strip scheme, www and any path, leaving a bare host for comparison. */
export function normalizeDomain(raw: string): string {
  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .trim()
    .toLowerCase();
}

/**
 * Run one AI Overview check for a question in a market.
 *
 * Deliberately one task per call: the API mandates one task per request, and
 * one call per submission keeps the cost per scan predictable.
 */
export async function checkAiOverview({
  question,
  market,
  brandDomain,
}: {
  question: string;
  market: string;
  brandDomain: string;
}): Promise<ScanResult> {
  const location = MARKET_LOCATION[market] ?? MARKET_LOCATION.UK;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      { keyword: question.slice(0, 700), location_code: location, language_code: "en" },
    ]),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`DataForSEO returned HTTP ${res.status}`);
  }

  const payload = await res.json();
  const task = payload?.tasks?.[0];
  const cost = typeof payload?.cost === "number" ? payload.cost : 0;

  if (payload?.status_code !== 20000 || task?.status_code !== 20000) {
    throw new Error(
      `DataForSEO task failed: ${task?.status_message ?? payload?.status_message ?? "unknown"}`
    );
  }

  const items = task?.result?.[0]?.items ?? [];
  const overview = items.find((i: { type?: string }) => i?.type === "ai_overview");

  if (!overview) {
    return { overviewPresent: false, sources: [], brandCited: false, cost };
  }

  /* References sit both on the overview and on its child elements. */
  type Ref = { domain?: string; url?: string; title?: string; source?: string };
  const refs: Ref[] = [
    ...(overview.references ?? []),
    ...((overview.items ?? []) as { references?: Ref[] }[]).flatMap((el) => el?.references ?? []),
  ];

  const seen = new Set<string>();
  const sources: CitedSource[] = [];
  for (const ref of refs) {
    const domain = normalizeDomain(ref.domain ?? ref.url ?? "");
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    sources.push({ domain, url: ref.url ?? "", title: ref.title ?? ref.source ?? "" });
  }

  const brand = normalizeDomain(brandDomain);
  const brandCited = Boolean(brand) && seen.has(brand);

  return { overviewPresent: true, sources, brandCited, cost };
}
