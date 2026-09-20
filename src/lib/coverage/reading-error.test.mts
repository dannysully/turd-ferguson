import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { code, sourceFiles } from "../source-read.mts";
import { REAPED_FREE } from "../scan/stall.ts";
import { PUBLISHED_REASONS, UNNAMED, visitorReason } from "./reading-error.ts";

/**
 * The operator's column, and the page that printed it to whoever had the link.
 *
 * `api/scan/[token]/status/route.ts` argued this whole case already, in its own
 * header, when the scan poll stopped carrying `error` and `gated_error`: those
 * columns hold "a Postgres message naming our tables, or a vendor error naming
 * the vendor and the state of our account with them", and all of it "reached
 * the screen verbatim, because the flow printed `data.error` as the failure
 * message". The narrowing was to the *response*. Nothing narrowed the column.
 *
 * The campaign benchmark was built after that, selects `error` in
 * `coverage/reading.ts`, and rendered `{reading?.error}` on
 * `/coverage-check/[token]` - a page reachable with a token and no credential
 * at all. Same column, same content, same class of reader, and the door the
 * scan funnel had deliberately shut was open one product over.
 *
 * **What kept it open was a sentence.** `stall.ts` said the admin page "is the
 * only thing that reads those columns - the public status poll deliberately
 * stopped handing them out". The second clause is true; the first was false the
 * day the benchmark shipped, and joining a true clause to a false one is what
 * made it read as settled. Found by `docs/prose-claims.mjs` and by reading the
 * file the comment is *about* rather than the comment.
 *
 * Three rules, and the third is the one that stops this recurring: a value rule
 * over `visitorReason` would have passed on the old tree, because the old tree
 * never called it.
 */

test("nothing an operator wrote for an operator reaches the page", () => {
  /**
   * The four shapes `describeAnthropicError` can produce, plus what a bare
   * throw leaves behind.
   *
   * A typed list of inputs, and that is sound here in a way it would not be in
   * a census: `visitorReason` is an ALLOWLIST, so a branch added to
   * `describeAnthropicError` tomorrow is refused without this file knowing it
   * exists. These are proof the list behaves, not a denominator. The last case
   * is the point of the whole file - an arbitrary string is refused, which is
   * the property a denylist could never have.
   */
  const OPERATOR_ONLY = [
    "the ANTHROPIC_API_KEY is not valid",
    "bad request to the language model: messages.0.content.0: unexpected field",
    "language model error 529: Overloaded",
    'could not store the answers: duplicate key value violates unique constraint "scan_citations_pkey"',
    "fetch failed",
    "anything at all that nobody has thought of yet",
  ];

  for (const stored of OPERATOR_ONLY) {
    assert.equal(
      visitorReason(stored),
      UNNAMED,
      "an operator's message reached the benchmark page: " + stored,
    );
  }

  for (const empty of [null, undefined, "", "   "]) {
    assert.equal(visitorReason(empty), UNNAMED, "a missing reason should read as the generic one");
  }
});

test("a reason written for a reader is still printed, and is the reaper's own string", () => {
  assert.ok(PUBLISHED_REASONS.length > 0, "the allowlist is empty, so the page can only be generic");

  for (const reason of PUBLISHED_REASONS) {
    const out = visitorReason(reason);
    assert.notEqual(out, UNNAMED, "a published reason came back generic: " + reason);
    assert.ok(out.length > 20, "a published reason should be a sentence: " + reason);
  }

  /**
   * A NO-OP INJECTION, recorded rather than dropped.
   *
   * The obvious assertion here is `PUBLISHED_REASONS.includes(REAPED_FREE)`,
   * against the case "somebody rewords the reaper's sentence and it falls off
   * the list". It was written, injected, and came back MISSED - and it could
   * never have fired: both sides of that comparison are the same import, so it
   * asks whether a constant equals itself. It is the blind-tripwire species in
   * its purest form, and this repo deletes a guard that cannot fire rather
   * than keeping it green.
   *
   * What makes the property true is the import, not an assertion - so what is
   * worth checking is that the import is still how it gets there. A literal
   * copy of the sentence in the list would satisfy every behavioural rule in
   * this file and would go stale the first time `stall.ts` is reworded, which
   * is the two-copies species that actually pays here.
   */
  const filter = code(readFileSync("src/lib/coverage/reading-error.ts", "utf8"));
  assert.match(
    filter,
    /\[\s*REAPED_FREE\s*,/,
    "the reaper's sentence is no longer on the allowlist as the imported constant",
  );
  assert.ok(
    !filter.includes(REAPED_FREE),
    "the reaper's sentence is typed into the allowlist as a literal beside the import, so" +
      " rewording it in `stall.ts` would silently turn a named reason into a generic one",
  );

  // An exact match, not a prefix: two of `describeAnthropicError`'s branches
  // open with a fixed phrase and close with a raw vendor message, so a prefix
  // test would publish the whole string on the strength of its first words.
  assert.equal(
    visitorReason(REAPED_FREE + " - Postgres said: relation does not exist"),
    UNNAMED,
    "a published reason with an operator's message appended was printed whole, so the match" +
      " is a prefix rather than an equality",
  );
});

/**
 * Rule 3: every reader of the column, not every caller of the filter.
 *
 * The two-way street. Rules 1 and 2 are about `visitorReason`, and both would
 * have passed on the tree that carried this defect, because that tree did not
 * call it. What has to be checked is the other direction: **which files select
 * these columns out of `scans`, and is each one allowed to.**
 *
 * The denominator is walked rather than typed - the four modules that select
 * from `scans` naming `error` change as the product does, and a typed list
 * cannot report one that joined. Word-bounded on purpose: `error` is a
 * substring of `gated_error`, the same trap `started_at` and `gated_started_at`
 * set in `stall-callers`, and `_` is a word character so `\b` does separate
 * them.
 *
 * Comments are stripped first. Half the files in this walk *discuss* these
 * columns at length - `status/route.ts`'s header is four paragraphs about them
 * - and an unstripped read would report every one of those as a select.
 */
const READERS: Record<string, string> = {
  "src/app/admin/scans/page.tsx":
    "the operator's own page, behind a credential, and the place the status route's header says this detail belongs",
  "src/lib/coverage/reading.ts":
    "the benchmark page's reader - it carries the column as far as the page, which filters it through `visitorReason` before printing. The second half of this test is what holds that",
};

test("every public reader of a scan's error column passes it through the filter", () => {
  const selects =
    /\.from\(\s*["']scans["']\s*\)[\s\S]{0,400}?\.select\(\s*([\s\S]{0,400}?)\)/g;

  const readers: string[] = [];

  // `sourceFiles` takes the repo root, walks `src` itself, and already drops
  // every `.test.` file - a sweep asking "does any shipped file do X" that read
  // the test forbidding X would report the guard as the defect.
  for (const file of sourceFiles(".")) {
    const src = code(readFileSync(file, "utf8"));
    selects.lastIndex = 0;
    for (const m of src.matchAll(selects)) {
      if (!/\berror\b|\bgated_error\b/.test(m[1]!)) continue;
      readers.push(file);
      break;
    }
  }

  assert.deepEqual(
    readers.sort(),
    Object.keys(READERS).sort(),
    "the set of files selecting a scan's error column has changed. A new one is not a" +
      " failure - it is the thing to look at: decide whether it can reach a visitor, then" +
      " record it here with the reason, the way the two above are.",
  );

  // The filter is reached from a page, not merely imported somewhere. The
  // defect was a page printing the column; a module holding an unused helper
  // would satisfy any rule that only asked whether the helper exists.
  const page = code(readFileSync("src/app/coverage-check/[token]/page.tsx", "utf8"));
  assert.match(
    page,
    /visitorReason\(\s*reading\??\.error\s*\)/,
    "the benchmark page no longer passes the stored reason through the filter",
  );
  assert.doesNotMatch(
    page,
    /\{\s*reading\??\.error\s*\?/,
    "the benchmark page is printing the stored reason directly again",
  );
});
