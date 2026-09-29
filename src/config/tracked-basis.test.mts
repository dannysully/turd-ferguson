/**
 * The tracking price's basis agrees with the limits the server enforces
 * (R112, 29 Sep 2026). pricing.ts declares the cluster, prompt and keyword
 * counts as literals because the price censuses resolve them from the source;
 * limits.ts owns the numbers the API refuses on. Parsed, not imported: a
 * `.mts` test cannot load pricing.ts through the `@/` alias.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CLUSTER_BASE, CLUSTERS_PER_PACK, KEYWORDS_PER_CLUSTER, PROMPTS_PER_CLUSTER } from "../lib/tracking/limits.ts";

const source = readFileSync(new URL("./pricing.ts", import.meta.url), "utf8");
const declared = (name: string): number => {
  const m = new RegExp(`export const ${name} = (\\d+);`).exec(source);
  assert.ok(m, `pricing.ts no longer declares ${name} as a number`);
  return Number(m![1]);
};

test("the base price's clusters, prompts and keywords are the limits' base", () => {
  assert.equal(declared("TRACKED_CLUSTERS"), CLUSTER_BASE);
  assert.equal(declared("TRACKED_PROMPTS"), CLUSTER_BASE * PROMPTS_PER_CLUSTER);
  assert.equal(declared("TRACKED_KEYWORDS"), CLUSTER_BASE * KEYWORDS_PER_CLUSTER);
});

test("one pack adds what clusterLimitFor adds", () => {
  assert.equal(declared("PACK_CLUSTERS"), CLUSTERS_PER_PACK);
  assert.equal(declared("PACK_PROMPTS"), CLUSTERS_PER_PACK * PROMPTS_PER_CLUSTER);
  assert.equal(declared("PACK_KEYWORDS"), CLUSTERS_PER_PACK * KEYWORDS_PER_CLUSTER);
});

test("no surface can read the retired question count", () => {
  assert.doesNotMatch(source, /export const TRACKED_QUESTIONS\b/);
});
