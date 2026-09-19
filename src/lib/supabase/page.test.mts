import assert from "node:assert/strict";
import { test } from "node:test";

import { PAGE, selectAll } from "./page.ts";

/**
 * `selectAll` is the loop under the paid report, the placement count and both
 * spend ceilings, and every way it can fail is silent: it returns a short list
 * that looks exactly like a complete one.
 *
 * The case that matters is a server whose `db-max-rows` is below `PAGE`. That
 * is a project setting nothing in this repo can read, so it was carried as an
 * open question rather than a fact, and the old loop - stop on the first page
 * shorter than `PAGE` - was correct only if the answer was "at least 1000".
 * These fake a server at several ceilings so the question does not need an
 * answer.
 */

/** A fake PostgREST that holds `total` rows and never returns more than `cap`. */
function server(total: number, cap: number) {
  let requests = 0;
  const page = (from: number, to: number) => {
    requests += 1;
    const want = Math.min(to - from + 1, cap);
    const rows: { id: number }[] = [];
    for (let i = from; i < Math.min(from + want, total); i++) rows.push({ id: i });
    return Promise.resolve({ data: rows, error: null });
  };
  return { page, requests: () => requests };
}

test("reads every row when the server's ceiling is below the page size", async () => {
  // The old loop returned 500 here and called it the whole table.
  const s = server(1200, 500);
  const rows = await selectAll<{ id: number }>(s.page);
  assert.equal(rows.length, 1200);
  assert.deepEqual(
    rows.map((r) => r.id),
    Array.from({ length: 1200 }, (_, i) => i),
  );
});

test("reads every row at the default ceiling", async () => {
  const s = server(2500, PAGE);
  const rows = await selectAll<{ id: number }>(s.page);
  assert.equal(rows.length, 2500);
  assert.equal(rows[0].id, 0);
  assert.equal(rows[2499].id, 2499);
});

test("a table that is an exact multiple of the page size does not stop early", async () => {
  const s = server(PAGE * 2, PAGE);
  const rows = await selectAll<{ id: number }>(s.page);
  assert.equal(rows.length, PAGE * 2);
});

test("no row is read twice and none is skipped across pages", async () => {
  const s = server(1337, 300);
  const rows = await selectAll<{ id: number }>(s.page);
  assert.equal(new Set(rows.map((r) => r.id)).size, 1337);
});

test("an empty table costs one request and returns nothing", async () => {
  const s = server(0, PAGE);
  assert.deepEqual(await selectAll(s.page), []);
  assert.equal(s.requests(), 1);
});

test("a short table costs the read plus the one that proves the end", async () => {
  const s = server(12, PAGE);
  const rows = await selectAll<{ id: number }>(s.page);
  assert.equal(rows.length, 12);
  assert.equal(s.requests(), 2);
});

test("a null data field is treated as the end, not as a crash", async () => {
  const rows = await selectAll(() => Promise.resolve({ data: null, error: null }));
  assert.deepEqual(rows, []);
});

test("an error throws rather than returning a short list", async () => {
  await assert.rejects(
    () => selectAll(() => Promise.resolve({ data: null, error: { message: "boom" } })),
    /boom/,
  );
});

test("an error on a later page throws rather than returning the pages before it", async () => {
  // The failure mode this guards: a mid-read error swallowed into a partial
  // list is a truncated report that nothing on the page says is truncated.
  let calls = 0;
  await assert.rejects(
    () =>
      selectAll<{ id: number }>((from) => {
        calls += 1;
        if (calls > 1) return Promise.resolve({ data: null, error: { message: "gone" } });
        const rows = Array.from({ length: PAGE }, (_, i) => ({ id: from + i }));
        return Promise.resolve({ data: rows, error: null });
      }),
    /gone/,
  );
});
