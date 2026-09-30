import assert from "node:assert/strict";
import { test } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { editPrompts, readEdits, refuseEdits } from "./edit.ts";
import { namesBrandIn } from "./limits.ts";

// BRIEF-3 T6 part 2d (30 Sep 2026): the pending cluster editor. The form read,
// the text rules, and the writer refusing before any write, against a stand-in.

test("only p-<id> fields are read, at most 5", () => {
  const e = readEdits([["p-a1", "One"], ["text", "x"], ["p-bad id", "y"], ["p-b2", "Two"], ...Array.from({ length: 6 }, (_, i) => [`p-z${i}`, "z"] as [string, string])]);
  assert.deepEqual(e.slice(0, 2), [{ id: "a1", text: "One" }, { id: "b2", text: "Two" }]);
  assert.equal(e.length, 5);
});

const CUR = new Map([
  ["a", "Which invoicing app is best?"],
  ["b", "Which invoicing app suits a sole trader?"],
]);

test("an edit is refused for a short text, a twin in the cluster, or a prompt outside it; unchanged fields are dropped", () => {
  assert.match(refuseEdits([{ id: "a", text: "short" }], CUR) as string, /8 to/);
  assert.match(refuseEdits([{ id: "a", text: " which invoicing app suits a sole trader? " }], CUR) as string, /already tracked/);
  assert.match(refuseEdits([{ id: "x", text: "Some other prompt here" }], CUR) as string, /not a live prompt/);
  assert.deepEqual(refuseEdits([{ id: "a", text: " Which invoicing app is best? " }, { id: "b", text: "Which invoicing app suits a studio?" }], CUR), {
    changed: [{ id: "b", text: "Which invoicing app suits a studio?" }],
  });
});

function recording(p: { cluster: { stopped_on: string | null } | null; readings: number }) {
  const writes: string[] = [];
  const db = {
    from(name: string) {
      const b = {
        select: () => b,
        eq: () => b,
        is: () => b,
        maybeSingle: async () => ({ data: name === "tracked_clusters" ? p.cluster : null, error: null }),
        // A client row, should anything read it (the branded guard did until R133, 30 Sep 2026). Tallyroo is the fixture's made-up client.
        single: async () => ({ data: name === "client_domains" ? { domain: "tallyroo.com", brand_name: "Tallyroo", brand_aliases: [] } : null, error: null }),
        update: () => {
          writes.push(name);
          return b;
        },
        then: (ok: (v: unknown) => void) =>
          ok(name === "tracking_answers" ? { count: p.readings, error: null } : { data: [...CUR].map(([id, text]) => ({ id, text })), error: null }),
      };
      return b;
    },
  } as unknown as SupabaseClient;
  return { db, writes };
}

const E = [{ id: "a", text: "Which invoicing app is best for a studio?" }];

test("a viewer, another client's cluster, a stopped cluster and a prompt with readings are refused before any write", async () => {
  for (const [cluster, role, readings, msg] of [
    [{ stopped_on: null }, "viewer", 0, /owners and editors/],
    [null, "owner", 0, /not on this client/],
    [{ stopped_on: "2026-10-01" }, "editor", 0, /is stopped/],
    [{ stopped_on: null }, "owner", 3, /already has readings/],
  ] as const) {
    const { db, writes } = recording({ cluster, readings });
    const r = await editPrompts(db, { clientId: "c", clusterId: "k", edits: E, role });
    assert.equal(r.ok, false);
    assert.match((r as { message: string }).message, msg);
    assert.deepEqual(writes, []);
  }
});

test("a prompt with no reading is rewritten in place", async () => {
  const { db, writes } = recording({ cluster: { stopped_on: null }, readings: 0 });
  assert.deepEqual(await editPrompts(db, { clientId: "c", clusterId: "k", edits: E, role: "editor" }), { ok: true, changed: 1 });
  assert.deepEqual(writes, ["tracked_questions"]);
});

// R133 (Danny, 30 Sep 2026, danny.md line 118): branded prompts are the
// client's choice. This test asserted a refusal until then. The page puts the
// "Names the brand" chip on the prompt instead (branded.test.mts).
test("an edit that names the brand is saved: tracking it is the client's choice", async () => {
  const { db, writes } = recording({ cluster: { stopped_on: null }, readings: 0 });
  const r = await editPrompts(db, { clientId: "c", clusterId: "k", edits: [{ id: "a", text: "What does Tallyroo charge a studio?" }], role: "editor" });
  assert.deepEqual(r, { ok: true, changed: 1 });
  assert.deepEqual(writes, ["tracked_questions"]);
  assert.ok(namesBrandIn("What does Tallyroo charge a studio?", { brand: "Tallyroo", domain: "tallyroo.com" }), "and it is one the chip flags");
});
