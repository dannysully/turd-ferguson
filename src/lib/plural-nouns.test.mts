import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { code, sourceFiles } from "./source-read.mts";

/**
 * Every noun `count()` is asked to pluralise takes a plain "s" - executed,
 * rather than stated.
 *
 * `plural.ts` carried this as prose: *"The nouns this counts are a known short
 * list - brand, page, source, answer, question, placement - and every one of
 * them takes a plain 's'. An irregular plural passes the second argument;
 * nothing here guesses at one."* Nothing ran it, and it was wrong in both
 * directions when measured on 20 Sep 2026: **"placement" is at no call site at
 * all**, and six nouns that are - tier, price, engine, domain, link, line -
 * were on no list. That is the census-in-prose species this queue keeps
 * finding, and the obligation it describes lands on the call site that does
 * not exist yet.
 *
 * `plural.test.mts` does not close it either. That file executes the function -
 * `count(1, "entry", "entries")` - and never looks at what the tree passes it,
 * which is the `contact.test.mts` shape: correct about every case it names,
 * reading one file.
 *
 * ## What this actually refuses
 *
 * `count(n, "company")` renders **"2 companys"** in a metric strip an agency
 * puts in front of a client. Nothing in the tree stops it today: the default
 * parameter is `singular + "s"`, so a noun needing "es" or "ies" is pluralised
 * wrongly and silently, and the failure is a rendered sentence rather than an
 * error. This product's own vocabulary is full of the dangerous shape -
 * company, category, industry, query, match, business - and the two defects
 * that made `plural.ts` exist in the first place ("across 1 questions",
 * "1 brands in all") were the same class: a number and a noun disagreeing on a
 * screen somebody is paying to read.
 *
 * The rule is therefore not "the noun is on a list" - a list is the thing that
 * drifted - but "a bare noun must be one that plain 's' is *right* for". A noun
 * it is wrong for is not banned; it has to pass its plural explicitly, which is
 * what `count`'s third parameter is for and what `plural.ts` says it is for.
 *
 * ## What this walk cannot see, asked while the denominator is fresh
 *
 * - **A noun that is not a literal.** `count(n, noun)` is unreadable here, so
 *   the rule below asserts the unreadable set is EMPTY rather than skipping it:
 *   a variable noun would make every rule in this file decoration, and the one
 *   direction that must not pass silently is the walk going blind.
 * - **A plural assembled somewhere else.** `n + " " + word + "s"` is not a
 *   `count()` call and is invisible. `plural.ts` exists precisely to pull those
 *   in, and pulling the remaining ones in is a copy change, not this rule's.
 * - **An irregular passed explicitly is not checked for being RIGHT.**
 *   `count(n, "child", "childs")` passes. Judging English is not something a
 *   sweep can do; what it can do is insist the author was asked.
 */

const ROOT = new URL("../../", import.meta.url).pathname;

/** The definition itself, which is a call site of nothing. */
const DEFINITION = "src/lib/plural.ts";

/**
 * Arguments of a `count(` call, split at top-level commas.
 *
 * Paren-matched rather than read to the first `)`, because `count(TIERS.length,
 * "tier")` and `count(questions.length || 0, "question")` both put a `)` or an
 * operator inside the first argument. A line window or a `[^)]*` would truncate
 * them - the trap `named-implies-answered.test.mts` records about `[^)]*`
 * behind an opening paren, which reported two correct reads as defects.
 */
function argsAt(body: string, open: number): string[] | null {
  let depth = 0;
  const parts: string[] = [];
  let start = open + 1;
  for (let i = open; i < body.length; i += 1) {
    const ch = body[i]!;
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      if (depth === 0) {
        parts.push(body.slice(start, i));
        return parts.map((p) => p.trim());
      }
    } else if (ch === "," && depth === 1) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  return null;
}

/** A plain string literal, or null if the argument is anything else. */
function literal(arg: string): string | null {
  const m = /^(["'])((?:[^\\]|\\.)*?)\1$/.exec(arg);
  if (m) return m[2]!;
  const t = /^`([^`$]*)`$/.exec(arg);
  return t ? t[1]! : null;
}

type Call = { file: string; noun: string | null; raw: string; explicit: boolean };

/**
 * Every `count()` call in shipped source, with the noun it passes.
 *
 * Restricted to files that import from `plural`, so a `count(` belonging to
 * something else - a SQL string, an array helper - cannot be judged by a rule
 * about English. Comments are stripped first: `plural.ts`'s own header quotes
 * the call shape while explaining it, which is the seven-times-paid strip.
 */
function calls(): Call[] {
  const out: Call[] = [];
  for (const file of sourceFiles(ROOT)) {
    if (file === DEFINITION) continue;
    const body = code(readFileSync(ROOT + file, "utf8"));
    if (!/from\s+["'][^"']*plural(?:\.ts)?["']/.test(body)) continue;
    for (const m of body.matchAll(/(^|[^.\w$])count\s*\(/g)) {
      const open = m.index! + m[0].length - 1;
      const args = argsAt(body, open);
      if (!args || args.length < 2) continue;
      out.push({ file, noun: literal(args[1]!), raw: args[1]!, explicit: args.length >= 3 });
    }
  }
  return out;
}

const CALLS = calls();

/**
 * The endings plain "s" is wrong for.
 *
 * Read against the LAST word, which is the one that pluralises -
 * `"buying-intent question"` becomes "buying-intent questions", not
 * "buying-intent questions" by luck.
 */
function needsMoreThanS(noun: string): string | null {
  const word = noun.trim().split(/[\s-]+/).pop()!.toLowerCase();
  if (/(?:s|x|z|ch|sh)$/.test(word)) return `"${word}" ends in a sibilant and takes "es"`;
  if (/[^aeiou]y$/.test(word)) return `"${word}" ends in consonant+y and takes "ies"`;
  if (/[^aeiou]o$/.test(word)) return `"${word}" ends in consonant+o and English varies`;
  if (/(?:fe|[^f]f)$/.test(word)) return `"${word}" ends in f/fe and may take "ves"`;
  const irregular = /^(?:person|child|man|woman|foot|tooth|mouse|goose|criterion|datum|analysis|index|matrix|appendix|medium)$/;
  if (irregular.test(word)) return `"${word}" is irregular`;
  return null;
}

// --------------------------------------------------------------- denominator

test("the walk can see the call sites it is written about", () => {
  /**
   * Asserted before anything is judged. A rename of `count`, or an import path
   * this filter stops recognising, empties the walk and every rule below it
   * passes on nothing - four of this repo's own tripwires have failed exactly
   * that way, and this one is keyed on an import, which is the fragile part.
   */
  assert.ok(CALLS.length >= 15, `expected at least 15 count() call sites, found ${CALLS.length}`);
  const nouns = new Set(CALLS.map((c) => c.noun).filter(Boolean));
  assert.ok(nouns.size >= 8, `expected at least 8 distinct nouns, found ${nouns.size}: ${[...nouns].join(", ")}`);
  assert.ok(
    CALLS.some((c) => c.file.includes("result-figures")),
    "the report's own figures are not in this walk - the import filter is wrong",
  );
});

test("every noun passed to count is readable from source", () => {
  /**
   * The walk going blind is the one failure that must not be silent. A noun
   * arriving as a variable is not a defect in itself - it is this sweep losing
   * the ability to judge anything - so it fails here and gets looked at.
   */
  const opaque = CALLS.filter((c) => c.noun === null);
  assert.deepEqual(
    opaque.map((c) => `${c.file}: count(..., ${c.raw})`),
    [],
    "a count() noun is not a string literal, so no rule in this file can read it. " +
      "Either pass the noun literally, or give the plural explicitly as the third argument.",
  );
});

// ---------------------------------------------------------------- the rule

test("a noun given without a plural is one that plain s is right for", () => {
  const wrong: string[] = [];
  for (const c of CALLS) {
    if (c.explicit || c.noun === null) continue;
    const why = needsMoreThanS(c.noun);
    if (why) wrong.push(`${c.file}: count(..., "${c.noun}") - ${why}`);
  }
  assert.deepEqual(
    wrong,
    [],
    "a count() call would render a wrong plural.\n" +
      "`count` defaults to `singular + \"s\"`, so these print a word no reader would write.\n" +
      "Pass the plural as the third argument - that is what it is for.",
  );
});

test("the rule is load-bearing, not decoration", () => {
  /**
   * A green-expected case, recorded as HELD rather than as a pass: the rule
   * must refuse the dangerous noun and accept the same noun once its plural is
   * given, or it is a ban on a word rather than a rule about a call.
   */
  assert.ok(needsMoreThanS("company"), "the rule does not catch company -> companys");
  assert.ok(needsMoreThanS("category"), "the rule does not catch category -> categorys");
  assert.ok(needsMoreThanS("match"), "the rule does not catch match -> matchs");
  assert.equal(needsMoreThanS("question"), null, "the rule refuses a noun that is fine");
  assert.equal(needsMoreThanS("buying-intent question"), null, "the rule reads the wrong word of a phrase");
});
