import assert from "node:assert/strict";
import { test } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { adminEdit, adminStop, refuseAdminText } from "./admin-edit.ts";

// R102 (Danny, 29 Sep 2026, danny.md line 94): /admin/tracking edits a prompt's
// or keyword's text only while it has no reading, and stop keeps the row.
// The writers run against an in-memory table set and the rows are read back.

const TODAY = "2026-09-30";
const C = "client-1";
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

function world() {
  return {
    client_domains: [{ id: C, domain: "tallyroo.com", brand_name: "Tallyroo", brand_aliases: [] }],
    tracked_questions: [
      { id: "q1", client_domain_id: C, text: "Whats the best invoicing app?", stopped_on: null },
      { id: "q2", client_domain_id: C, text: "Which bookkeeping app do accountants use?", stopped_on: null },
      { id: "q9", client_domain_id: "other", text: "Someone else's prompt here", stopped_on: null },
    ],
    tracked_keywords: [{ id: "k1", client_domain_id: C, keyword: "invoicing sofware", stopped_on: null }],
    tracking_answers: [{ id: "a1", question_id: "q2" }],
    tracking_serp: [] as RowT[],
  };
}

test("the new text keeps the slot's rule for a prompt and 2 to 120 characters for a keyword", () => {
  assert.equal(refuseAdminText("prompt", "What is the best invoicing app?"), null);
  assert.match(refuseAdminText("prompt", "short")!, /characters/);
  assert.equal(refuseAdminText("keyword", "invoicing software"), null);
  assert.match(refuseAdminText("keyword", "x")!, /2 to/);
});

test("edit fixes a typo while there is no reading, and only the text changes", async () => {
  const w = world();
  const db = fakeDb(w);
  assert.equal((await adminEdit(db, { kind: "prompt", clientId: C, id: "q1", text: "What's the best invoicing app?" })).ok, true);
  assert.equal(w.tracked_questions[0].text, "What's the best invoicing app?");
  assert.equal((await adminEdit(db, { kind: "keyword", clientId: C, id: "k1", text: "invoicing software" })).ok, true);
  assert.equal(w.tracked_keywords[0].keyword, "invoicing software");
});

test("edit is refused once a reading exists and for another client's row; a branded prompt is saved", async () => {
  const w = world();
  const db = fakeDb(w);
  const read = await adminEdit(db, { kind: "prompt", clientId: C, id: "q2", text: "Which bookkeeping apps do accountants use?" });
  assert.equal(read.ok, false);
  assert.match(read.message, /already has readings/);
  assert.equal(w.tracked_questions[1].text, "Which bookkeeping app do accountants use?");
  w.tracking_serp.push({ id: "s1", keyword_id: "k1" });
  assert.match((await adminEdit(db, { kind: "keyword", clientId: C, id: "k1", text: "invoicing software" })).message, /already has readings/);
  assert.match((await adminEdit(db, { kind: "prompt", clientId: C, id: "q9", text: "A rewrite of someone else's" })).message, /not on this client/);
  assert.equal(w.tracked_questions[2].text, "Someone else's prompt here");
  // R133 (Danny, 30 Sep 2026, danny.md line 118): branded prompts are the client's choice, so this
  // edit went from refused to saved. /admin/tracking flags it ("names the brand"; branded.test.mts).
  assert.equal((await adminEdit(db, { kind: "prompt", clientId: C, id: "q1", text: "Is Tallyroo a good invoicing app?" })).ok, true);
  assert.equal(w.tracked_questions[0].text, "Is Tallyroo a good invoicing app?");
});

test("stop sets tomorrow and keeps the row and its readings; a second stop is refused", async () => {
  const w = world();
  const db = fakeDb(w);
  const done = await adminStop(db, { kind: "prompt", clientId: C, id: "q2", today: TODAY });
  assert.equal(done.ok, true);
  assert.equal(w.tracked_questions.length, 3);
  assert.equal(w.tracked_questions[1].stopped_on, "2026-10-01");
  assert.equal((w.tracked_questions[1] as RowT).stopped_by, "nomada");
  assert.equal(w.tracking_answers.length, 1);
  assert.match((await adminStop(db, { kind: "prompt", clientId: C, id: "q2", today: TODAY })).message, /already stopped/);
  assert.match((await adminStop(db, { kind: "keyword", clientId: C, id: "nope", today: TODAY })).message, /not on this client/);
  assert.equal((await adminStop(db, { kind: "keyword", clientId: C, id: "k1", today: TODAY })).ok, true);
  assert.equal(w.tracked_keywords[0].stopped_on, "2026-10-01");
});
