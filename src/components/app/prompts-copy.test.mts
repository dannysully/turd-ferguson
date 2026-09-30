import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/**
 * R107(a) census (Danny, 29 Sep 2026, danny.md lines 98-99; census added
 * 30 Sep): inside /app the word is "prompts", never "questions" - copy,
 * labels, empty states, aria-labels. Public site copy is not in scope.
 *
 * Comments are stripped, then any whole word "question(s)" left is copy,
 * except where it is code: a property (`data.questions`, `questions:`), a
 * camelCase or snake_case name (`liveQuestions`, `tracked_questions`), or
 * the one recorded identifier below.
 */

const ROOTS = ["src/components/app", "src/app/app"];
// data-figure="questions" is the figure's id, read by e2e/app specs, never shown.
const IDENTIFIERS = [/figure: "questions"/];
const FLOOR = 9;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) && !n.includes(".test.") ? [p] : [];
  });
}

export function copyHits(src: string): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const hits: string[] = [];
  for (const line of code.split("\n")) {
    if (IDENTIFIERS.some((r) => r.test(line))) continue;
    const re = /(?<![.\w])questions?(?![\w:(])/gi;
    if (re.test(line)) hits.push(line.trim());
  }
  return hits;
}

test("census: /app copy says prompts, never questions", () => {
  const files = ROOTS.flatMap((r) => walk(join(process.cwd(), r)));
  assert.ok(files.length >= FLOOR, `walked ${files.length} files, floor ${FLOOR}`);
  const found = files.flatMap((f) => copyHits(readFileSync(f, "utf8")).map((l) => `${f}: ${l}`));
  assert.deepEqual(found, []);
});

test("census probe: copy fires, code and comments do not", () => {
  assert.equal(copyHits(`<th>Question</th>`).length, 1);
  assert.equal(copyHits("`${n} questions added`").length, 1);
  assert.equal(copyHits(`aria-label="Each question"`).length, 1);
  assert.equal(copyHits(`const n = data.questions.length; const liveQuestions = 1; q.tracked_questions;`).length, 0);
  assert.equal(copyHits(`// questions here\n/* and questions */`).length, 0);
  assert.equal(copyHits(`{ questions: 3 }`).length, 0);
});
