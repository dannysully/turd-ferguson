import assert from "node:assert/strict";
import { test } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ADMIN_LIMITS } from "./decide.ts";
import { fillSlot, refuseSlotText } from "./slot.ts";

// BRIEF-3 T6 part 2c (30 Sep 2026): the free slot. The text rule, then the
// refusals that stop before any write, against a stand-in that records writes.

test("a slot's prompt is 8 to ADMIN_LIMITS.question characters and not a twin of a live one", () => {
  assert.match(refuseSlotText("short", [])!, /8 to/);
  assert.match(refuseSlotText("x".repeat(ADMIN_LIMITS.question + 1), [])!, /8 to/);
  assert.match(refuseSlotText("  Which app is best?  ", ["which app is best?"])!, /already tracked/);
  assert.equal(refuseSlotText("Which app is best for a sole trader?", ["Which app is best?"]), null);
});

function recording(cluster: { stopped_on: string | null } | null) {
  const writes: string[] = [];
  const db = {
    from(name: string) {
      const b = {
        select: () => b,
        eq: () => b,
        is: () => b,
        maybeSingle: async () => ({ data: name === "tracked_clusters" ? cluster : null, error: null }),
        insert: () => {
          writes.push(name);
          return b;
        },
        then: (ok: (v: unknown) => void) => ok({ data: [], error: null }),
      };
      return b;
    },
  } as unknown as SupabaseClient;
  return { db, writes };
}

const P = { clientId: "c", clusterId: "k", angle: "sector", text: "Which app suits a design studio?", today: "2026-09-30", by: "a@example.com", role: "owner" };

test("a viewer, another client's cluster and a stopped cluster are refused before any write", async () => {
  for (const [cluster, role, msg] of [
    [{ stopped_on: null }, "viewer", /owners and editors/],
    [null, "owner", /not on this client/],
    [{ stopped_on: "2026-10-01" }, "editor", /is stopped/],
  ] as const) {
    const { db, writes } = recording(cluster);
    const r = await fillSlot(db, { ...P, role });
    assert.equal(r.ok, false);
    assert.match((r as { message: string }).message, msg);
    assert.deepEqual(writes, []);
  }
});
