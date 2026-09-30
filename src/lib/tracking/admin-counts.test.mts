import assert from "node:assert/strict";
import { test } from "node:test";

import { liveOn } from "./decide.ts";
import { trackingCounts } from "./limits.ts";

// R101 (30 Sep 2026): the counts on each client's /admin/tracking line, read
// against stubbed rows rather than the database.

const TODAY = "2026-09-30";
const q = (added_on: string, stopped_on: string | null = null) => ({ added_on, stopped_on });

test("live prompts and keywords are counted against the limits cluster_limit gives", () => {
  const n = trackingCounts({
    clusterLimit: 10,
    today: TODAY,
    prompts: [q("2026-09-01"), q("2026-09-01"), q("2026-09-01", "2026-09-20"), q("2026-10-01")],
    keywords: [{ stopped_on: null }, { stopped_on: "2026-09-20" }],
  });
  assert.deepEqual(n, { prompts: 3, promptLimit: 50, checkedToday: 2, keywords: 1, keywordLimit: 10 });
});

test("a pack raises both limits, and a prompt stopped for tomorrow is off the count but still read today", () => {
  const prompts = [q("2026-09-01", "2026-10-01"), q("2026-09-01")];
  const n = trackingCounts({ clusterLimit: 15, today: TODAY, prompts, keywords: [] });
  assert.equal(n.promptLimit, 75);
  assert.equal(n.keywordLimit, 15);
  assert.equal(n.prompts, 1);
  assert.equal(n.checkedToday, 2);
  assert.equal(n.checkedToday, prompts.filter((p) => liveOn(p, TODAY)).length, "the same rule the runner reads by");
});
