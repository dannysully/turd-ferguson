import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { CONTACT_LIMITS } from "./contact.ts";

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
