import assert from "node:assert/strict";
import { test } from "node:test";

import { DONE_FIXTURE_SESSION, doneEmail } from "./done-email.ts";

const never = async () => {
  throw new Error("read must not be called");
};

test("a well-formed Session id is read; anything else is not", async () => {
  assert.equal(await doneEmail("cs_live_a1B2c3D4e5F6", async () => "pat@example.com", {}), "pat@example.com");
  for (const bad of ["", "cs_live_", "cs_live_short", "x' or 1=1", "cs_prod_a1B2c3D4e5F6", "fixture"]) {
    assert.equal(await doneEmail(bad, never, {}), null, bad);
  }
});

test("no row, or a failed read, answers null rather than throwing", async () => {
  assert.equal(await doneEmail("cs_test_a1B2c3D4e5F6", async () => null, {}), null);
  assert.equal(await doneEmail("cs_test_a1B2c3D4e5F6", never, {}), null);
});

test("the fixture answers only its token, and never in production", async () => {
  const env = { CHECKOUT_DONE_FIXTURE_EMAIL: "pat@example.com" };
  assert.equal(await doneEmail(DONE_FIXTURE_SESSION, never, env), "pat@example.com");
  assert.equal(await doneEmail("cs_test_a1B2c3D4e5F6", async () => null, env), null);
  await assert.rejects(doneEmail(DONE_FIXTURE_SESSION, never, { ...env, VERCEL_ENV: "production" }));
});
