import assert from "node:assert/strict";
import { test } from "node:test";

import { MAIL_OUTCOMES, readMailOutcome } from "./mail-outcome.ts";

test("the report-email outcome is one of the recorded codes, else nothing", () => {
  for (const k of Object.keys(MAIL_OUTCOMES)) assert.equal(readMailOutcome(k), k);
  for (const w of [undefined, "", "toString", "__proto__", "SENT", ["sent"]]) assert.equal(readMailOutcome(w), null);
});

test("each outcome says a different sentence, so the route's code is unambiguous", () => {
  const messages = Object.values(MAIL_OUTCOMES).map((o) => o.message);
  assert.equal(new Set(messages).size, messages.length);
});
