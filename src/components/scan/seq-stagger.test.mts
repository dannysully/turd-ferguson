import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { SEQ_LADDER, seqIn } from "./seq-stagger.ts";

/**
 * The stylesheet, read as a stylesheet.
 *
 * These three tests exist because of one line in `SerpPanel`, which read
 * `className={r.you ? climb : "seq-settle seq-in" + (n ? n + 1 : "")}` and was
 * wrong twice over in ways nothing on this project could see:
 *
 * 1. `.seq-settle` and `.seq-in<n>` both set the `animation` shorthand at equal
 *    specificity, and `.seq-settle` is later in the sheet. It therefore took
 *    the whole property and reset the other's longhands. The staggered fade
 *    never ran on a single row - the rung was dead markup that reads correctly.
 * 2. `n` indexes the full row list and the longer listing has eight rows, so it
 *    also emitted `.seq-in6`, `.seq-in7` and `.seq-in8`. No rule matches those.
 *
 * Neither is visible in the markup, in the DOM, or in a typecheck, and this is
 * the one board on the site nobody has ever watched in a browser - its classes
 * only exist while a scan is running. The cascade is the only witness, so the
 * cascade is what gets asserted.
 */

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** Comments first: they contain the words these tests grep for. */
const CSS = readFileSync(join(ROOT, "src/app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

type Rule = { sel: string; body: string; at: number };

/**
 * Innermost `selector { body }` pairs, in source order. Rules nested in an
 * at-rule come out flat, with the at-rule's own header discarded - which is
 * what we want, because `at` still locates them and that is how the
 * reduced-motion block is told apart below. Keyframe steps fall out on their
 * own: `from` and `50%` are not class selectors.
 */
function rules(css: string): Rule[] {
  const out: Rule[] = [];
  const re = /([^{}]*)\{([^{}]*)\}/g;
  for (let m = re.exec(css); m; m = re.exec(css)) out.push({ sel: m[1].trim(), body: m[2], at: m.index });
  return out;
}

/** The bare single-class selectors in a rule. `.a, .b .c, .d` gives a and d. */
function bareClasses(sel: string): string[] {
  return sel
    .split(",")
    .map((s) => s.trim().match(/^\.([a-zA-Z0-9_-]+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => m[1]);
}

const setsAnimation = (body: string) => /(^|[;\s])animation(-name)?\s*:/.test(body);

/** Character ranges covered by a `prefers-reduced-motion: reduce` block. */
function reducedMotionSpans(css: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  const re = /@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/g;
  for (let m = re.exec(css); m; m = re.exec(css)) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
    }
    spans.push([m.index, i]);
  }
  return spans;
}

const ALL = rules(CSS);
const SPANS = reducedMotionSpans(CSS);
const inReset = (at: number) => SPANS.some(([a, b]) => at >= a && at < b);

/** class -> source order, for classes that set `animation` in normal flow. */
const ANIMATING = new Map<string, number>();
/** Classes the reduced-motion block puts back. */
const CALMED = new Set<string>();

for (const r of ALL) {
  if (!setsAnimation(r.body)) continue;
  for (const c of bareClasses(r.sel)) {
    if (inReset(r.at)) CALMED.add(c);
    else ANIMATING.set(c, r.at);
  }
}

const DECLARED = new Set(ALL.flatMap((r) => bareClasses(r.sel)));

test("the sheet is being parsed at all", () => {
  // A regex that silently matched nothing would make every test below vacuous.
  assert.ok(ANIMATING.size >= 10, "expected the seq-* animations, found " + ANIMATING.size);
  assert.ok(ANIMATING.has("seq-settle"), "seq-settle should be an animating class");
  assert.equal(SPANS.length > 0, true, "expected a prefers-reduced-motion block");
});

test("the stagger ladder only ever emits a class the sheet defines", () => {
  // The lists it is indexed by are 3, 4, 5 and 8 long today. Well past all of
  // them, because the point is that growing a list must not break the stagger.
  for (let n = 0; n < 40; n++) {
    const cls = seqIn(n);
    assert.ok(DECLARED.has(cls), "seqIn(" + n + ") gave ." + cls + ", which no rule in globals.css matches");
  }
  assert.equal(seqIn(0), "seq-in", "the first rung has no number");
  assert.equal(seqIn(SEQ_LADDER - 1), "seq-in" + SEQ_LADDER, "the last rung is the ladder depth");
  assert.equal(seqIn(99), seqIn(SEQ_LADDER - 1), "past the end, the tail shares the last beat");
});

test("no element carries two classes that both set `animation`", () => {
  const files: string[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(p)) files.push(p);
    }
  })(join(ROOT, "src"));

  const bad: string[] = [];
  for (const f of files) {
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((line, n) => {
        for (const lit of line.matchAll(/"([a-zA-Z0-9_ -]+)"/g)) {
          const names = lit[1].trim().split(/\s+/).filter(Boolean);
          if (names.length < 2) continue;
          const anim = names.filter((c) => ANIMATING.has(c));
          if (anim.length < 2) continue;
          // `animation` is a shorthand and these have equal specificity, so the
          // last one in the sheet takes the property and the rest are inert.
          const winner = anim.reduce((a, b) => (ANIMATING.get(a)! > ANIMATING.get(b)! ? a : b));
          const losers = anim.filter((c) => c !== winner);
          bad.push(
            f.slice(ROOT.length) + ":" + (n + 1) + "  " + anim.map((c) => "." + c).join(" + ") +
              " - ." + winner + " wins, " + losers.map((c) => "." + c).join(", ") + " never runs",
          );
        }
      });
  }
  assert.deepEqual(bad, [], "classes whose animation is clobbered:\n" + bad.join("\n"));
});

test("every animating class is put back by prefers-reduced-motion", () => {
  // seqSettle fades from opacity 0 now, so a class missing from the reset is no
  // longer a lost flourish - it is content that stays invisible.
  const missed = [...ANIMATING.keys()].filter((c) => !CALMED.has(c)).sort();
  assert.deepEqual(missed, [], "animating classes with no reduced-motion reset: " + missed.join(", "));
});
