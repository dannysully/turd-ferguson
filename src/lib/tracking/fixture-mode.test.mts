import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { expandFixture, fixtureMode } from "./fixture-mode.ts";
import { overview } from "./figures.ts";

/**
 * R93 / BRIEF-2 T9 (29 Sep 2026): the fixture switch, and the fixture itself.
 * The fixture is made up - Tallyroo from boards-3/dataset.py - and is never
 * served in production.
 */

test("TRACKING_FIXTURE=1 is refused when VERCEL_ENV=production", () => {
  assert.throws(() => fixtureMode({ TRACKING_FIXTURE: "1", VERCEL_ENV: "production" }), /refuses/);
});

test("the fixture switch is off unless TRACKING_FIXTURE is exactly 1, and on outside production", () => {
  assert.equal(fixtureMode({}), false);
  assert.equal(fixtureMode({ VERCEL_ENV: "production" }), false);
  assert.equal(fixtureMode({ TRACKING_FIXTURE: "true" }), false);
  assert.equal(fixtureMode({ TRACKING_FIXTURE: "1" }), true);
  assert.equal(fixtureMode({ TRACKING_FIXTURE: "1", VERCEL_ENV: "preview" }), true);
});

test("the /app layout asks the switch on every request", () => {
  const layout = readFileSync(new URL("../../app/app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /^\s*fixtureMode\(\);/m);
});

const fx = expandFixture(JSON.parse(readFileSync(new URL("./fixture.json", import.meta.url), "utf8")));

test("the fixture expands to the rows the overview reads, and the overview computes on it", () => {
  assert.equal(fx.client.brand, "Tallyroo");
  assert.equal(fx.data.questions.length, 50, "10 clusters of 5 prompts");
  assert.equal(fx.data.keywords.length, 10);
  assert.ok(fx.data.answers.length > 5000, "both periods of daily answers");
  assert.ok(fx.data.answers.every((a) => a.answered && typeof a.named === "boolean"));
  assert.ok(fx.data.answers.some((a) => a.citations.length), "cited pages carried");
  const o = overview({
    range: { from: "2026-09-02", to: fx.today },
    compare: "prev",
    startedOn: fx.client.started_on,
    engines: ["google_aio", "chatgpt", "gemini", "perplexity"],
    questions: fx.data.questions,
    answers: fx.data.answers,
    serp: fx.data.serp,
    keywordCount: fx.data.keywords.length,
  });
  assert.ok(o.named.den > 0 && o.named.num > 0 && o.named.num < o.named.den);
});

test("the fixture names only the made-up brands and domains", () => {
  const brands = new Set(fx.data.answers.flatMap((a) => a.brands));
  assert.deepEqual([...brands].sort(), ["Brightbook", "Countwise", "Ledgerline", "Sumly", "Tallyroo"]);
  assert.equal(fx.client.domain, "tallyroo.com");
  assert.match(fx.member.email, /@example\.com$/);
});
