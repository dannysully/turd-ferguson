import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { CONTACT_EMAIL, CONTACT_LIMITS } from "./contact.ts";

/**
 * The contact form's bounds, checked against the fields the action actually
 * reads rather than against a list written here.
 *
 * This check exists because the same defect has now happened twice, in the
 * same file, for the same reason. Both `src/config/contact.ts` and
 * `src/app/contact/actions.ts` carried a comment promising every field was
 * bounded before it was used. Both times the comment was true of every field
 * somebody pictured as a field, and false of one:
 *
 *  - `email` first. It is the one that becomes a reply-to header, and the
 *    regex guarding it is two unbounded runs either side of an @, so it
 *    accepted a megabyte of them.
 *  - `website` second, found on the eighth sweep. It is the honeypot, so it
 *    is never sent in a message - which is exactly why it read as a field
 *    that needed no bound. But a filled one is logged, and it is
 *    attacker-controlled by definition: nothing renders it, so nothing but a
 *    bot ever fills it, and a bot can fill it with as much as it likes. An
 *    unbounded attacker-controlled string written to a function log is the
 *    same exposure as one written to a header, paid for by the megabyte
 *    instead of delivered.
 *
 * A list of field names written into this test would have drifted the same
 * way the comments did, so it reads the action's source and asserts over what
 * it finds. A field added to the form with no bound fails here on the way in,
 * which is the only point at which anybody is thinking about it.
 */

const SOURCE = readFileSync(new URL("../app/contact/actions.ts", import.meta.url), "utf8");

/** Every `formData.get("x")` in the action, which is every field it accepts. */
function fieldsRead(source: string): string[] {
  return [...source.matchAll(/formData\.get\("([^"]+)"\)/g)].map((m) => m[1]);
}

test("the action reads the fields this test thinks it does", () => {
  const fields = fieldsRead(SOURCE);
  // Guards the regex itself: if it stops matching, every assertion below
  // passes over an empty list and the check silently tests nothing.
  assert.ok(fields.length >= 5, `expected the action to read 5+ fields, found ${fields.length}`);
  assert.ok(fields.includes("website"), "the honeypot field is no longer read");
});

test("every field the contact action accepts has a bound", () => {
  for (const field of fieldsRead(SOURCE)) {
    const limit = (CONTACT_LIMITS as Record<string, number | undefined>)[field];
    assert.equal(
      typeof limit,
      "number",
      `the contact action reads "${field}" but CONTACT_LIMITS has no bound for it`,
    );
    assert.ok((limit as number) > 0, `the bound on "${field}" must be positive`);
  }
});

/**
 * Every refusal hands back what was typed.
 *
 * React resets a `<form action={fn}>` on every submission and does not care
 * whether the action succeeded - `startHostTransition` calls
 * `requestFormReset` before it calls the action - so a refusal that returns
 * only a sentence empties all four fields. The visitor is then asked to fix a
 * mistake in text we have just deleted, and on the "email us directly" branch
 * we delete the message in the same breath as telling them to send it
 * somewhere else.
 *
 * Checked per return rather than per file, which is the lesson from the two
 * tripwires in `75ff8d6`: a rule satisfied by "the word appears somewhere in
 * this module" is satisfied by the nine correct returns while the tenth drops
 * it. Each `status: "error"` object is sliced out by its own braces and has to
 * carry `values` itself.
 */
function errorReturns(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/status: "error"/g)) {
    // Walk back to the `{` that opens this object literal, then forward to its
    // match. The object is what has to carry the field, not the function.
    const open = source.lastIndexOf("{", m.index);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}" && --depth === 0) {
        out.push(source.slice(open, i + 1));
        break;
      }
    }
  }
  return out;
}

test("the error-return reader finds the returns this test thinks it does", () => {
  const returns = errorReturns(SOURCE);
  // The guard, for the same reason fieldsRead has one: a matcher that stops
  // matching turns the assertion below into a loop over nothing that passes.
  assert.ok(returns.length >= 8, `expected 8+ error returns in the action, found ${returns.length}`);
  // And that each slice really is one object rather than the whole function -
  // a runaway brace walk would swallow `values` from a neighbour and excuse
  // every return in the file.
  for (const r of returns) {
    assert.ok(r.length < 500, `an error return sliced out ${r.length} characters, which is not one object`);
  }
});

test("every refusal hands back what the visitor typed", () => {
  for (const r of errorReturns(SOURCE)) {
    assert.match(
      r,
      /\bvalues\b/,
      "a contact-form refusal returns no `values`, so React's form reset will empty the fields:\n" + r,
    );
  }
});

test("no bound is large enough to be no bound", () => {
  // 5000 is the message, and it is the largest field the form has any reason
  // to carry. Anything above it is a bound somebody has stopped thinking about.
  for (const [field, limit] of Object.entries(CONTACT_LIMITS)) {
    assert.ok(limit <= 5000, `the bound on "${field}" is ${limit}, which is not a bound`);
  }
});

// -------------------------------------------- the address, across the tree

/**
 * Everything above this line reads one file.
 *
 * That was named in the queue as this test's own weakness, and it is the
 * denominator species rather than a missing assertion: every claim above is
 * correct about `contact/actions.ts` and cannot see anything else. The
 * published contact address is the fact that proves it - on 20 Sep 2026
 * `hello@alwayscited.com` was typed **thirteen times across seven files**,
 * one of them this action, and no constant existed anywhere.
 *
 * It is the two-copies species at its largest instance here. The date
 * formatter, the honeypot and `brand-name.ts` were two copies each and in all
 * three the untested copy was the wrong one. Thirteen is past what a rename
 * completes by grep, and the copies that survive one are the two nobody reads
 * while working: the `mailto:` on /legal, and `contactPoint.email` in the
 * JSON-LD - the machine-readable one, which is the copy an answer engine
 * quotes and the only one no human proofreads.
 *
 * So the rule is not "the copies agree", which is a census that goes stale.
 * It is that there is one copy: `CONTACT_EMAIL` in `config/contact.ts`, and
 * the literal appears nowhere else in the tree.
 */

const ROOT = new URL("../..", import.meta.url).pathname;

/** Where the address is allowed to be written out in full. */
const HOME = "src/config/contact.ts";

/**
 * Source with its prose removed, because this check reads source.
 *
 * Non-negotiable and paid for five times in this repo, most recently
 * `0a3aa9e`. It is load-bearing right here rather than theoretically: the doc
 * comment above `ContactValues` in `contact/actions.ts` quotes the sentence
 * "please email hello@alwayscited.com directly" while explaining what the
 * React form reset used to destroy. That prose is correct, must stay, and
 * would otherwise be reported as a fourteenth typed copy - prose describing
 * the code satisfying a check that the code is there, in the exact shape that
 * has caught this repo out before.
 */
function sourceOf(file: string): string {
  const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
  const out: string[] = [];
  let open = false;
  for (const line of lines) {
    const t = line.trim();
    if (open) {
      if (t.includes("*/")) open = false;
      continue;
    }
    if (t.startsWith("{/*") || t.startsWith("/*")) {
      if (!t.includes("*/")) open = true;
      continue;
    }
    if (t.startsWith("*") || t.startsWith("//")) continue;
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Source with its import statements removed as well as its prose.
 *
 * **An import is not a use**, and this file proved it the hard way: the
 * reader rule below first passed on an injected `schema.ts` that had swapped
 * `email: CONTACT_EMAIL` for a typed address and kept the import line, which
 * is a surface that has stopped publishing the constant while still naming
 * it. The harness reported MISS and the defect was the test, not the
 * injection - the same mistake the import-graph draft of `spend-gates` made
 * when it read two routes as spenders because something in their graph
 * imported `anthropic.ts`.
 *
 * Handles both forms in this tree: a single-line `import { a, b } from "x";`
 * and the multi-line one ending in `} from "x";`.
 */
function withoutImports(src: string): string {
  const out: string[] = [];
  let open = false;
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (open) {
      if (/^\}\s*from\s/.test(t)) open = false;
      continue;
    }
    if (/^import\b/.test(t)) {
      if (!/;$|^import\s+["']/.test(t) && !/\bfrom\b/.test(t)) open = true;
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

/** Every source file in the tree, so the denominator is walked and not typed. */
function sourceFiles(): string[] {
  const out: string[] = [];
  (function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${prefix}${entry.name}`;
      if (entry.isDirectory()) walk(join(dir, entry.name), `${rel}/`);
      else if (/\.(tsx?|mts)$/.test(entry.name) && !entry.name.includes(".test.")) out.push(rel);
    }
  })("src", "src/");
  return out;
}

test("the address is written out in exactly one place", () => {
  const files = sourceFiles();
  // A walk that stopped walking returns a clean list, which is the failure
  // shape this whole file exists to refuse.
  assert.ok(files.length >= 40, `expected 40+ source files, walked ${files.length}`);

  const typed: string[] = [];
  for (const file of files) {
    if (file === HOME) continue;
    const src = sourceOf(file);
    src.split("\n").forEach((line, i) => {
      if (line.includes(CONTACT_EMAIL)) typed.push(`${file}:${i + 1} ${line.trim()}`);
    });
  }

  assert.deepEqual(
    typed,
    [],
    `the published address is typed out instead of imported from ${HOME}:\n` +
      typed.map((s) => `  ${s}`).join("\n"),
  );
});

/**
 * And the one place is real, rather than a constant nothing uses.
 *
 * The rule above passes perfectly on a tree where the address has been
 * deleted from every surface - a green that would mean the footer, /legal and
 * the entity graph had all stopped publishing it. This is the other
 * direction, and it is the half that makes the first one mean something.
 */
test("the constant is what the published surfaces actually use", () => {
  const readers = sourceFiles().filter((f) => f !== HOME && /\bCONTACT_EMAIL\b/.test(withoutImports(sourceOf(f))));

  for (const surface of ["src/components/Footer.tsx", "src/app/legal/page.tsx", "src/config/schema.ts"]) {
    assert.ok(
      readers.includes(surface),
      `${surface} publishes the contact address and no longer reads CONTACT_EMAIL`,
    );
  }
  assert.ok(readers.length >= 5, `only ${readers.length} files read CONTACT_EMAIL, expected the five surfaces or more`);
});

/**
 * Delivery and publication are two facts, and they must stay two constants.
 *
 * `CONTACT_EMAIL_DESTINATION` is an environment variable a deployment may
 * point anywhere, and no agent here can read it - blocked.md 20 is the same
 * shape one variable over. If the site ever derived what it publishes from
 * where mail lands, then repointing an inbox would silently rewrite /legal's
 * data-protection contact and the address in the entity graph. They share a
 * default and nothing else, and this pins that.
 */
test("the published address is not read out of the delivery variable", () => {
  for (const file of ["src/app/contact/actions.ts", "src/app/actions/waitlist.ts"]) {
    const src = sourceOf(file);
    assert.match(
      src,
      /process\.env\.CONTACT_EMAIL_DESTINATION \?\? CONTACT_EMAIL/,
      `${file} no longer defaults delivery to the published address`,
    );
  }

  const home = sourceOf(HOME);
  assert.ok(
    !/process\.env/.test(home),
    `${HOME} now reads an environment variable - what the site publishes must not depend on a deployment`,
  );
});
