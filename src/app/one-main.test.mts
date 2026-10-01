/**
 * One `<main>` per page, and src/app/layout.tsx writes it.
 *
 * R151 (1 Oct 2026): seventeen pages wrapped their content in a `<main>` of
 * their own inside the layout's `<main id="main">`, so a screen reader's
 * landmark list showed two mains on /compare, /how-it-works, /packages and the
 * rest, and the skip link landed on the outer one. Every page-level `<main>`
 * became a `<div>`. This walks every .tsx under src and refuses a `<main>`
 * written anywhere but the root layout.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "..");
const LAYOUT = path.join("app", "layout.tsx");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".tsx") ? [path.join(dir, e.name)] : [],
  );
}

test("only the root layout writes <main>", () => {
  const files = walk(SRC);
  // The floor: a walk that stopped matching would report a clean tree.
  // 118 on 1 Oct 2026.
  assert.ok(files.length >= 110,`walked only ${files.length} .tsx files`);
  const writers = files.filter((f) => /<main\b/.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(SRC, f));
  assert.deepEqual(writers, [LAYOUT]);
});
