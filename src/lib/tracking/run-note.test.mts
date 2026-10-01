import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { MISSING_READS, partialRunNote } from "./run-note.ts";

/** R151 (1 Oct 2026): the note a screen shows when the last check shown lost reads. */

const range = { from: "2026-09-02", to: "2026-09-29" };
const run = (run_date: string, status: string) => ({ run_date, status, finished_at: `${run_date}T06:10:00Z` });

test("a partial run in the range is named, today's as today's", () => {
  assert.equal(partialRunNote(run("2026-09-29", "partial"), range, "2026-09-29"), `Today's check was partial. ${MISSING_READS}`);
  assert.match(partialRunNote(run("2026-09-20", "partial"), range, "2026-09-29")!, /^The check on 20 Sep was partial\. /);
});

test("no note for a complete run, no run, or a partial run outside the range", () => {
  assert.equal(partialRunNote(run("2026-09-29", "complete"), range, "2026-09-29"), null);
  assert.equal(partialRunNote(null, range, "2026-09-29"), null);
  assert.equal(partialRunNote(run("2026-08-30", "partial"), range, "2026-09-29"), null);
});

test("Overview, Clusters, Who is named and Cited pages all take the sentence from run-note.ts", () => {
  for (const f of ["Overview", "Clusters", "Named", "Cited"]) {
    const src = readFileSync(new URL(`../../components/app/${f}.tsx`, import.meta.url), "utf8");
    assert.match(src, /from "@\/lib\/tracking\/run-note"/, `${f} imports run-note`);
    assert.ok(!src.includes("did not come back"), `${f} has no copy of the sentence`);
  }
});
