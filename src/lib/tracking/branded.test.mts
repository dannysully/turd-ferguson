import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { BRANDED_PROMPT, namesBrandIn, refuseBranded, type Subject } from "./limits.ts";

/**
 * Branded prompts (30 Sep 2026). Two of the Nomada pilot's live prompts named
 * Nomada Digital, and a prompt that names the brand always names it. Every
 * prompt writer refuses one; scan copies leave them behind; nothing already
 * stored is touched - /admin/tracking flags it instead.
 */

// Tallyroo is the fixture's made-up client (privacy.test.mts); no real client is named here.
const TALLYROO: Subject = { brand: "Tallyroo", domain: "tallyroo.com", aliases: ["Tally Roo"] };

test("a prompt naming the brand, its domain or an alias is branded; a buyer's prompt is not", () => {
  assert.equal(namesBrandIn("what does Tallyroo do", TALLYROO), true);
  assert.equal(namesBrandIn("does tallyroo offer invoicing for freelancers", TALLYROO), true);
  assert.equal(namesBrandIn("is tallyroo.com any good", TALLYROO), true);
  assert.equal(namesBrandIn("tally roo vs the rest for freelancers", TALLYROO), true, "an alias counts");
  assert.equal(namesBrandIn("best invoicing software for freelancers", TALLYROO), false);
  assert.equal(namesBrandIn("what does it cost", { brand: null, domain: "tallyroo.com" }), false, "no brand: the domain stands in");
});

test("the refusal is the one message, and a clean batch passes", () => {
  assert.equal(
    BRANDED_PROMPT,
    "This prompt names the brand, so it will always name you. Ask it the way a buyer would, without the name.",
  );
  assert.equal(refuseBranded(["best invoicing software for freelancers", "what does Tallyroo do"], TALLYROO), BRANDED_PROMPT);
  assert.equal(refuseBranded(["best invoicing software for freelancers"], TALLYROO), null);
});

// ---- The census: every prompt writer refuses a branded prompt. ----

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");

function walk(dir: string): string[] {
  return statSync(dir).isDirectory() ? readdirSync(dir).flatMap((f) => walk(join(dir, f))) : [dir];
}

/** Statements that write a prompt's text: an insert into tracked_questions, or an update that sets `text`. */
export function textWrites(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/\.from\(\s*"tracked_questions"\s*\)([^;]*)/g)) {
    if (/\.(insert|upsert)\(/.test(m[1]) || /\.update\(\s*\{[^}]*\btext\b/.test(m[1])) out.push(m[1].trim().slice(0, 40));
  }
  return out;
}

/** Does a function body judge its texts with refuseBranded before its first write? */
export function guardedBeforeWrite(body: string): boolean {
  const guard = body.indexOf("refuseBranded(");
  const write = body.search(/\.(insert|update)\(/);
  return guard !== -1 && write !== -1 && guard < write;
}

function bodyOf(source: string, name: string): string {
  const at = source.indexOf(`export async function ${name}(`);
  assert.ok(at !== -1, `${name} not found`);
  const next = source.indexOf("\nexport ", at + 1);
  return source.slice(at, next === -1 ? undefined : next);
}

test("census: prompt text is written in exactly two places, and both refuse a branded prompt first", () => {
  const files = walk(join(ROOT, "src")).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.m?ts$/.test(f));
  // 30 Sep 2026: 248 source files walked. The floor sits below it so new files never trip it, and a walk that stops matching does.
  assert.ok(files.length >= 220, `walked ${files.length} source files - the walk has stopped matching`);
  const writers = files.flatMap((f) => textWrites(readFileSync(f, "utf8")).map(() => relative(ROOT, f)));
  assert.deepEqual([...new Set(writers)].sort(), ["src/lib/tracking/edit.ts", "src/lib/tracking/limits.ts"]);
  assert.ok(guardedBeforeWrite(bodyOf(read("src/lib/tracking/limits.ts"), "insertPrompts")), "insertPrompts: admin add, /app add-a-cluster, free slot and the webhook signup all come through here");
  assert.ok(guardedBeforeWrite(bodyOf(read("src/lib/tracking/edit.ts"), "editPrompts")), "editPrompts: an edit before the first reading");
});

test("census: the two scan copies leave branded prompts behind rather than failing the whole batch", () => {
  assert.match(read("src/app/admin/tracking/actions.ts"), /!namesBrandIn\(q\.text, subject\)/, "admin: create a client from a scan");
  assert.match(read("src/lib/checkout/signup.ts"), /!namesBrandIn\(q\.text, \{ brand: scan\.brand_name/, "webhook signup");
});

test("census: /admin/tracking flags a live branded prompt in both lists", () => {
  const page = read("src/app/admin/tracking/page.tsx");
  assert.equal([...page.matchAll(/<BrandFlag text=\{q\.text as string\} subject=\{subject\} \/>/g)].length, 2);
  assert.match(page, /names the brand/);
});

test("census probe: an unguarded insert, a text update and a guard after the write each fire", () => {
  assert.deepEqual(textWrites(`await db.from("tracked_questions").insert(rows);`).length, 1);
  assert.deepEqual(textWrites(`await db.from("tracked_questions").update({ text: e.text }).eq("id", id);`).length, 1);
  assert.deepEqual(textWrites(`await db.from("tracked_questions").update({ stopped_on: day }).eq("id", id);`).length, 0, "a stop is not a text write");
  assert.equal(guardedBeforeWrite(`await db.from("t").insert(rows); refuseBranded(texts, s);`), false);
  assert.equal(guardedBeforeWrite(`const b = refuseBranded(texts, s); await db.from("t").insert(rows);`), true);
  assert.equal(guardedBeforeWrite(`await db.from("t").insert(rows);`), false);
});
