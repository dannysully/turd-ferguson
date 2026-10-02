import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * R176 (Danny, 1 Oct 2026, danny.md lines 190-208): the walkthrough toggle
 * has two options - "Loom with Luke" and "Demo with Danny", each with its
 * photo - and no "Book a call" (every other Book a call on the site stays).
 * Both routes thank in the same words and the internal subject uses the labels.
 */

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const form = read("./WalkthroughForm.tsx");

test("R176: two options, each with its photo, and no Book a call in the toggle", () => {
  const titles = [...form.matchAll(/title: "([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(titles, ["Loom with Luke", "Demo with Danny"]);
  assert.deepEqual([...form.matchAll(/photo: "([^"]+)"/g)].map((m) => m[1]), ["/team/luke.webp", "/team/danny.webp"]);
  assert.match(form, /<img src=\{o\.photo\} width=\{24\} height=\{24\} alt="" \/>/);
  const code = form.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(code, /Book a call|CONTACT_URL|"call"/);
  for (const f of ["luke.webp", "danny.webp"]) assert.ok(readFileSync(new URL(`../../../public/team/${f}`, import.meta.url)).length > 1000, f);
  assert.match(read("../../app/globals.css"), /\.wt-toggle \{[^}]*grid-template-columns: repeat\(2, 1fr\);/);
});

test("R176: both routes thank and refuse in the same words, and the subject names who", () => {
  for (const p of ["../../app/api/walkthrough/route.ts", "../../app/api/scan/[token]/walkthrough/route.ts"]) {
    const r = read(p);
    assert.match(r, /\? "Thanks\. Luke will send your Loom\."\s*: "Thanks\. Danny will be in touch\."/, p);
    assert.match(r, /"We have your request - we will be in touch\."/, p);
  }
  assert.match(read("../../lib/scan/walkthrough-mail.ts"), /const what = input\.kind === "video" \? "Loom with Luke" : "Demo with Danny";/);
});
