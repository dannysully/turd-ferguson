import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/**
 * BRIEF-2 T13 census (Danny, 29 Sep 2026, danny.md line 88; added 30 Sep with
 * R97 part 1): the dashboard never says a placement made a figure move. A
 * placement line and a named rate sit on one time axis; the copy around them
 * must not read that as cause. Comments are stripped; any of the words left
 * is copy. The brief allows them only in the placements footnote's own
 * negation, and the board's footnote (PLACEMENTS_FOOTNOTE) uses none, so there
 * is no exemption to record.
 */

const ROOTS = ["src/components/app", "src/app/app"];
const WORDS = /\b(caused|drove|because of|thanks to|resulted in|delivered)\b/i;
const FLOOR = 9;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) && !n.includes(".test.") ? [p] : [];
  });
}

export function causalHits(src: string): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  return code.split("\n").filter((l) => WORDS.test(l)).map((l) => l.trim());
}

test("census: /app copy claims no cause", () => {
  const files = ROOTS.flatMap((r) => walk(join(process.cwd(), r)));
  assert.ok(files.length >= FLOOR, `walked ${files.length} files, floor ${FLOOR}`);
  const found = files.flatMap((f) => causalHits(readFileSync(f, "utf8")).map((l) => `${f}: ${l}`));
  assert.deepEqual(found, []);
});

test("census probe: copy fires, comments do not", () => {
  assert.equal(causalHits(`<p>This placement drove a 30 point rise.</p>`).length, 1);
  assert.equal(causalHits("`Up ${n} thanks to your placements`").length, 1);
  assert.equal(causalHits(`aria-label="Results delivered"`).length, 1);
  assert.equal(causalHits(`// what caused this\n/* because of that */`).length, 0);
});

test("the footnote itself passes", async () => {
  const { PLACEMENTS_FOOTNOTE } = await import("../../lib/tracking/placement-figures.ts");
  assert.equal(WORDS.test(PLACEMENTS_FOOTNOTE), false);
});
