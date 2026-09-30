import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { clusterRank, clusterState } from "../../components/scan/result-figures.ts";
import { asFull } from "./full-payload.ts";

/**
 * A real /full response, trimmed to one row per list and with the brand name
 * replaced: /api/scan/00862d12fdfc4d0d42502dfebc3831b7/full, read 30 Sep 2026
 * (R125). Its shape is what the server sends, not what FullPayload says.
 */
const REAL = JSON.parse(readFileSync(new URL("./full-payload.fixture.json", import.meta.url), "utf8"));

/**
 * Keys /full sends that asFull deliberately leaves off: ScanFlow reads
 * gated_engines and gated_status off the response itself, `unlocked` is the
 * route's own answer, and nothing on the result renders brands_by_engine.
 */
const READ_ELSEWHERE = new Set(["unlocked", "gated_engines", "gated_status", "brands_by_engine"]);

test("asFull carries the cluster keyword off a real /full response (R125)", () => {
  const full = asFull(REAL);
  assert.equal(full.cluster_keyword, true);
  assert.deepEqual(full.cluster, REAL.cluster);
  // What toResult hands the result: cluster_keyword = full.cluster.
  const result = { cluster_keyword: full.cluster ?? null };
  assert.equal(clusterState(result), "chosen");
  assert.equal(clusterRank(result), "Not in top 20");
});

test("asFull keeps every key /full sends that a screen reads", () => {
  const full = asFull(REAL) as Record<string, unknown>;
  const sent = Object.keys(REAL).filter((k) => !READ_ELSEWHERE.has(k));
  // Floor: brands, sources, questions, cluster_keyword, cluster, opportunities.
  assert.ok(sent.length >= 6, `only ${sent.length} keys read off the fixture`);
  for (const k of sent) assert.ok(k in full, `asFull drops "${k}", which /full sends`);
});

test("asFull on a scan from before C1 has no cluster", () => {
  const full = asFull({ brands: [], sources: [], questions: [] });
  assert.equal(full.cluster, null);
  assert.equal(full.cluster_keyword, false);
  assert.equal(clusterState({ cluster_keyword: full.cluster ?? null }), null);
});
