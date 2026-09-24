import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { seqClimb, seqStep } from "./seq-stagger.ts";

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

/**
 * The motion gate, as a selector prefix.
 *
 * Every animating rule in this block is scoped to it. That is the site's own
 * rule - `motion-script.ts` states it, the `.ac-row` family has always kept it
 * - and the seq-* block was the one exception, which was survivable only while
 * these classes existed behind a running scan and nothing else. `seqIn` and
 * `seqSettle` start at opacity 0, so an unscoped rule means anything that
 * renders the page without running Motion's script - a crawler, the capture,
 * JavaScript off - sees the contents as invisible rather than as settled.
 * `ProcessSequence` puts these classes on the homepage, so that is now a
 * crawled page, and the scoping is asserted below rather than trusted.
 */
const MOTION = 'html[data-motion="on"]';

/**
 * Classes a rule targets under the motion gate: `html[data-motion="on"] .a`,
 * and the `:is(.a, .b)` form the reduced-motion resets use to match the
 * specificity of what they take off.
 */
function scopedClasses(sel: string): string[] {
  if (!sel.includes(MOTION)) return [];
  // Read the whole selector rather than splitting it on commas first: the
  // reset blocks put their class list inside `:is(...)`, whose own commas a
  // split would tear apart, leaving every class but the first looking like an
  // unscoped fragment and dropping it. That is how `.proc-beat` - last in the
  // list - came back as an animating class with no reset when it is sitting in
  // the reset.
  return [...sel.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
}

/** Every class a rule targets, however it is scoped. */
function ruleClasses(sel: string): string[] {
  return [...bareClasses(sel), ...scopedClasses(sel)];
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

/** Animating classes whose rule sits behind the motion gate. */
const GATED = new Set<string>();

for (const r of ALL) {
  if (!setsAnimation(r.body)) continue;
  for (const c of ruleClasses(r.sel)) {
    if (inReset(r.at)) CALMED.add(c);
    else {
      ANIMATING.set(c, r.at);
      if (r.sel.includes(MOTION)) GATED.add(c);
    }
  }
}

const DECLARED = new Set(ALL.flatMap((r) => ruleClasses(r.sel)));

test("the sheet is being parsed at all", () => {
  // A regex that silently matched nothing would make every test below vacuous.
  assert.ok(ANIMATING.size >= 10, "expected the seq-* animations, found " + ANIMATING.size);
  assert.ok(ANIMATING.has("seq-settle"), "seq-settle should be an animating class");
  assert.equal(SPANS.length > 0, true, "expected a prefers-reduced-motion block");
});

test("the stagger emits a class the sheet defines, and never runs out", () => {
  // The lists it is indexed by are 3, 3, 4 and 5 long today - and the five is
  // QUESTION_ROWS, which sat exactly on the old five-rung ceiling. Well past
  // all of them, because the point is that growing a list must not quietly
  // flatten the tail of the stagger the way the clamped ladder did.
  const beats = new Set<unknown>();
  for (let n = 0; n < 40; n++) {
    const { className, style } = seqStep(n);
    assert.ok(
      DECLARED.has(className),
      "seqStep(" + n + ") gave ." + className + ", which no rule in globals.css matches",
    );
    beats.add((style as Record<string, unknown>)["--ac-i"]);
  }
  assert.equal(beats.size, 40, "every list position must get its own beat - a repeat is a flattened tail");
  assert.equal((seqStep(0).style as Record<string, unknown>)["--ac-i"], 0, "the first row is not delayed");
});

test("the delay is computed from the index rather than written out as rungs", () => {
  const step = ALL.find((r) => ruleClasses(r.sel).includes("seq-step") && setsAnimation(r.body) && !inReset(r.at));
  assert.ok(step, "expected a .seq-step rule in globals.css");
  assert.match(
    step!.body,
    /animation-delay\s*:\s*calc\([^)]*--ac-i/,
    ".seq-step must take its delay from --ac-i, or the index seqStep sets goes nowhere",
  );
  // The shorthand resets animation-delay, so the longhand has to come after it.
  assert.ok(
    step!.body.indexOf("animation-delay") > step!.body.indexOf("animation:"),
    "the animation shorthand would reset a delay declared before it",
  );
});

test("the climb travels the places the numbers claim, and no more", () => {
  // SerpPanel's own comment: the distance is (places moved x the height of one
  // result), "so the motion cannot claim more movement than the numbers do".
  // It was enforced by `p.from - p.to === 5 ? "seq-climb5" : "seq-climb4"`,
  // which is right for the two panels on the board and wrong for everything
  // else - a 2-place journey took the 4-place rung and travelled twice as far
  // as the numbers support. Over-claiming is the direction that matters.
  for (const [from, to, places] of [[10, 5, 5], [5, 1, 4], [3, 1, 2], [40, 1, 39], [2, 2, 0], [1, 6, 0]]) {
    const { className, style } = seqClimb(from, to);
    assert.ok(
      DECLARED.has(className),
      "seqClimb(" + from + ", " + to + ") gave ." + className + ", which no rule in globals.css matches",
    );
    assert.equal(
      (style as Record<string, unknown>)["--ac-places"],
      places,
      from + " to " + to + " is " + places + " places and the travel must say so",
    );
  }
});

test("the climb is one keyframe reading the index, not a ladder of distances", () => {
  const climb = ALL.find((r) => ruleClasses(r.sel).includes("seq-climb") && setsAnimation(r.body) && !inReset(r.at));
  assert.ok(climb, "expected a .seq-climb rule in globals.css");
  // The two-rung ladder is what over-claimed; nothing should reintroduce it.
  const rungs = [...DECLARED].filter((c) => /^seq-climb\d/.test(c));
  assert.deepEqual(rungs, [], "a fixed-distance climb rung is back: " + rungs.join(", "));
  assert.match(
    CSS,
    /@keyframes\s+seqClimb\s*\{[^}]*calc\([^)]*--ac-places/,
    "seqClimb must take its travel from --ac-places, or the places seqClimb sets go nowhere",
  );
});

/**
 * Every class-list literal on a line, in all three spellings JSX uses.
 *
 * The first version of this read double-quoted strings only, because that is
 * how `SerpPanel` spelled the clobber it was written to catch. Nothing in the
 * tree uses the other two today - so the rule was not wrong, it was one
 * ordinary refactor away from silently seeing nothing. A conditional className
 * in React is most naturally a template literal, and this board is the one
 * surface on the site with no witness but this file: a sweep that stops
 * matching here fails the same way the clamped ladder did, by reading correct.
 *
 * Interpolations are blanked rather than skipped, so `` `seq-settle seq-in${n}` ``
 * still yields `seq-settle` and the static half of a spliced pair is checked.
 * Tokens are charset-filtered afterwards, which is what keeps a prose string
 * from being read as a class list.
 */
export function classCandidates(line: string): string[][] {
  const out: string[][] = [];
  for (const lit of line.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g)) {
    const raw = lit[1] ?? lit[2] ?? lit[3] ?? "";
    const body = lit[3] === undefined ? raw : raw.replace(/\$\{[^}]*\}/g, " ");
    const names = body
      .trim()
      .split(/\s+/)
      .filter((t) => /^[a-zA-Z0-9_-]+$/.test(t));
    if (names.length) out.push(names);
  }
  return out;
}

test("the class-list reader sees all three JSX spellings", () => {
  // Guards the broadening itself. Without this the regex could go back to
  // double quotes only and every assertion below would pass over nothing.
  const seen = (line: string) => classCandidates(line).map((n) => n.join(" "));
  assert.deepEqual(seen('<i className="seq-settle seq-in2" />'), ["seq-settle seq-in2"]);
  assert.deepEqual(seen("<i className='seq-settle seq-in2' />"), ["seq-settle seq-in2"]);
  assert.deepEqual(seen("<i className={`seq-settle seq-in2`} />"), ["seq-settle seq-in2"]);
  // The interpolated form: the static half survives so a spliced pair is still
  // compared, which is the shape SerpPanel's original clobber was written in.
  assert.deepEqual(seen("<i className={`seq-settle seq-in${n}`} />"), ["seq-settle seq-in"]);
  /**
   * Prose does come back as tokens - "the", "scan" and the rest are all legal
   * class names and there is no way to tell them apart here. That is why the
   * charset filter is not the thing keeping this rule honest: `ANIMATING.has`
   * is, and a word only survives it by being a class that sets `animation` in
   * globals.css. Asserted as the property that actually holds.
   */
  const prose = classCandidates('throw new Error("the scan took too long and was stopped");');
  assert.deepEqual(
    prose.flat().filter((c) => ANIMATING.has(c)),
    [],
    "a prose string read as a class list - the sweep would report it as a clobber",
  );
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
        for (const names of classCandidates(line)) {
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

test("every seq-* from-state is behind the motion gate", () => {
  /**
   * The crawler rule, asserted rather than trusted.
   *
   * `seqIn` and `seqSettle` start at opacity 0. An unscoped rule therefore
   * means anything rendering the page without running Motion's script - a
   * crawler, the capture, JavaScript off, a reader between first paint and
   * hydration - gets the contents as invisible rather than as settled. That
   * was survivable while these classes only ever existed behind a running
   * scan, which is nothing's idea of a crawlable page. `ProcessSequence` puts
   * the same classes on the homepage, so it is not survivable now.
   *
   * The sheet's other animating families - `.ac-row`, `.chart-line`,
   * `.flow-line` - have kept this rule from the start; `motion-script.ts`
   * states it as the rule. This is the block that was the exception, so this
   * is the block that gets the assertion.
   */
  const loose = [...ANIMATING.keys()]
    .filter((c) => /^(seq|proc)-/.test(c))
    .filter((c) => !GATED.has(c))
    .sort();
  assert.deepEqual(
    loose,
    [],
    'these animate outside html[data-motion="on"], so their from-state is what a crawler sees: ' + loose.join(", "),
  );
});
