import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { isFreePassDead, isGatedPassDead, stallCutoffIso, stallStamp, STALL_AFTER_MS } from "./stall.ts";

/**
 * The stall judgement, and the two screens that have to agree with it.
 *
 * The defect this covers is not a crash. The pipeline writes `failed` on every
 * failure it can see; the one it cannot see is the function being killed
 * mid-flight, which leaves the row at `running` with a step it will never
 * leave. Both paths that decide what a visitor is shown - the status poll and
 * the server render of /scan/[token] - reported that column verbatim, so the
 * visitor got the progress screen on first load and again on every reload,
 * waiting on a row nothing would ever touch. The confirm route then refused the
 * re-run its own screen was offering, because `running` is excluded from the
 * compare-and-swap that queues a scan. The offer was a loop.
 *
 * Two halves here, and the second is the one that will still be true in a
 * month: the judgement itself, and a source check that the paths which decide
 * what a visitor sees still route through it. A helper nothing calls fixes
 * nothing, and the original bug was precisely "the column, read straight".
 */

const MIN = 60_000;

test("a null stamp is never stale, in either direction", () => {
  // The safe direction, deliberately. An undatable row is left alone rather
  // than failed on a guess - and rows queued before `queued_at` existed are
  // exactly that. Closing a scan we cannot date is worse than leaving it.
  assert.equal(isFreePassDead({ status: "running", started_at: null }), false);
  assert.equal(isFreePassDead({ status: "queued", queued_at: null }), false);
  assert.equal(isFreePassDead({ status: "running" }), false);
  assert.equal(isGatedPassDead({ gated_status: "running", unlocked_at: null }), false);
});

test("an unparseable stamp reads as undatable, not as stale", () => {
  assert.equal(isFreePassDead({ status: "running", started_at: "not a date" }), false);
  assert.equal(isGatedPassDead({ gated_status: "queued", unlocked_at: "" }), false);
});

test("running is dated by started_at, queued by queued_at, and neither reads the other's column", () => {
  const now = Date.parse("2026-09-19T22:00:00.000Z");
  const old = new Date(now - 10 * MIN).toISOString();
  const fresh = new Date(now - 5_000).toISOString();

  assert.equal(stallStamp({ status: "running", started_at: old, queued_at: fresh }), old);
  assert.equal(stallStamp({ status: "queued", started_at: old, queued_at: fresh }), fresh);

  // A scan that was queued ten minutes ago and claimed five seconds ago is
  // live. Reading started_at for the queued state, or queued_at for the
  // running one, would fail it - and runScan's claim is `.eq("status",
  // "queued")`, so a wrongly-failed queued row loses the pass entirely.
  assert.equal(isFreePassDead({ status: "running", started_at: fresh, queued_at: old }, now), false);
  assert.equal(isFreePassDead({ status: "queued", started_at: old, queued_at: fresh }, now), false);
  assert.equal(isFreePassDead({ status: "running", started_at: old, queued_at: fresh }, now), true);
});

test("only an unfinished status is ever judged dead", () => {
  const now = Date.parse("2026-09-19T22:00:00.000Z");
  const ancient = new Date(now - 60 * MIN).toISOString();

  // A complete scan keeps its started_at for ever, and it is always older than
  // any cutoff. Testing the stamp without the status would fail every finished
  // scan in the table on the first sweep.
  for (const status of ["complete", "failed", "pending_topic"]) {
    assert.equal(isFreePassDead({ status, started_at: ancient, queued_at: ancient }, now), false, status);
  }
  for (const gated of ["none", "complete", "failed"]) {
    assert.equal(isGatedPassDead({ gated_status: gated, unlocked_at: ancient }, now), false, gated);
  }
});

test("the cutoff sits above the platform ceiling and below the screen's own timer", () => {
  // 300s is the ceiling every route that starts a pass declares, so nothing can
  // move the row past it. Under that and the sweep races a live pass.
  assert.ok(STALL_AFTER_MS > 300_000, "the cutoff must be above the 300s function ceiling");
  // ScanFlow's STUCK_MS. Above it and the progress screen offers "you can run
  // it again" while the confirm route would still refuse - which is the loop
  // this whole change exists to remove.
  assert.ok(STALL_AFTER_MS < 6 * 60_000, "the cutoff must be under ScanFlow's six-minute STUCK_MS");
});

test("the boundary is the cutoff, and it is exclusive", () => {
  const now = Date.parse("2026-09-19T22:00:00.000Z");
  const exactly = new Date(now - STALL_AFTER_MS).toISOString();
  const older = new Date(now - STALL_AFTER_MS - 1_000).toISOString();

  assert.equal(isFreePassDead({ status: "running", started_at: exactly }, now), false);
  assert.equal(isFreePassDead({ status: "running", started_at: older }, now), true);
  assert.equal(stallCutoffIso(now), exactly);
});

/**
 * The source half.
 *
 * `reads.test.mts` and `writes.test.mts` both read the source rather than hold
 * a list of call sites that would drift out of date, and the same argument
 * applies here with more force: the bug was a column read straight, so what has
 * to stay true is that the paths deciding what a visitor sees do not read it
 * straight again.
 */
const read = (p: string) => readFileSync(new URL("../../../" + p, import.meta.url), "utf8");

test("the status poll and the page render both route the status through the judgement", () => {
  for (const path of ["src/app/api/scan/[token]/status/route.ts", "src/app/scan/[token]/page.tsx"]) {
    const src = read(path);
    assert.match(src, /isFreePassDead\(/, path + " must judge the free pass rather than report the column");
    assert.match(src, /isGatedPassDead\(/, path + " must judge the gated pass rather than report the column");
    // Both judgements need the stamps in the select, and a missing column comes
    // back undefined rather than throwing - so the judgement would silently
    // answer false for every row and the bug would be back with the helper
    // still in place, which is the failure this pair of checks is really for.
    assert.match(src, /started_at/, path + " must select started_at");
    assert.match(src, /queued_at/, path + " must select queued_at");
    assert.match(src, /unlocked_at/, path + " must select unlocked_at");
  }
});

test("the confirm route stamps queued_at and closes a dead pass before it refuses one", () => {
  const src = read("src/app/api/scan/[token]/confirm/route.ts");
  // Without the stamp, `queued` is undatable and a row stuck there can never be
  // closed or re-confirmed by anything.
  assert.match(src, /queued_at: new Date\(\)\.toISOString\(\)/, "the queued state must be dated");
  assert.match(src, /reapStalledFreePass\(/, "a killed pass must be closed so the re-run can be accepted");
  // The compare-and-swap that queues the scan must still exclude the three live
  // statuses. Losing it turns a double-submitted form back into two billed
  // scans writing answers against one id.
  assert.match(src, /\.not\("status", "in", "\(queued,running,complete\)"\)/, "the queue must stay a compare-and-swap");
});

/**
 * The body of a function, without the docstring above it.
 *
 * Counting a pattern across the whole file was the first version of the check
 * below, and it was wrong in the way a sweep must not be: `.select("id")`
 * appears in the prose explaining why it is needed, so the count was one too
 * high and the assertion would have passed with the call itself deleted from
 * one of the two reaps. Read the bodies.
 */
function body(src: string, fn: string): string {
  const at = src.indexOf("export async function " + fn);
  assert.ok(at >= 0, fn + " must exist");
  const end = src.indexOf("\n}", at);
  assert.ok(end > at, fn + " must have a body");
  return src.slice(at, end);
}

test("the sweep reads back what it wrote, on both sides", () => {
  const src = read("src/lib/scan/stall.ts");

  for (const fn of ["reapStalledFreePass", "reapStalledGatedPass"]) {
    // PostgREST answers an UPDATE that matched no rows with a 2xx, so without
    // .select() a reap that closed nothing is indistinguishable from one that
    // closed a scan - and this job reports a count as its whole output.
    assert.match(body(src, fn), /\.select\("id"\)/, fn + " must read back the rows it touched");
    // And the error has to be bound to the write, which is what the sweep in
    // writes.test.mts checks for every write in the tree. Asserted here as
    // well because these two are the writes this file is about.
    assert.match(body(src, fn), /const \{ data, error \} = await/, fn + " must look at its own error");
  }

  // The status is in the filter on every reap, so a row that moved between the
  // read and the write is not written over.
  assert.match(body(src, "reapStalledFreePass"), /\.eq\("status", status\)/);
  assert.match(body(src, "reapStalledGatedPass"), /\.in\("gated_status", \["queued", "running"\]\)/);
});
