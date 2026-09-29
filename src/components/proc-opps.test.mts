import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * R82 (Danny, 28 Sep 2026): at 390px the alwaystracked beat's 'Placement
 * opportunities' label and its 9 wrapped under the 15% line as a right-aligned
 * stack. On a phone they are one left-aligned baseline row; desktop keeps the
 * right-aligned stack. The layout lives in globals.css, so the inline styles
 * must not set display or text-align on that block - inline would win.
 */
const component = readFileSync(new URL("./ProcessSequence.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("the placement-opportunities block carries proc-opps and no inline layout", () => {
  const m = component.match(/<span className="proc-opps">([\s\S]*?)<\/span>\s*<\/span>/);
  assert.ok(m, "BeatTracked has a proc-opps span");
  assert.match(m[1], /Placement opportunities/);
  assert.doesNotMatch(m[0], /display:|textAlign/, "display/text-align come from globals.css");
  assert.match(component, /className="proc-opps-gap"/, "the spacer is addressable so the phone rule can drop it");
});

test("globals.css makes proc-opps one left-aligned baseline row under 560px", () => {
  const blocks = [...css.matchAll(/@media \(max-width: 560px\) \{([\s\S]*?)\n\}/g)].map((b) => b[1]);
  const rule = blocks.find((b) => /\.proc-opps \{/.test(b));
  assert.ok(rule, "a 560px block styles .proc-opps");
  const opps = rule.match(/\.proc-opps \{([^}]*)\}/)![1];
  for (const decl of ["display: flex", "align-items: baseline", "gap: 8px", "text-align: left"]) {
    assert.ok(opps.includes(decl), `mobile .proc-opps has ${decl}`);
  }
  assert.match(rule, /\.proc-opps-gap \{ display: none; \}/);
  assert.match(css, /^\.proc-opps \{ text-align: right; \}/m, "desktop stays right-aligned");
});
