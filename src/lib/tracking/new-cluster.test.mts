import assert from "node:assert/strict";
import { test } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { draftPrompts } from "./add-cluster.ts";
import { addCluster } from "./new-cluster.ts";

// BRIEF-3 T6 part 3c (30 Sep 2026): Start tracking this cluster refuses a
// viewer and bad prompt text before it touches the database at all.

const untouchable = new Proxy({}, { get: () => { throw new Error("the database was touched"); } }) as unknown as SupabaseClient;
const base = { clientId: "c1", tier: "tracked", keyword: "accounting software for dentists", volume: 1300, intent: "commercial", prompts: draftPrompts("accounting software for dentists"), today: "2026-09-30", by: "owner@example.com", role: "owner" };

test("a viewer, a twin prompt and a short prompt are refused before any read or write", async () => {
  assert.equal((await addCluster(untouchable, { ...base, role: "viewer" })).ok, false);
  assert.equal((await addCluster(untouchable, { ...base, prompts: [...base.prompts.slice(0, 4), base.prompts[0]] })).ok, false);
  assert.equal((await addCluster(untouchable, { ...base, prompts: ["short", ...base.prompts.slice(1)] })).ok, false);
});
