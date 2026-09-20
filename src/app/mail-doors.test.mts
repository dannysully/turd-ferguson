import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";

/**
 * Every door in this tree that puts a message on Resend, and what bounds how
 * often a stranger can open it.
 *
 * ## Why this file exists rather than another entry in spend-gates
 *
 * `spend-gates.test.mts` opens by claiming to hold "every door in this tree
 * that can cause somebody to be billed". It then walks `src/app/api` for files
 * named `route.ts`. That claim is bigger than that walk, and the gap is not
 * hypothetical: **two of the three things in this repo that bill Resend are
 * `"use server"` actions, and neither is under `src/app/api` nor named
 * `route.ts`.** They are registered POST endpoints in production all the same -
 * Next builds an action id for every export of a `"use server"` module that a
 * client component imports, and both of these are imported by a mounted client
 * component. So there are two anonymous doors onto a vendor bill that passed
 * tsc, the build, every test and the deploy while being in nobody's list.
 *
 * This is the same species that file was written for and the same one
 * `readiness.ts` was before `d0898cf`: correct about every name it carries,
 * with the defect sitting outside its denominator. The fix is the same too -
 * the census goes in a test, and the census derives its own denominator by
 * walking rather than by being typed.
 *
 * The two files are deliberately not merged. `spend-gates` classifies a door by
 * whether it reaches `checkCeilings`, which is a scan-pipeline question and
 * says nothing at all about mail; this one classifies by what bounds the rate.
 * What keeps them from drifting into two lists that disagree is that neither
 * types its own set: each walks for its own vendor and fails when the walk
 * finds something it cannot name.
 *
 * ## What is asserted
 *
 * 1. **The set of modules that can send mail is derived, not typed.** A new
 *    sender fails this file until somebody says what bounds it.
 * 2. **The set of server actions is derived too**, because that is the half
 *    `spend-gates` structurally cannot see, and it is where both of the
 *    anonymous doors are.
 * 3. **Every bound is re-earned from the source that claims it**, the
 *    `evidence` pattern `spend-gates` uses - a written list that is merely a
 *    list rots into a blanket pass.
 * 4. **The rate gap is pinned as an assertion, not described in prose.** Two
 *    doors take an anonymous post and send a message with no per-caller
 *    identity of any kind. That is Danny's call (docs/blocked.md) and this
 *    means the answer arrives as a deliberate edit here rather than by drift.
 */

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

/**
 * Comments stripped before anything is matched, lifted from `spend-gates`.
 *
 * Where it is load-bearing, measured rather than assumed: the sender walk. A
 * commented-out `from "resend"` line anywhere in `src` reads as a fourth mail
 * door without this, and the harness proves it by adding one and asserting the
 * sweep stays green.
 *
 * Where it is **not**, and the first version of this comment said it was:
 * `config/contact.ts` discusses `"use server"` twice in prose, but the action
 * walk anchors to the start of a line with only whitespace in front, and those
 * two sit behind a ` * ` inside a block comment. Stripping is belt and braces
 * there, not the thing doing the work. Recorded because the injection that was
 * written to prove it came back MISSED, and a comment claiming a guard that is
 * not guarding is the species this file is about.
 *
 * The `[^:]` guard keeps a `https://` inside a string from eating its line.
 */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

const files = sourceFiles(SRC).map((f) => ({
  path: relative(ROOT, f),
  code: code(readFileSync(f, "utf8")),
}));

/**
 * Every module that can put a message on the wire, and what bounds its rate.
 *
 * `reach` is who can open the door, which is the whole distinction this file
 * turns on: a door behind a scan row has already been counted by the ceilings,
 * and a door on the open web has not been counted by anything.
 */
const SENDERS: Record<
  string,
  { reach: "anonymous" | "behind the ceilings"; bound: string; evidence: RegExp; where: string }
> = {
  "src/lib/scan/verify-email.ts": {
    reach: "behind the ceilings",
    bound:
      "Only ever sends to the address on a scan row, and that row passed checkCeilings at " +
      "/api/scan/start before it existed. The repeat is bounded twice over: a sixty-second " +
      "cooldown read off verify_sent_at in the resend route, and a volume ceiling counted " +
      "in note_verify_send.",
    /**
     * Word-bounded, and that is not tidiness. The first version was the bare
     * substring, and the injection that renamed the column to
     * `verify_sent_at_GONE` came back MISSED - the sweep was matching its own
     * target inside the renamed one. A rename is the likeliest way this bound
     * ever disappears.
     */
    evidence: /\bverify_sent_at\b/,
    where: "src/app/api/scan/[token]/resend/route.ts",
  },
  "src/app/contact/actions.ts": {
    reach: "anonymous",
    bound:
      "Field clamps and a honeypot, and nothing else. The clamps bound the SIZE of one " +
      "message; they do not bound how many. The honeypot stops a bot that fills every " +
      "field it finds and does nothing at all about a post straight to the action id.",
    evidence: /if \(website\) \{/,
    where: "src/app/contact/actions.ts",
  },
  "src/app/actions/waitlist.ts": {
    reach: "anonymous",
    bound:
      "Field clamps and a honeypot, same as the contact action and for the same reason - " +
      "it had neither until the clamps landed on 20 September and the honeypot the day " +
      "after. Same limit: it bounds one message's size, not the count of them.",
    evidence: /if \(website\) \{/,
    where: "src/app/actions/waitlist.ts",
  },
};

/**
 * Every `"use server"` module, and every action it exports.
 *
 * Derived because this is the exact set `spend-gates` cannot see, and a typed
 * list of the invisible things is worth nothing. An export added to either of
 * these files is a new public POST endpoint, and it fails here until it is
 * named.
 */
const ACTIONS: Record<string, string[]> = {
  "src/app/contact/actions.ts": ["submitContactForm"],
  "src/app/actions/waitlist.ts": ["requestScan"],
};

// --------------------------------------------------------------- the tests

test("the walk read the tree, so a zero here cannot pass as a clean sweep", () => {
  assert.ok(files.length >= 60, `only ${files.length} source files found; the walk is reading the wrong tree`);
  for (const p of [...Object.keys(SENDERS), ...Object.keys(ACTIONS)]) {
    assert.ok(files.some((f) => f.path === p), `${p} is on a list here and is not in the tree any more`);
  }
});

test("exactly the expected modules can send mail", () => {
  const senders = files
    .filter((f) => /from "resend"/.test(f.code))
    .map((f) => f.path)
    .sort();

  assert.deepEqual(
    senders,
    Object.keys(SENDERS).sort(),
    "a module started or stopped being able to send mail. Classify it: say who can reach it " +
      "and what bounds how often, with something in its own source that proves the bound.",
  );
});

test("exactly the expected modules are server actions", () => {
  const actions = files
    .filter((f) => /^\s*["']use server["']/m.test(f.code))
    .map((f) => f.path)
    .sort();

  assert.deepEqual(
    actions,
    Object.keys(ACTIONS).sort(),
    'a "use server" module appeared or moved. Every export of one is a public POST endpoint ' +
      "that no route walk can see - which is the whole reason this file exists.",
  );
});

test("every server action is named, so a new export cannot be a door nobody listed", () => {
  for (const [path, named] of Object.entries(ACTIONS)) {
    const src = files.find((f) => f.path === path)!.code;
    const found = [...src.matchAll(/export\s+async\s+function\s+(\w+)/g)].map((m) => m[1]).sort();
    assert.deepEqual(
      found,
      named.slice().sort(),
      `${path} exports a different set of actions. Each one is its own POST endpoint on the ` +
        "open web; say what it does and what bounds it before adding it here.",
    );
  }
});

test("every sender still has the bound it claims", () => {
  for (const [path, { evidence, where }] of Object.entries(SENDERS)) {
    const src = readFileSync(join(ROOT, where), "utf8");
    assert.match(
      src,
      evidence,
      `${path} is bounded by something in ${where}, and that is no longer there. It is now a ` +
        "door onto a vendor bill with nothing in front of it.",
    );
  }
});

/**
 * The gap, as an assertion rather than a paragraph.
 *
 * Neither anonymous door takes a per-caller identity, so neither can be rate
 * limited today even in principle: `clientIp` is the only thing in this tree
 * that says who a caller is, and it takes a `Request`, which a server action
 * signature does not have. That is the shape of the question in blocked.md, and
 * it is asserted in both directions - the day one of them grows an identity,
 * this fails and somebody updates the list on purpose.
 */
test("the anonymous mail doors have no per-caller identity, which is the open question", () => {
  const anonymous = Object.entries(SENDERS)
    .filter(([, s]) => s.reach === "anonymous")
    .map(([path]) => path);

  assert.equal(
    anonymous.length,
    2,
    "the number of anonymous mail doors has changed - see docs/blocked.md before editing this",
  );

  for (const path of anonymous) {
    const src = files.find((f) => f.path === path)!.code;
    assert.doesNotMatch(
      src,
      /\bclientIp\s*\(|\bcheckCeilings\s*\(/,
      `${path} now identifies or counts its caller. That is the answer to blocked.md landing: ` +
        "move it off the anonymous list and write down what it is bounded to.",
    );
    assert.ok(
      !/src\/app\/api\//.test(path),
      `${path} moved under src/app/api, where spend-gates.test.mts can see it. Reconcile the ` +
        "two files rather than leaving one door counted twice.",
    );
  }
});

/**
 * The honeypot, on both public forms rather than one.
 *
 * The contact action has read a `website` field since `a22129b`; the waitlist
 * action did not, and the two were the same form facing the same web. That is
 * the species this repo keeps paying for - two copies of one thing where the
 * untested copy is the one missing the guard, same as the date formatter - and
 * it is asserted here because it is the only bound either door has that is
 * about the sender rather than the message.
 */
test("both public forms carry the honeypot, and both answer a filled one with a success", () => {
  /**
   * The answer is matched from inside the branch, not anywhere in the file.
   *
   * The first draft of this asserted that a success return existed *somewhere*
   * in the module, which both of these have anyway on the ordinary path - so it
   * would have passed with the honeypot returning an error, which is the one
   * thing it is here to forbid. That is this repo's blind-tripwire recipe
   * exactly: an assertion that cannot fail is a pass that means nothing.
   */
  const ANSWER: Record<string, RegExp> = {
    "src/app/contact/actions.ts": /if \(website\) \{[\s\S]{0,600}?return \{ status: "success" \};/,
    "src/app/actions/waitlist.ts": /if \(website\) \{[\s\S]{0,600}?return \{ ok: true \};/,
  };

  for (const [path, s] of Object.entries(SENDERS)) {
    if (s.reach !== "anonymous") continue;
    const src = files.find((f) => f.path === path)!.code;
    assert.match(src, ANSWER[path], `${path} must answer a filled honeypot with a success, or the refusal ` +
      "tells whoever is probing which field gave them away");
  }
});
