import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  MARKET_ISO,
  MAX_OUTPUT_TOKENS,
  MIN_BUDGET_MS,
  RESPONSE_MODELS,
  SERP_DEPTH,
  TASK_OK,
  budgetFor,
  collectVolumes,
  firstTask,
  requestFor,
  taskCost,
  volumeKey,
  type Task,
} from "./dataforseo-request.ts";
import { MARKETS, type Market } from "./domain.ts";
import { ENGINES } from "./engines.ts";

/**
 * The only module in this tree that spends money had no executor until
 * 20 September 2026.
 *
 * `dataforseo.ts` is `server-only`, so Node's runner cannot load it, and it was
 * one of the source files named by no test - swept for text by the four walking
 * sweeps, with nothing anywhere running the behaviour. Its pure half is now
 * `dataforseo-request.ts` and this file runs it.
 *
 * Nothing here retypes a request body to compare against. Every expectation is
 * derived: the engine list off `ENGINES`, the location codes off `MARKETS`, the
 * country codes off `MARKET_ISO`, the depth off `SERP_DEPTH`. A test that
 * duplicates the value it is checking is true by construction - this repo has
 * shipped four of those - so what is asserted here is the *shape*, and the one
 * place a literal appears it is read back out of the source file rather than
 * typed.
 */

const QUESTION = "Who are the best analytics consultants for Shopify stores?";
const MARKET_LIST = Object.keys(MARKETS) as Market[];

/** The single task object every DataForSEO endpoint here is posted. */
function taskOf(engine: (typeof ENGINES)[number], market: Market = "UK"): Record<string, unknown> {
  const { body } = requestFor(engine, QUESTION, market);
  assert.ok(Array.isArray(body), `${engine}: the body must be an array of tasks`);
  assert.equal(body.length, 1, `${engine}: one question is one task`);
  return body[0] as Record<string, unknown>;
}

// ───────────────────────────── the request shape ─────────────────────────────

test("every engine has a request, and no two share a path", () => {
  const paths = new Set<string>();
  for (const engine of ENGINES) {
    const req = requestFor(engine, QUESTION, "UK");
    assert.ok(req, `${engine} builds no request at all`);
    assert.match(req.path, /^\/v3\//, `${engine}: path is not a v3 endpoint`);
    assert.ok(req.timeoutMs > 0, `${engine}: no timeout`);
    assert.ok(!paths.has(req.path), `${engine} reuses another engine's path: ${req.path}`);
    paths.add(req.path);
  }
  assert.equal(paths.size, ENGINES.length);
});

test("every engine is asked the question verbatim", () => {
  for (const engine of ENGINES) {
    const task = taskOf(engine);
    const asked = task.keyword ?? task.user_prompt;
    assert.equal(asked, QUESTION, `${engine} did not send the question under keyword or user_prompt`);
  }
});

/**
 * The assertion that found the defect this file was written for.
 *
 * Four of the five engines took something derived from the market - a
 * `location_code` on the scrapers, a country ISO on Perplexity - and Claude
 * took nothing, on the same endpoint family as Perplexity and with
 * `web_search: true` set. A UK scan asked it with no country at all, and "who
 * are the best suppliers" answered without a country is a different answer.
 *
 * It had never shipped a wrong reading: `GATED_ENGINES` is empty and
 * `FREE_ENGINES` leaves Claude out, so nothing has run that branch on a live
 * scan. It would have on the first run after anyone added Claude to either
 * list, which is a jsonb edit in `app_settings` and no deploy - the same shape
 * as every other defect `settings-merge.ts` was split out to catch.
 */
test("every engine's request changes with the market", () => {
  assert.ok(MARKET_LIST.length > 1, "this test needs two markets to compare");
  const [a, b] = MARKET_LIST;
  for (const engine of ENGINES) {
    assert.notDeepEqual(
      requestFor(engine, QUESTION, a),
      requestFor(engine, QUESTION, b),
      `${engine} sends an identical request for ${a} and ${b}, so its answer is not a reading of either market`,
    );
  }
});

test("the market reaches the request as the value MARKETS and MARKET_ISO hold", () => {
  for (const market of MARKET_LIST) {
    for (const engine of ENGINES) {
      const task = taskOf(engine, market);
      const code = task.location_code;
      const iso = task.web_search_country_iso_code;
      assert.ok(
        code !== undefined || iso !== undefined,
        `${engine}/${market}: neither a location code nor a country ISO`,
      );
      if (code !== undefined) assert.equal(code, MARKETS[market].location_code, `${engine}/${market}`);
      if (iso !== undefined) assert.equal(iso, MARKET_ISO[market], `${engine}/${market}`);
    }
  }
});

test("every LLM Responses engine is capped and named, so no answer is an unbounded bill", () => {
  for (const engine of ENGINES) {
    const task = taskOf(engine);
    if (!("user_prompt" in task)) continue;
    assert.equal(task.max_output_tokens, MAX_OUTPUT_TOKENS, `${engine} is not capped`);
    const model = (RESPONSE_MODELS as Record<string, string | undefined>)[engine];
    assert.ok(model, `${engine} posts to an llm_responses endpoint with no entry in RESPONSE_MODELS`);
    assert.equal(task.model_name, model, `${engine} asks a model RESPONSE_MODELS does not name`);
  }
});

/**
 * The ladder. `depth` is typed in one request body and described in prose in
 * four other files as "the top twenty"; nothing connected the two, so changing
 * the request would have left every one of those descriptions stating a number
 * the scan no longer measures. A fixed rung named in prose beside a fixed rung
 * typed in code is this repo's own defect species.
 *
 * Read out of the sources rather than typed here, so this fails on either side
 * moving.
 */
test("the SERP depth and the prose that describes it agree", () => {
  const WORDS: Record<number, string> = { 10: "ten", 20: "twenty", 30: "thirty" };
  const word = WORDS[SERP_DEPTH];
  assert.ok(word, `SERP_DEPTH is ${SERP_DEPTH} and this test has no word for it - add one`);

  assert.equal(taskOf("google_aio").depth, SERP_DEPTH, "the request no longer sends SERP_DEPTH");

  const files = [
    "src/lib/scan/pipeline.ts",
    "src/lib/scan/contract.ts",
    "src/lib/scan/unlock.ts",
    "src/components/scan/ScanFlow.tsx",
  ];
  let found = 0;
  for (const file of files) {
    const text = readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8");
    for (const m of text.matchAll(/top (\w+)/gi)) {
      const said = m[1].toLowerCase();
      if (!/^\d+$/.test(said) && !Object.values(WORDS).includes(said)) continue;
      found += 1;
      const asNumber = /^\d+$/.test(said) ? Number(said) : SERP_DEPTH;
      assert.equal(
        /^\d+$/.test(said) ? asNumber : said,
        /^\d+$/.test(said) ? SERP_DEPTH : word,
        `${file} describes the Google rank as "top ${said}" and the request reads ${SERP_DEPTH}`,
      );
    }
  }
  assert.ok(found > 3, `only ${found} descriptions of the depth were found - the census has gone blind`);
});

// ──────────────────────────────── the budget ────────────────────────────────

test("the budget is the shorter of the two, floored, and survives a NaN", () => {
  const engineNeeds = 130_000;

  assert.equal(budgetFor(engineNeeds, undefined), engineNeeds, "no run budget means the engine's own");
  assert.equal(budgetFor(engineNeeds, 200_000), engineNeeds, "a longer run budget does not extend a read");
  assert.equal(budgetFor(engineNeeds, 40_000), 40_000, "a shorter run budget wins");
  assert.equal(budgetFor(engineNeeds, 0), MIN_BUDGET_MS, "a spent budget still tries once");
  assert.equal(budgetFor(engineNeeds, -90_000), MIN_BUDGET_MS, "an overrun budget still tries once");

  /**
   * `remainingMs` is `deadline - Date.now()` and `typeof NaN === "number"`, so
   * a NaN passed the old guard, survived both Math calls and reached
   * `AbortSignal.timeout`, which coerces it to 0. Every remaining read in the
   * pass would have aborted before its request was sent - on a scan already
   * marked running, with the calls already counted against the spend ceiling.
   */
  assert.equal(budgetFor(engineNeeds, Number.NaN), engineNeeds, "a NaN budget must not abort the read");
  assert.equal(budgetFor(engineNeeds, Number.POSITIVE_INFINITY), engineNeeds);
});

// ───────────────────────────── reading a task back ─────────────────────────────

const okTask: Task = { status_code: TASK_OK, cost: 0.0025, result: [{ items: [] }] };

test("firstTask refuses everything that is not one successful task", () => {
  assert.deepEqual(firstTask({ tasks: [okTask] }), okTask);

  assert.throws(() => firstTask({}), /no task/, "a response with no tasks key");
  assert.throws(() => firstTask({ tasks: null }), /no task/, "a null tasks list");
  assert.throws(() => firstTask({ tasks: [] }), /no task/, "an empty tasks list");
  assert.throws(() => firstTask({ tasks: {} as unknown as Task[] }), /no task/, "tasks as an object");

  /**
   * Asserted on the message, because the message is the only thing the
   * `Array.isArray` guard changes.
   *
   * Without it, `("x" ?? [])[0]` is the string "x", which is truthy, so the
   * next line reads `status_code` off a string and throws `DataForSEO task
   * undefined` - a sentence that names a task status DataForSEO never sent,
   * for a response that carried no task at all. That message is sliced into
   * `scan_answers.error`, the one column whose job is to say which kind of
   * failure this was, so a wrong diagnosis there is the whole cost.
   *
   * The injection that reverted the guard was MISSED on the first run of the
   * harness for exactly the reason `77a4a5b` records: a guard can be real and
   * still have no observable effect on the *value*. Both versions throw. Find
   * what the guard actually changes or the assertion is decoration.
   */
  assert.throws(() => firstTask({ tasks: "x" as unknown as Task[] }), /no task/, "tasks as a string");

  assert.throws(
    () => firstTask({ tasks: [{ status_code: 40501, status_message: "Invalid Field" }] }),
    /40501/,
    "a task that failed must not be read as a result",
  );
  assert.throws(() => firstTask({ tasks: [{ cost: 1 }] }), /undefined/, "a task with no status at all");
});

test("a cost that is not a positive finite number is zero", () => {
  assert.equal(taskCost(okTask), 0.0025);
  assert.equal(taskCost({ status_code: TASK_OK }), 0, "no cost field");
  assert.equal(taskCost({ cost: "0.01" as unknown as number }), 0, "a cost as a string");
  assert.equal(taskCost({ cost: Number.NaN }), 0, "a NaN cost");
  assert.equal(taskCost({ cost: Number.POSITIVE_INFINITY }), 0, "an infinite cost");
  /**
   * A negative cost is the one shape that can talk the daily cap into allowing
   * a scan it should refuse: `spend.dfsCost += read.cost` runs against a
   * ceiling, so a single negative read subsidises every read after it.
   */
  assert.equal(taskCost({ cost: -5 }), 0, "a negative cost must not credit the run");
});

// ───────────────────────────── the volume map ─────────────────────────────

test("a question is found whatever case it was typed in", () => {
  const typed = "Best CRM for UK Estate Agents";
  const task: Task = {
    status_code: TASK_OK,
    // DataForSEO lowercases every keyword it echoes back.
    result: [{ items: [{ keyword: typed.toLowerCase(), ai_search_volume: 140 }] }],
  };
  assert.equal(collectVolumes(task).get(volumeKey(typed)), 140);
  assert.equal(collectVolumes(task).get(typed), undefined, "the raw string must not be the key");
});

test("volumeKey is stable across the padding a pasted question carries", () => {
  assert.equal(volumeKey("  Best CRM  "), volumeKey("best crm"));
});

test("an absent measurement and a measured zero stay different findings", () => {
  const task: Task = {
    status_code: TASK_OK,
    result: [
      {
        items: [
          { keyword: "measured zero", ai_search_volume: 0 },
          { keyword: "no measurement", ai_search_volume: null },
          { keyword: "field absent" },
          { ai_search_volume: 99 },
        ],
      },
    ],
  };
  const volumes = collectVolumes(task);

  assert.equal(volumes.get("measured zero"), 0, "a measured zero must survive");
  assert.equal(volumes.get("measured zero") ?? null, 0, "the pipeline's ?? must not turn a zero into null");
  assert.equal(volumes.get("no measurement"), null);
  assert.equal(volumes.get("field absent"), null);
  assert.equal(volumes.size, 3, "a row with no keyword has nothing to key on and is dropped");
});

test("a task with no result at all is an empty map, not a throw", () => {
  assert.equal(collectVolumes({ status_code: TASK_OK }).size, 0);
  assert.equal(collectVolumes({ status_code: TASK_OK, result: null }).size, 0);
  assert.equal(collectVolumes({ status_code: TASK_OK, result: [] }).size, 0);
});
