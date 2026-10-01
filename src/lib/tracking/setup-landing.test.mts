import assert from "node:assert/strict";
import { test } from "node:test";

import { landingAfterAuth, setupConfirmed, setupPath } from "./setup-landing.ts";

test("setup is confirmed by a setup_confirmed event and nothing else", () => {
  assert.equal(setupConfirmed([]), false);
  assert.equal(setupConfirmed([{ event: "page_view" }, { event: "setup_reminder" }]), false);
  assert.equal(setupConfirmed([{ event: "page_view" }, { event: "setup_confirmed" }]), true);
});

test("an unconfirmed first client lands on its setup page, next or not", () => {
  const clients = [{ slug: "acme", confirmed: false }];
  assert.equal(landingAfterAuth({ next: null, clients }), "/app/acme/setup");
  assert.equal(landingAfterAuth({ next: "/app/acme/clusters", clients }), "/app/acme/setup");
  assert.equal(setupPath("acme"), "/app/acme/setup");
});

test("a confirmed client keeps the R163/R164 landing", () => {
  const clients = [{ slug: "acme", confirmed: true }, { slug: "beta", confirmed: false }];
  assert.equal(landingAfterAuth({ next: null, clients }), "/app/acme");
  assert.equal(landingAfterAuth({ next: "/app/acme/clusters", clients }), "/app/acme/clusters");
});

test("no clients, or a failed read, answer as today", () => {
  assert.equal(landingAfterAuth({ next: null, clients: [] }), "/app/login?access=none");
  assert.equal(landingAfterAuth({ next: null, clients: null }), "/app");
  assert.equal(landingAfterAuth({ next: "/app/acme/named", clients: null }), "/app/acme/named");
});
