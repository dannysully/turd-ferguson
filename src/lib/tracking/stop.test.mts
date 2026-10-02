import assert from "node:assert/strict";
import { test } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { liveOn } from "./decide.ts";
import { BULK_ID, BULK_MAX, readBulkIds, readKept, readStopForm, refuseRole, refuseStop, refuseUndo, stop, stopDay, stopReturn, undoStop } from "./stop.ts";

// DS13 (R173 pass 2, 2 Oct 2026): the Ungrouped bulk form's ticked ids.
test("readBulkIds keeps well-formed ids once each, drops the rest, caps at BULK_MAX", () => {
  assert.deepEqual(readBulkIds(["a1", "a1", "b-2", "../x", "", 7, null, BULK_ID]), ["a1", "b-2"]);
  const many = Array.from({ length: BULK_MAX + 5 }, (_, i) => `q${i}`);
  assert.equal(readBulkIds(many).length, BULK_MAX);
});

test("a bulk return carries ok of ticked beside id=selected", () => {
  const sp = new URLSearchParams({ kind: "prompt", id: BULK_ID, filter: "never" });
  const f = readStopForm((k) => sp.get(k), 80)!;
  const back = new URL(stopReturn("acme", f, "stopped", { n: 2, of: 3 }), "https://x.test");
  assert.equal(back.searchParams.get("id"), BULK_ID);
  assert.equal(back.searchParams.get("ok"), "2");
  assert.equal(back.searchParams.get("ticked"), "3");
  assert.equal(back.searchParams.get("n"), null, "n and of are the /ask toast's");
  assert.equal(back.searchParams.get("filter"), "never");
});

// BRIEF-3 T6 part 2a (30 Sep 2026): stop and Undo. One test per refusal, then
// the writers against an in-memory table set, so the rows they leave are read
// back rather than assumed.

const TODAY = "2026-09-30";

test("viewers and unknown roles are refused; owners and editors are not", () => {
  assert.equal(refuseRole("owner"), null);
  assert.equal(refuseRole("editor"), null);
  assert.match(refuseRole("viewer")!, /owners and editors/);
  assert.match(refuseRole("")!, /owners and editors/);
});

test("a stop takes effect tomorrow, so today's reading still counts and the next check skips it", () => {
  const day = stopDay(TODAY);
  assert.equal(day, "2026-10-01");
  const row = { added_on: "2026-09-01", stopped_on: day };
  assert.equal(liveOn(row, TODAY), true);
  assert.equal(liveOn(row, day), false);
});

test("stopping refuses a row that is missing or already stopped", () => {
  assert.equal(refuseStop({ stopped_on: null }), null);
  assert.match(refuseStop(null)!, /not on this client/);
  assert.match(refuseStop({ stopped_on: "2026-09-20" })!, /already stopped/);
});

test("undo works only while the stop is pending", () => {
  assert.equal(refuseUndo({ stopped_on: "2026-10-01" }, TODAY), null);
  assert.match(refuseUndo({ stopped_on: null }, TODAY)!, /not stopped/);
  assert.match(refuseUndo({ stopped_on: TODAY }, TODAY)!, /taken effect/);
  assert.match(refuseUndo({ stopped_on: "2026-09-12" }, TODAY)!, /taken effect/);
  assert.match(refuseUndo(null, TODAY)!, /not on this client/);
});

// ---- A small in-memory stand-in for the four tables the writers touch. ----

type RowT = Record<string, unknown>;
function fakeDb(tables: Record<string, RowT[]>): SupabaseClient {
  const from = (name: string) => {
    const rows = tables[name] ?? (tables[name] = []);
    const filters: ((r: RowT) => boolean)[] = [];
    let mode: "select" | "update" = "select";
    let patch: RowT = {};
    let head = false;
    const hits = () => rows.filter((r) => filters.every((f) => f(r)));
    const b = {
      select(_cols: string, opts?: { head?: boolean }) {
        head = !!opts?.head;
        return b;
      },
      update(p: RowT) {
        mode = "update";
        patch = p;
        return b;
      },
      eq(col: string, v: unknown) {
        filters.push((r) => r[col] === v);
        return b;
      },
      is(col: string, v: unknown) {
        filters.push((r) => (r[col] ?? null) === v);
        return b;
      },
      async maybeSingle() {
        return { data: hits()[0] ?? null, error: null };
      },
      async single() {
        const h = hits()[0];
        return h ? { data: h, error: null } : { data: null, error: { message: "no row" } };
      },
      then(res: (v: unknown) => void) {
        if (mode === "update") {
          for (const r of hits()) Object.assign(r, patch);
          return res({ error: null });
        }
        return res(head ? { count: hits().length, error: null } : { data: hits(), error: null });
      },
    };
    return b;
  };
  return { from } as unknown as SupabaseClient;
}

const C = "client-1";
function world() {
  return {
    client_domains: [{ id: C, cluster_limit: 2 }],
    tracked_clusters: [
      { id: "k1", client_domain_id: C, keyword_id: "kw1", stopped_on: null },
      { id: "k2", client_domain_id: C, keyword_id: "kw2", stopped_on: null },
    ],
    tracked_keywords: [
      { id: "kw1", client_domain_id: C, stopped_on: null },
      { id: "kw2", client_domain_id: C, stopped_on: null },
    ],
    tracked_questions: [
      ...[1, 2, 3, 4, 5].map((i) => ({ id: `p${i}`, client_domain_id: C, cluster_id: "k1", stopped_on: null as string | null, stopped_by: null as string | null })),
      { id: "p6", client_domain_id: C, cluster_id: "k2", stopped_on: "2026-09-12", stopped_by: "editor@example.com" },
    ],
  };
}
const base = { clientId: C, today: TODAY, by: "owner@example.com", role: "editor" };

test("a viewer's stop writes nothing", async () => {
  const w = world();
  const r = await stop(fakeDb(w), { ...base, role: "viewer", kind: "prompt", id: "p1" });
  assert.equal(r.ok, false);
  assert.equal(w.tracked_questions[0]!.stopped_on, null);
});

test("stopping a prompt sets tomorrow and who, keeps the row, and undo clears both", async () => {
  const w = world();
  const db = fakeDb(w);
  assert.deepEqual(await stop(db, { ...base, kind: "prompt", id: "p1" }), { ok: true, stoppedOn: "2026-10-01" });
  assert.equal(w.tracked_questions.length, 6);
  assert.deepEqual([w.tracked_questions[0]!.stopped_on, w.tracked_questions[0]!.stopped_by], ["2026-10-01", "owner@example.com"]);
  assert.deepEqual(await undoStop(db, { ...base, kind: "prompt", id: "p1" }), { ok: true, stoppedOn: null });
  assert.deepEqual([w.tracked_questions[0]!.stopped_on, w.tracked_questions[0]!.stopped_by], [null, null]);
});

test("a prompt on another client is not found, and nothing is written", async () => {
  const w = world();
  const r = await stop(fakeDb(w), { ...base, clientId: "client-2", kind: "prompt", id: "p1" });
  assert.equal(r.ok, false);
  assert.equal(w.tracked_questions[0]!.stopped_on, null);
});

test("undo is refused when the freed slot has been filled since", async () => {
  const w = world();
  const db = fakeDb(w);
  await stop(db, { ...base, kind: "prompt", id: "p1" });
  w.tracked_questions.push({ id: "p7", client_domain_id: C, cluster_id: "k1", stopped_on: null, stopped_by: null });
  const r = await undoStop(db, { ...base, kind: "prompt", id: "p1" });
  assert.equal(r.ok, false);
  assert.match((r as { message: string }).message, /5 of 5 live prompts/);
  assert.equal(w.tracked_questions[0]!.stopped_on, "2026-10-01");
});

test("stopping a cluster stops its keyword and live prompts on one day; undo restores those, not an older stop", async () => {
  const w = world();
  const db = fakeDb(w);
  w.tracked_questions[5]!.cluster_id = "k1";
  assert.equal((await stop(db, { ...base, kind: "cluster", id: "k1" })).ok, true);
  assert.equal(w.tracked_clusters[0]!.stopped_on, "2026-10-01");
  assert.equal(w.tracked_keywords[0]!.stopped_on, "2026-10-01");
  assert.deepEqual(w.tracked_questions.slice(0, 5).map((q) => q.stopped_on), Array(5).fill("2026-10-01"));
  assert.equal(w.tracked_questions[5]!.stopped_on, "2026-09-12");
  assert.equal(w.tracked_keywords[1]!.stopped_on, null);

  assert.match((await undoStop(db, { ...base, kind: "prompt", id: "p2" }) as { message: string }).message, /Undo the cluster/);
  assert.equal((await undoStop(db, { ...base, kind: "cluster", id: "k1" })).ok, true);
  assert.equal(w.tracked_clusters[0]!.stopped_on, null);
  assert.equal(w.tracked_keywords[0]!.stopped_on, null);
  assert.deepEqual(w.tracked_questions.slice(0, 5).map((q) => q.stopped_on), Array(5).fill(null));
  assert.equal(w.tracked_questions[5]!.stopped_on, "2026-09-12");
});

test("undoing a cluster is refused when the client is at its cluster limit again", async () => {
  const w = world();
  const db = fakeDb(w);
  await stop(db, { ...base, kind: "cluster", id: "k1" });
  w.tracked_clusters.push({ id: "k3", client_domain_id: C, keyword_id: null as unknown as string, stopped_on: null });
  const r = await undoStop(db, { ...base, kind: "cluster", id: "k1" });
  assert.equal(r.ok, false);
  assert.match((r as { message: string }).message, /limit of 2 clusters/);
  assert.equal(w.tracked_clusters[0]!.stopped_on, "2026-10-01");
});

// ---- T6 part 2b: the form the Clusters page posts, and where the route sends it back. ----

const formOf = (o: Record<string, string>) => (k: string) => (k in o ? o[k] : null);

test("the stop form is read without trusting it: bad kinds and ids are refused, page state is kept only when well formed", () => {
  assert.equal(readStopForm(formOf({ kind: "keyword", id: "a" }), 120), null);
  assert.equal(readStopForm(formOf({ kind: "prompt", id: "" }), 120), null);
  assert.equal(readStopForm(formOf({ kind: "prompt", id: "a b" }), 120), null);
  const f = readStopForm(formOf({ kind: "cluster", id: "c-1", undo: "1", from: "2026-09-03", to: "bad", compare: "month", filter: "evil", q: "x".repeat(200), open: "c-1", done: "stopped", other: "y" }), 120)!;
  assert.equal(f.kind, "cluster");
  assert.equal(f.undo, true);
  assert.deepEqual(Object.keys(f.back).sort(), ["compare", "from", "open", "q"]);
  assert.equal(f.back.q.length, 120);
  assert.equal(readStopForm(formOf({ kind: "prompt", id: "q1" }), 120)!.undo, false);
});

// R173 pass 2 (2 Oct 2026): /check's Change keyword return reads the same page state with no kind or id.
test("readKept is the page state alone, checked the same way, and needs no kind or id", () => {
  const kept = readKept(formOf({ from: "2026-09-03", to: "2026-09-30", filter: "never", q: "dent", open: "../x", kind: "cluster", card: "c-1" }), 120);
  assert.deepEqual(kept, { from: "2026-09-03", to: "2026-09-30", filter: "never", q: "dent" });
  assert.deepEqual(readKept(formOf({}), 120), {});
});

test("the route returns to the Clusters page with the toast as fixed words, never free text", () => {
  const f = readStopForm(formOf({ kind: "prompt", id: "q1", from: "2026-09-03", q: "a&b" }), 120)!;
  const url = new URL(stopReturn("tally roo", f, "stopped"), "https://x.test");
  assert.equal(url.pathname, "/app/tally%20roo/clusters");
  assert.equal(url.searchParams.get("done"), "stopped");
  assert.equal(url.searchParams.get("kind"), "prompt");
  assert.equal(url.searchParams.get("id"), "q1");
  assert.equal(url.searchParams.get("q"), "a&b");
  assert.equal(url.searchParams.get("from"), "2026-09-03");
});
