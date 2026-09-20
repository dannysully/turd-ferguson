import assert from "node:assert/strict";
import { test } from "node:test";

import { formatDate } from "./format-date.ts";

/**
 * The date formatter that existed twice and disagreed with itself.
 *
 * `result-figures.test.mts` already held the month guard, but it held it for
 * the result view only - `config/posts.ts` carried a byte-identical copy
 * minus that one clause, and the blog is where the unguarded one rendered.
 * The test that existed was correct about everything it named; what it did
 * not name was the second implementation.
 *
 * The tests below point at the single module both now re-export, so the two
 * cannot drift again: a change here moves the result view and the blog
 * together or fails.
 */

test("an ISO date becomes a readable one", () => {
  assert.equal(formatDate("2026-04-30"), "30 Apr 2026");
  assert.equal(formatDate("2026-09-20"), "20 Sep 2026");
  // Both ends of the month table, which is where an off-by-one lands.
  assert.equal(formatDate("2026-01-01"), "1 Jan 2026");
  assert.equal(formatDate("2026-12-31"), "31 Dec 2026");
});

test("a full timestamp is cut to its date", () => {
  assert.equal(formatDate("2026-01-01T09:15:00.000Z"), "1 Jan 2026");
});

test("a month past twelve falls back rather than printing undefined", () => {
  /**
   * The divergence itself. Before these two copies were merged, this input
   * rendered "30 undefined 2026" on /blog and on all three post headers while
   * the result view rendered the raw string.
   */
  assert.equal(formatDate("2026-13-30"), "2026-13-30");
  assert.equal(formatDate("2026-99-01"), "2026-99-01");
});

test("a day past thirty-one falls back too", () => {
  // The same defect one field over, and it was in neither copy: an unbounded
  // day is not looked up in a table, so it was simply printed.
  assert.equal(formatDate("2026-04-99"), "2026-04-99");
  assert.equal(formatDate("2026-04-32"), "2026-04-32");
  // The boundary is inclusive - 31 is a real day and must still render.
  assert.equal(formatDate("2026-01-31"), "31 Jan 2026");
});

test("anything that is not a date comes back untouched", () => {
  assert.equal(formatDate(""), "");
  assert.equal(formatDate("not a date"), "not a date");
  assert.equal(formatDate("2026-04"), "2026-04");
  // A zero in any field is not a date. `!m` and `!d` catch these, which is
  // why the explicit range guard above does not need to.
  assert.equal(formatDate("2026-00-30"), "2026-00-30");
  assert.equal(formatDate("2026-04-00"), "2026-04-00");
  assert.equal(formatDate("0000-04-30"), "0000-04-30");
});

test("both names are the same function, so the two surfaces cannot drift", async () => {
  /**
   * The point of the merge, asserted rather than trusted. `posts.ts` cannot
   * be imported here - it pulls in `next` types and extensionless siblings -
   * so the blog half is checked by reading the re-export, and the result view
   * half is checked by identity.
   */
  const { fmtDate } = await import("../components/scan/result-figures.ts");
  assert.equal(fmtDate, formatDate, "result-figures no longer re-exports the shared formatter");

  const { readFileSync } = await import("node:fs");
  const posts = readFileSync(new URL("../config/posts.ts", import.meta.url), "utf8");
  assert.match(
    posts,
    /export \{ formatDate as formatPostDate \} from "\.\.\/lib\/format-date"/,
    "config/posts.ts has stopped re-exporting the shared formatter - if it has its own copy " +
      "again, the blog and the result view can render the same date two ways",
  );
});
