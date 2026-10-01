import assert from "node:assert/strict";
import { test } from "node:test";

import { SETUP_PROMPTS, confirmLabel, landingAfterAuth, setupCards, setupConfirmed, setupPath } from "./setup-landing.ts";

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

test("setup cards: one per live cluster, its keyword or null, five live prompts at most", () => {
  const cards = setupCards({
    clusters: [
      { id: "c1", name: "crm software", keyword_id: "k1", stopped_on: null },
      { id: "c2", name: "Needs a keyword", keyword_id: null, stopped_on: null },
      { id: "c3", name: "gone", keyword_id: null, stopped_on: "2026-09-30" },
    ],
    questions: [
      ...Array.from({ length: 7 }, (_, i) => ({ id: `q${i}`, text: `p${i}`, cluster_id: "c1", stopped_on: null, angle: "category" })),
      { id: "qs", text: "stopped", cluster_id: "c2", stopped_on: "2026-09-30", angle: null },
      { id: "qu", text: "ungrouped", cluster_id: null, stopped_on: null, angle: null },
    ],
    keywords: [{ id: "k1", keyword: "crm software" }],
  });
  assert.deepEqual(
    cards.map((c) => [c.id, c.keyword, c.prompts.length]),
    [
      ["c1", "crm software", SETUP_PROMPTS],
      ["c2", null, 0],
    ],
  );
  assert.equal(confirmLabel(true), "Confirm - these are what you'll target");
});
