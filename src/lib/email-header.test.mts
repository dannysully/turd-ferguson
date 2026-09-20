import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { WAITLIST_LIMITS } from "../config/contact.ts";
import { headerSafe } from "./email-header.ts";
// Moved to a shared helper on 20 Sep: mail-from.test.mts reads the From of
// the same sends this file reads the subject of, and importing it out of a
// test file made node run that whole suite twice.
import { sendCalls } from "./source-read.mts";

/**
 * `headerSafe` itself, and - the half that matters - who calls it.
 *
 * The function had no test of its own. What it had instead was a doc comment
 * naming which senders used it, which is a census kept in prose: true when
 * typed, unfalsifiable afterwards, and wrong. It said the contact form "was the
 * only sender not using it" while `src/app/actions/waitlist.ts` built a subject
 * line out of a domain an anonymous visitor typed and called nothing at all.
 *
 * `contact.test.mts` is the test for this species and could not see it, for one
 * reason worth carrying: it reads `src/app/contact/actions.ts` and only that.
 * Every assertion in it is right and none of them has a denominator wider than
 * one file, so a second public form that mails us was outside the measurement
 * rather than inside it and passing. That is this repo's recurring shape - the
 * defect is in what was counted - and the fix is the same one `route-closure`
 * and `paid-get` already use: derive the set from source, then prove the
 * derivation can still see an instance.
 *
 * So the rule below is not "waitlist.ts calls headerSafe". It is "every
 * `emails.send` in the tree has a safe subject", with the list of sends read
 * out of the tree at test time. A fourth sender joins the sweep by existing.
 */

const HERE = fileURLToPath(import.meta.url);
const ROOT = join(HERE, "..", "..", "..");
const SRC = join(ROOT, "src");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(child));
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) out.push(child);
  }
  return out;
}

function posix(file: string): string {
  return relative(ROOT, file).split(sep).join("/");
}

const FILES = sourceFiles(SRC);

// --------------------------------------------------------------- the function

test("whitespace of every kind collapses to a single space", () => {
  const LF = String.fromCharCode(10);
  const CR = String.fromCharCode(13);
  // CR and LF are the header injection vector and it does not matter which
  // arrived, which is why this collapses whitespace rather than stripping the
  // two characters it can currently think of.
  assert.equal(headerSafe(`a${LF}b`), "a b");
  assert.equal(headerSafe(`a${CR}b`), "a b");
  assert.equal(headerSafe(`a${CR}${LF}b`), "a b");
  assert.equal(headerSafe(`a${CR}${LF}bcc: someone@example.test`), "a bcc: someone@example.test");
  assert.equal(headerSafe("a\tb"), "a b");
  assert.equal(headerSafe("a   b"), "a b");
});

test("the result is trimmed and bounded", () => {
  assert.equal(headerSafe("  padded  "), "padded");
  // The bound is the second half of this function's job and the half that was
  // missing from the waitlist send. A 5,000-character path through that form's
  // old regex produced a 5,026-character subject line.
  const long = headerSafe("Scan request: " + "A".repeat(5000));
  assert.equal(long.length, 120);
  assert.ok(long.startsWith("Scan request: A"));
});

test("an already-safe subject is returned unchanged", () => {
  // A rule that mangles correct input gets routed around, so this is as much
  // the point as the two above.
  assert.equal(headerSafe("Open your Acme report"), "Open your Acme report");
  assert.equal(headerSafe("Contact form: Danny Sullivan"), "Contact form: Danny Sullivan");
});

// ----------------------------------------------------------------- the census


/**
 * The subject line of one send, as written.
 *
 * Read to the end of the line rather than to the next comma: a subject is a
 * single expression on a single line in all four sends, and a comma-terminated
 * read would cut `headerSafe(reportSubject(brand, counts))` in half and report
 * the safe form as unsafe.
 *
 * The shorthand form is read too, and it is not a nicety. `reportEmail` writes
 * `subject,` - the property shorthand - which is the tree's one real instance
 * of a subject passed by name, and it is the instance the "passed by name" test
 * below exists for. A reader that required a colon skipped it, so that test
 * looped over nothing and passed while its subject went unchecked. The guard
 * above is what said so.
 */
function subjectOf(call: string): string | null {
  const m = /\n\s*subject(?::\s*(.+?)|(\s*))(?:,)?\s*\n/.exec(call);
  if (!m) return null;
  return m[1] ?? "subject";
}

/** A subject nothing outside this repo can influence needs no wrapping. */
function isSafeSubject(subject: string): boolean {
  if (subject.startsWith("headerSafe(")) return true;
  // A plain string or a bare identifier assigned from one. An identifier is
  // only accepted where the file also wraps it, which the caller checks.
  return !subject.includes("${") && !subject.includes("+");
}

const SENDS = FILES.flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return sendCalls(source).map((call) => ({ file: posix(file), source, call }));
});

test("the send reader finds the sends this test thinks it does", () => {
  // The guard every sweep in this tree keeps. A matcher that stops matching
  // turns the assertion below into a loop over nothing, which passes - and is
  // indistinguishable from a clean tree, which is the state this whole file
  // exists because prose could not distinguish.
  assert.ok(SENDS.length >= 4, `expected 4+ mail sends in the tree, found ${SENDS.length}`);
  const files = new Set(SENDS.map((s) => s.file));
  assert.ok(files.size >= 3, `expected sends in 3+ files, found ${[...files].join(", ")}`);
  // And that each slice is one object rather than a runaway to the end of the
  // file, which would let a neighbour's headerSafe excuse a bare subject.
  for (const s of SENDS) {
    assert.ok(s.call.length < 1500, `a send in ${s.file} sliced out ${s.call.length} characters, which is not one call`);
  }
  // Every send states a subject. A send with none would silently pass the rule
  // below, and a subjectless message is its own defect.
  for (const s of SENDS) {
    assert.ok(subjectOf(s.call), `a send in ${s.file} has no subject this test can read:\n${s.call}`);
  }
});

test("the rule can still tell a safe subject from an unsafe one", () => {
  // Proven against written instances in both directions, then trusted on the
  // tree. Four of this repo's tripwires have passed because they were blind.
  const unsafe = [
    "subject: `Scan request: ${domain}`,",
    "subject: `Open your ${brand} report`,",
    'subject: "Contact form: " + name,',
  ];
  const safe = [
    "subject: headerSafe(`Scan request: ${domain}`),",
    "subject: headerSafe(reportSubject(input.brand, input.counts)),",
    'subject: "Your report is ready",',
    // The shorthand, which is what reportEmail actually writes. Read as the
    // identifier `subject`, then checked at its assignment further down.
    "subject,",
  ];
  for (const line of unsafe) {
    const call = `{\n      to: x,\n      ${line}\n      text: y,\n    }`;
    const got = subjectOf(call);
    assert.ok(got, `the subject reader missed: ${line}`);
    assert.equal(isSafeSubject(got), false, `this should read as unsafe: ${line}`);
  }
  for (const line of safe) {
    const call = `{\n      to: x,\n      ${line}\n      text: y,\n    }`;
    const got = subjectOf(call);
    assert.ok(got, `the subject reader missed: ${line}`);
    assert.equal(isSafeSubject(got), true, `this should read as safe: ${line}`);
  }
});

test("every mail subject in the tree is bounded and cannot carry a newline", () => {
  const bad = SENDS.filter(({ call }) => {
    const subject = subjectOf(call);
    return subject !== null && !isSafeSubject(subject);
  }).map(({ file, call }) => `${file}: ${subjectOf(call)}`);

  assert.deepEqual(
    bad,
    [],
    "wrap this in headerSafe from @/lib/email-header - an interpolated subject is a header assembled from a value somebody else typed, and the bound matters as much as the newline",
  );
});

/**
 * A subject built from an identifier rather than inline must still be wrapped.
 *
 * `reportEmail` does `const subject = headerSafe(...)` and then `subject,` in
 * the call, which `isSafeSubject` waves through as a bare identifier. That is
 * the one hole in the rule above, so it is closed here rather than left to the
 * reader to notice: where a send names an identifier, the file it lives in has
 * to assign that identifier through headerSafe.
 */
test("a subject passed by name is wrapped where it is assigned", () => {
  for (const { file, source, call } of SENDS) {
    const subject = subjectOf(call);
    if (!subject || !/^[A-Za-z_$][\w$]*$/.test(subject)) continue;
    const assigned = new RegExp(`(?:const|let|var)\\s+${subject}\\s*=\\s*headerSafe\\(`);
    assert.match(
      source,
      assigned,
      `${file} passes \`${subject}\` as a subject, and this test cannot find it assigned through headerSafe`,
    );
  }
});

// ------------------------------------------------- the other half of a sender

/**
 * The bound, swept the same way for the same reason.
 *
 * A safe subject is one of two things a public form owes. The other is that no
 * value it accepts is unbounded before it reaches a message or a log, and
 * `contact.test.mts` checks exactly that - for one action. This is the second
 * one, kept here rather than in a `waitlist.test.mts` so that the two halves of
 * "what a sender owes" are in one file and a third form is one entry from being
 * covered by both.
 */
const WAITLIST = readFileSync(join(SRC, "app", "actions", "waitlist.ts"), "utf8");

/** Every field the action destructures off its one input object. */
function waitlistFields(source: string): string[] {
  const m = /export async function requestScan\(input: \{([^}]*)\}/.exec(source);
  if (!m) return [];
  return [...m[1].matchAll(/(\w+):\s*string/g)].map((f) => f[1]);
}

test("the field reader finds the fields this test thinks it does", () => {
  const fields = waitlistFields(WAITLIST);
  assert.deepEqual([...fields].sort(), ["domain", "email", "topic"]);
});

test("every field the waitlist action accepts has a bound", () => {
  for (const field of waitlistFields(WAITLIST)) {
    const limit = (WAITLIST_LIMITS as Record<string, number | undefined>)[field];
    assert.equal(
      typeof limit,
      "number",
      `the waitlist action reads "${field}" but WAITLIST_LIMITS has no bound for it`,
    );
    assert.ok((limit as number) > 0 && (limit as number) <= 5000, `the bound on "${field}" is ${limit}, which is not a bound`);
  }
});

/**
 * And that the bounds are applied, not merely declared.
 *
 * A limits table nothing reads is the same hole with a comment over it. Each
 * field has to appear inside a `clamp(input.x, LIMITS.y)` in the action.
 */
test("the waitlist action clamps each field it accepts", () => {
  for (const field of waitlistFields(WAITLIST)) {
    assert.match(
      WAITLIST,
      new RegExp(`clamp\\(input\\.${field},\\s*LIMITS\\.\\w+\\)`),
      `the waitlist action reads "${field}" without clamping it`,
    );
  }
});

/**
 * One validator for a domain, not two.
 *
 * The action hand-rolled `/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i`
 * while `normalizeDomain` and `isPlausibleDomain` sat in the tree with tests
 * over them. Measured rather than assumed, the two disagreed in both
 * directions: the regex passed a whole URL including its path through to the
 * mail subject, and refused "https://user:pass@example.com/path" and
 * "https://example.com?email=me@other.com", both of which the live scan path
 * accepts and normalises to example.com. A second copy of a validator drifts
 * exactly the way a second copy of a number does.
 */
test("the waitlist action validates a domain with the shared, tested pair", () => {
  assert.match(WAITLIST, /\bnormalizeDomain\(/, "use normalizeDomain from @/lib/scan/domain");
  assert.match(WAITLIST, /\bisPlausibleDomain\(/, "use isPlausibleDomain from @/lib/scan/domain");
  assert.doesNotMatch(
    WAITLIST,
    /https\?:\\\/\\\//,
    "this is a second domain regex - the tested pair in @/lib/scan/domain is the one validator for this field",
  );
});
