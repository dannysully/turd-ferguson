import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { code } from "../source-read.mts";

import {
  REPORT_MAIL_COOLDOWN_MS,
  reportMailWaitMessage,
  reportMailWaitMs,
} from "./report-mail-limit.ts";

/**
 * The cooldown in front of the only send on this site that mails an address
 * nobody confirmed.
 *
 * Danny settled item 5 on 20 September 2026 at 19:45 - the report goes straight
 * out, no verify step - and the first of his four conditions is this limit,
 * because "without it this is a form that mails arbitrary people on request".
 *
 * **Every rule here is about the direction a wrong answer fails in**, which is
 * the only thing that makes this different from any other cooldown. A window
 * that reads "clear" when it should not have costs a message to a stranger; one
 * that reads "wait" when it should not costs a visitor a quarter of an hour on
 * a copy of a page they are looking at. So the three inputs that are not a
 * timestamp in the past - null, unparseable, and in the future - do not get one
 * answer between them: null is the ordinary case and clears, and the other two
 * refuse.
 *
 * **What these cannot see**, said here rather than found later: this file holds
 * the decision and not the read. Whether the route asks the right question -
 * the caller's own hash, on *other* scans, before the write - is in
 * `route.ts`, which imports `@/lib/supabase/admin` and so cannot be loaded by
 * this runner. The last two rules read that file as source instead, which is a
 * weaker check than executing it and is the reason they are written to fail on
 * the specific shapes that would make the limit inert.
 */

const HOUR = 3_600_000;

test("a caller who has never asked may send", () => {
  assert.equal(reportMailWaitMs(null, Date.now()), 0);
  assert.equal(reportMailWaitMs(undefined, Date.now()), 0);
});

test("a request older than the window clears it", () => {
  const now = Date.parse("2026-09-20T19:45:00.000Z");
  assert.equal(reportMailWaitMs(new Date(now - REPORT_MAIL_COOLDOWN_MS).toISOString(), now), 0);
  assert.equal(reportMailWaitMs(new Date(now - HOUR).toISOString(), now), 0);
});

test("a request inside the window leaves exactly the remainder", () => {
  const now = Date.parse("2026-09-20T19:45:00.000Z");
  const asked = new Date(now - 60_000).toISOString();
  assert.equal(reportMailWaitMs(asked, now), REPORT_MAIL_COOLDOWN_MS - 60_000);
});

/**
 * One millisecond either side of the boundary.
 *
 * **Flipping the `>=` in the module to `>` is a no-op**, measured rather than
 * reasoned: at `elapsed === COOLDOWN` the else branch computes `COOLDOWN -
 * elapsed`, which is 0, so the two comparisons agree at every input. Recorded
 * because a boundary is usually exactly where a comparison's strictness shows,
 * and because a no-op injection quietly dropped reads afterwards as a blind
 * test. It is neither - there is no defect here to catch.
 */
test("the window ends rather than nearly ending", () => {
  const now = Date.parse("2026-09-20T19:45:00.000Z");
  assert.equal(reportMailWaitMs(new Date(now - REPORT_MAIL_COOLDOWN_MS).toISOString(), now), 0);
  assert.equal(reportMailWaitMs(new Date(now - REPORT_MAIL_COOLDOWN_MS + 1).toISOString(), now), 1);
});

/**
 * Every rule in this file derives its expectation from the constant, which is
 * right - fifteen minutes is Danny's judgement to move, not a property.
 *
 * The cost of that is the one thing it cannot see: **setting the constant to 0
 * turns the limit off and passes everything above**, because a window of
 * nothing is consistent with itself. So the floor is asserted separately and is
 * deliberately far below the live value. It is not pinning the number; it is
 * refusing the value that makes this file decoration.
 */
test("the cooldown is a real window, not a constant that happens to be read", () => {
  assert.ok(
    REPORT_MAIL_COOLDOWN_MS >= 60_000,
    `a ${REPORT_MAIL_COOLDOWN_MS}ms window is not a cooldown - this door then mails on request`,
  );
});

/**
 * A corrupt stamp refuses. The alternative is that one unreadable row turns the
 * limit off for the caller it belongs to, which is the flattering direction and
 * the one this repo keeps paying for.
 */
test("an unparseable stamp fails closed", () => {
  const now = Date.now();
  assert.equal(reportMailWaitMs("not a date", now), REPORT_MAIL_COOLDOWN_MS);
  assert.equal(reportMailWaitMs("", now), 0, "empty is absent, not corrupt");
});

/**
 * Clock skew between this process and the database reads as a stamp in the
 * future. Subtracting would make it read as long ago - a negative elapsed is
 * always `>=` nothing - so a row a second ahead would clear a window it has not
 * entered.
 */
test("a stamp in the future fails closed rather than reading as long ago", () => {
  const now = Date.parse("2026-09-20T19:45:00.000Z");
  assert.equal(reportMailWaitMs(new Date(now + 5_000).toISOString(), now), REPORT_MAIL_COOLDOWN_MS);
});

test("the wait is rounded up to whole minutes and never says zero", () => {
  assert.match(reportMailWaitMessage(1), /\b1 minute\b/);
  assert.match(reportMailWaitMessage(60_000), /\b1 minute\b/);
  assert.match(reportMailWaitMessage(60_001), /\b2 minutes\b/);
  assert.match(reportMailWaitMessage(REPORT_MAIL_COOLDOWN_MS), /\b15 minutes\b/);
});

/**
 * The refusal must not tell the reader about a message it did not send them.
 *
 * One address can be a whole company, so the caller inside the window is very
 * often not the person reading the screen. "We already sent yours" would then
 * be a statement about a stranger's mail, to somebody who cannot check it.
 */
test("the refusal claims nothing about the earlier send", () => {
  const m = reportMailWaitMessage(REPORT_MAIL_COOLDOWN_MS);
  for (const word of ["already sent", "your report is", "we sent you"]) {
    assert.ok(!m.toLowerCase().includes(word), `the refusal should not say "${word}": ${m}`);
  }
});

// ---------------------------------------------------------------- the route

const ROOT = new URL("../../../", import.meta.url).pathname;
const ROUTE = "src/app/api/scan/[token]/email-report/route.ts";

/**
 * Read as source with its prose stripped, because every claim below is about
 * what the route DOES and this file's own header argues the same shapes in
 * English one screen up. A comment describing the query satisfies a check for
 * the query - the cut this repo has now paid for eight times.
 *
 * Throws rather than skipping if the route moves. A rule that quietly stops
 * having a subject is the blind test this page keeps finding.
 */
function routeSource(): string {
  return code(readFileSync(join(ROOT, ROUTE), "utf8"));
}

/**
 * The limit is only a limit if it counts the caller who asked.
 *
 * `scans.ip_hash` is whoever *started* the scan, and the two come apart by
 * design: `/api/scan/start` holds a 30-day `(domain, market)` cache, so a
 * visitor scanning a domain somebody else already scanned is handed that row
 * and that token without inserting one of their own. A cooldown reading
 * `ip_hash` would find nothing for exactly the caller it is written for.
 *
 * So the rule is not "the route hashes an IP" - it is that the column it reads
 * and the column it writes are both the one this route stamps.
 */
test("the cooldown counts on the caller who asked, not the caller who scanned", () => {
  const src = routeSource();
  assert.match(src, /\.eq\("report_email_ip_hash", ipHash\)/, "the read must key on the asker's hash");
  assert.match(src, /report_email_ip_hash: ipHash/, "and the write must be what it later reads");
  assert.ok(
    !/\.eq\("ip_hash"/.test(src),
    "ip_hash is whoever started the scan, which the domain cache makes a different person",
  );
});

/**
 * And across scans rather than within one.
 *
 * Without the `.neq`, the query can only ever match the row being posted to -
 * which is already bounded by `report_email_sent_at`, one message per scan,
 * ever. The limit would pass every test above and hold nothing, because the
 * case Danny named is a caller holding several tokens.
 */
test("the cooldown looks at other scans, which is the only thing it adds", () => {
  assert.match(
    routeSource(),
    /\.neq\("id", scan\.id\)/,
    "a cooldown that only sees this scan duplicates the per-scan bound and adds nothing",
  );
});
