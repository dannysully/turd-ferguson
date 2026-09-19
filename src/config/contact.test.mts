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

test("no bound is large enough to be no bound", () => {
  // 5000 is the message, and it is the largest field the form has any reason
  // to carry. Anything above it is a bound somebody has stopped thinking about.
  for (const [field, limit] of Object.entries(CONTACT_LIMITS)) {
    assert.ok(limit <= 5000, `the bound on "${field}" is ${limit}, which is not a bound`);
  }
});
