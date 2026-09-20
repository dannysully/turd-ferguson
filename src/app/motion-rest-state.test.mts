import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { MOTION_SCRIPT } from "../components/motion-script.ts";

/**
 * What the page looks like when the trigger never arrives.
 *
 * `motion-script.test.mts` opens its last three tests with this claim:
 *
 *   "the from-states in globals.css are all scoped to html[data-motion="on"],
 *    so a visitor who never gets that attribute sees the finished page rather
 *    than an invisible one. On an AI visibility product that is the property
 *    that matters most on the site."
 *
 * Then it tests the script. All three assert that `data-motion` is not set -
 * under reduced motion, with no IntersectionObserver - and not one of them
 * reads `globals.css`. The stated property is about the stylesheet and the
 * evidence is about the trigger, so the sentence is carried by a check that
 * cannot fail if it stops being true. That is the species `75ff8d6` went after
 * one level up: a test passing because something else nearby is right.
 *
 * Nothing here is a live defect. The tree is clean under both rules below and
 * each is proved against an injected instance before being committed. What was
 * missing is that either could be broken by one ordinary edit - a new animating
 * class, or a from-state written the way every other from-state on the web is
 * written - with every existing test still green.
 *
 * ## Two rules, and they fail in different rooms
 *
 * **1. No rest state outside `html[data-motion="on"]`.** The attribute is only
 * set by the script, and only after it has cleared `prefers-reduced-motion` and
 * `IntersectionObserver`. So an unscoped from-state is one that applies with no
 * JavaScript at all: a crawler renders the page and finds the placement table
 * and the prompt list empty. That is the whole product's subject matter.
 *
 * **2. A class that carries content never rests invisible, even when the
 * attribute IS set.** This is the room the first rule cannot see into, and it
 * is not hypothetical here. `data-motion="on"` is set before first paint;
 * `.in-view` arrives only when IntersectionObserver delivers - and the note at
 * the foot of docs/inbox.md records the cloud session measuring exactly the
 * state where it does not, because a background tab has `document.hidden` and
 * Chrome suspends rAF and IO delivery with it. In that window every `.ac-row`
 * sits at its rest opacity indefinitely. The boards' `acIn` goes 0 -> 1;
 * globals.css deliberately departs from them and comes up from .55 instead,
 * and says why. A later edit restoring the board's 0 would be faithful to the
 * artboard, pass rule 1, pass every test in the repo, and blank the page for
 * anyone who opened it in a background tab.
 *
 * The same holds for the keyframe rather than the rule: `.in-view` sets
 * `animation: ... both`, and `both` means the element holds the keyframe's
 * from-state through its stagger delay. So the `from` block is a rest state too
 * and is checked as one.
 */

const CSS = readFileSync(join(fileURLToPath(import.meta.url), "..", "globals.css"), "utf8");

/**
 * The classes the script observes, read out of the shipped script rather than
 * copied here, so a new animating class comes under both rules the moment it
 * joins `SEL` and this file needs no edit. `.seq-*` is deliberately out of
 * scope: those render only inside a live scan, from a client component, so no
 * crawler ever meets them and they animate on mount rather than on a trigger.
 */
function triggerClasses(): string[] {
  const found = /var SEL='([^']+)'/.exec(MOTION_SCRIPT);
  assert.ok(found, "the script no longer declares `var SEL='...'` - teach this test the new shape");
  return found[1]
    .split(",")
    .map((s) => s.trim().replace(/^\./, ""))
    .filter(Boolean);
}

/**
 * The classes that carry words a reader needs, as against decoration.
 *
 * `.ac-row` is table rows, prompt lists and paragraphs; `.ac-stamp` is the
 * pills that sit on them. The other four are a chart line, a chart dot and two
 * connector strokes - globals.css says "a dot is not content; a table row is"
 * and lets those start at 0. Rule 2 applies to this set only.
 */
const CONTENT_CLASSES = ["ac-row", "ac-stamp"];

/**
 * The floor for rule 2, and it is no longer a legibility floor.
 *
 * It was 0.4, guarding the property that a content class stays readable while
 * it waits. Danny's instruction on 20 Sep took `.ac-row` to 0.15 to make the
 * entrance read, which argues with that rule directly - and he asked for the
 * rule to be restated rather than deleted.
 *
 * So the property has changed shape. It used to be "a waiting element is
 * legible", held by a number. It is now "a waiting element cannot wait
 * indefinitely", held by the failsafe in `motion-script.ts` and checked by
 * `the failsafe that lets rule 2 be this low` below. What survives as a number
 * is only the weaker half: **present rather than absent.** A from-state of
 * literally 0, or so close to it that the element cannot be seen at all, is
 * still refused - a visitor who looks at the page during the failsafe window
 * should see something arriving rather than a blank area that later fills in,
 * and an element at 0 with a failsafe that regresses is a blank page again.
 *
 * 0.1 rather than 0.15, deliberately: this is the floor, not the value. Pinning
 * it to exactly what the CSS says today would make the test a copy of the thing
 * it checks - the blind-tripwire recipe this repo has been bitten by four
 * times - and would fail on any future amplitude tweak that is not a defect.
 */
const LEGIBLE = 0.1;

type Rule = { selector: string; decls: string };

/**
 * A small CSS reader: rules, and `@keyframes` blocks by name.
 *
 * A parser rather than a regex over the file because both rules turn on
 * *which* selector a declaration sits under, and a regex cannot tell a
 * declaration inside `html[data-motion="on"] .ac-row` from one inside
 * `.ac-row`. It knows about comments, nesting, at-rules that wrap other rules
 * and at-rules that do not, and nothing else.
 */
function parse(css: string): { rules: Rule[]; keyframes: Map<string, string> } {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: Rule[] = [];
  const keyframes = new Map<string, string>();
  // @media and friends wrap other rules, so their braces are pushed and popped
  // rather than consumed - the rules inside must be seen with their own
  // selectors, which is where the scoping lives.
  let wrappers = 0;
  let prelude = "";
  let i = 0;

  while (i < clean.length) {
    const c = clean[i];

    if (c === "{") {
      const head = prelude.trim();
      prelude = "";
      if (/^@(media|supports|layer|container|scope)\b/i.test(head)) {
        wrappers++;
        i++;
        continue;
      }
      let depth = 1;
      let j = i + 1;
      while (j < clean.length && depth > 0) {
        if (clean[j] === "{") depth++;
        else if (clean[j] === "}") depth--;
        j++;
      }
      const body = clean.slice(i + 1, j - 1);
      if (/^@keyframes\b/i.test(head)) {
        keyframes.set(head.replace(/^@keyframes\s+/i, "").trim(), body);
      } else if (!head.startsWith("@")) {
        rules.push({ selector: head, decls: body });
      }
      i = j;
      continue;
    }

    if (c === "}") {
      if (wrappers > 0) wrappers--;
      prelude = "";
      i++;
      continue;
    }

    prelude += c;
    i++;
  }

  return { rules, keyframes };
}

function declarations(body: string): { prop: string; value: string }[] {
  const out: { prop: string; value: string }[] = [];
  for (const chunk of body.split(";")) {
    const text = chunk.trim();
    if (!text) continue;
    const at = text.indexOf(":");
    if (at === -1) continue;
    out.push({
      prop: text.slice(0, at).trim().toLowerCase(),
      value: text.slice(at + 1).trim().toLowerCase(),
    });
  }
  return out;
}

/**
 * Is this declaration a state the element has to be *triggered* out of?
 *
 * `animation` counts, and that is the non-obvious one: with `both` the element
 * holds the keyframe's from-state until the delay elapses, so an animation is a
 * rest state for as long as it has not started. `transform-origin`, `display`
 * and `animation-delay` do not count - matching on the exact property name is
 * what keeps `transform-origin: left center` out of the results.
 */
function restState(d: { prop: string; value: string }): string | null {
  const said = `${d.prop}: ${d.value}`;
  switch (d.prop) {
    case "opacity": {
      const n = Number(d.value);
      return Number.isFinite(n) && n < 1 ? said : null;
    }
    case "transform":
    case "clip-path":
      return d.value === "none" ? null : said;
    case "visibility":
      return d.value === "hidden" ? said : null;
    case "display":
      return d.value === "none" ? said : null;
    case "stroke-dashoffset": {
      const n = parseFloat(d.value);
      return Number.isFinite(n) && n !== 0 ? said : null;
    }
    case "animation":
    case "animation-name":
      return d.value === "none" ? null : said;
    default:
      return null;
  }
}

/** `.ac-row` must not match `.ac-row-wide`, and `.in-view` is not a class here. */
function mentions(selectorPart: string, cls: string): boolean {
  return new RegExp(`\\.${cls}(?![\\w-])`).test(selectorPart);
}

const SCOPED = /html\[data-motion\s*=\s*["']?on["']?\]/;

const { rules, keyframes } = parse(CSS);

test("the stylesheet parses into rules the rest of this file can read", () => {
  // The guard on both rules below. Every assertion here is "no offenders
  // found", which is also what a parser that found nothing would report - so
  // the narrowing is asserted rather than assumed.
  assert.ok(rules.length > 50, `only ${rules.length} rules parsed out of globals.css`);
  assert.ok(keyframes.has("ac-row"), "the ac-row keyframes were not found");
  const classes = triggerClasses();
  assert.ok(classes.length >= 6, `only ${classes.length} trigger classes read out of the script`);
  for (const c of CONTENT_CLASSES) {
    assert.ok(
      classes.includes(c),
      `${c} is no longer a trigger class - rule 2 is guarding a name that has moved`,
    );
  }
});

test("no motion rest state applies without html[data-motion=\"on\"]", () => {
  const classes = triggerClasses();
  const offenders: string[] = [];
  let checked = 0;

  for (const rule of rules) {
    for (const part of rule.selector.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!classes.some((c) => mentions(part, c))) continue;
      const states = declarations(rule.decls)
        .map(restState)
        .filter((s): s is string => s !== null);
      if (!states.length) continue;
      checked++;
      if (!SCOPED.test(part)) offenders.push(`${part} { ${states.join("; ")} }`);
    }
  }

  assert.ok(
    checked >= 10,
    `only ${checked} rest-state rules found on the trigger classes - this test is no longer ` +
      `reading the stylesheet it thinks it is`,
  );
  assert.deepEqual(
    offenders,
    [],
    `a from-state outside html[data-motion="on"] applies with no JavaScript at all, so a crawler ` +
      `renders the page with this content hidden:\n  ${offenders.join("\n  ")}`,
  );
});

test("every from-state belongs to a class the script actually observes", () => {
  /**
   * Rule 3, and it is the same blank page reached from the third direction.
   *
   * A from-state is lifted by `.in-view`, and `.in-view` is only ever added by
   * the script, and the script only adds it to what matches `SEL`. So a class
   * with a from-state that is *not* in `SEL` is not a slow animation - it is an
   * element that holds its from-state for the life of the page, with motion
   * enabled and nothing wrong on screen to explain it. `opacity: 0` written
   * that way is permanent.
   *
   * The two lists agree today because both have six entries and the same six.
   * Nothing made them agree: `SEL` is a string in one file and these are rules
   * in another, and adding a new animating class means editing both. This is
   * the edit that only gets made once.
   */
  const classes = triggerClasses();
  const orphans: string[] = [];
  let checked = 0;

  for (const rule of rules) {
    for (const part of rule.selector.split(",").map((s) => s.trim()).filter(Boolean)) {
      /**
       * Scoped rules only, and the scope is the whole point rather than a
       * convenience: `html[data-motion="on"]` is what marks a declaration as a
       * state the script is expected to come back for. Without that narrowing
       * this reads every `display: none` on the site as a from-state - the
       * `phone-only`/`desktop-only` pairs, the first-of-type table headers -
       * and the `.seq-*` set, which animates on mount and waits for nothing.
       * None of those need an observer and none of them are this bug.
       */
      if (!SCOPED.test(part)) continue;
      // Only the rules that put an element INTO a from-state. A `.in-view` rule
      // is the way out of one, so it needs no observer of its own.
      if (/\.in-view(?![\w-])/.test(part)) continue;
      const states = declarations(rule.decls)
        .map(restState)
        .filter((s): s is string => s !== null);
      if (!states.length) continue;
      const named = [...part.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
      if (!named.length) continue;
      checked++;
      if (!named.some((c) => classes.includes(c))) {
        orphans.push(`${part} { ${states.join("; ")} }`);
      }
    }
  }

  assert.ok(
    checked >= 6,
    `only ${checked} from-state rules found - this test is not reading what it thinks it is`,
  );
  assert.deepEqual(
    orphans,
    [],
    `these rules put a class into a from-state that the motion script never observes, so ` +
      `.in-view never arrives and the element holds it for the life of the page. Add the class ` +
      `to SEL in motion-script.ts, or drop the from-state:\n  ${orphans.join("\n  ")}`,
  );
});

test("a class that carries content never rests invisible, even with motion on", () => {
  const offenders: string[] = [];
  let checked = 0;

  for (const rule of rules) {
    for (const part of rule.selector.split(",").map((s) => s.trim()).filter(Boolean)) {
      const cls = CONTENT_CLASSES.find((c) => mentions(part, c));
      if (!cls) continue;
      for (const d of declarations(rule.decls)) {
        if (d.prop !== "opacity") continue;
        const n = Number(d.value);
        if (!Number.isFinite(n)) continue;
        checked++;
        if (n < LEGIBLE) offenders.push(`${part} { opacity: ${d.value} }`);
      }
    }
  }

  /**
   * The same question asked of the keyframes, because `animation: ... both`
   * holds the from-state through the stagger delay. A row eight beats down a
   * group waits .72s at whatever `from` says before its animation starts.
   */
  for (const rule of rules) {
    for (const part of rule.selector.split(",").map((s) => s.trim()).filter(Boolean)) {
      const cls = CONTENT_CLASSES.find((c) => mentions(part, c));
      if (!cls) continue;
      for (const d of declarations(rule.decls)) {
        if (d.prop !== "animation" && d.prop !== "animation-name") continue;
        const name = d.value.split(/\s+/).find((tok) => keyframes.has(tok));
        if (!name) continue;
        for (const step of parse(keyframes.get(name)!).rules) {
          const stops = step.selector.split(",").map((s) => s.trim().toLowerCase());
          if (!stops.some((s) => s === "from" || s === "0%")) continue;
          for (const kd of declarations(step.decls)) {
            if (kd.prop !== "opacity") continue;
            const n = Number(kd.value);
            if (!Number.isFinite(n)) continue;
            checked++;
            if (n < LEGIBLE) offenders.push(`@keyframes ${name} { from { opacity: ${kd.value} } }`);
          }
        }
      }
    }
  }

  assert.ok(
    checked >= 2,
    `only ${checked} opacity values found on the content classes - this test is not reading ` +
      `what it thinks it is`,
  );
  assert.deepEqual(
    offenders,
    [],
    `.in-view arrives from IntersectionObserver, and a background tab suspends its delivery - so ` +
      `a content class resting below ${LEGIBLE} is a blank page for as long as that lasts:\n  ` +
      offenders.join("\n  "),
  );
});

test("the rest state and the keyframe's from-state say the same thing", () => {
  /**
   * `.in-view` sets `animation: ... both`, so the element holds the rule's
   * from-state until its stagger delay elapses and then holds the keyframe's
   * `from` for an instant before the animation moves. If the two disagree the
   * element jumps at the moment its animation starts - a step in the middle
   * of what is meant to be one movement, worst on the rows furthest down a
   * group because they wait longest at the first value.
   *
   * It is two numbers in two places that have to be kept by hand, which is
   * this repo's most reliable source of drift, and Danny's note taking the
   * amplitude to `.15 / 16px` said "both places, they must stay identical"
   * without anything holding it. Now something does.
   */
  const restRule = rules.find((r) => /html\[data-motion="on"\]\s*\.ac-row$/.test(r.selector.trim()));
  assert.ok(restRule, "no bare `html[data-motion=\"on\"] .ac-row` rule found - teach this test the new shape");

  const rest: Record<string, string> = {};
  for (const d of declarations(restRule.decls)) rest[d.prop] = d.value.trim();

  const frame = parse(keyframes.get("ac-row")!).rules.find((r) =>
    r.selector.split(",").map((s) => s.trim().toLowerCase()).some((s) => s === "from" || s === "0%"),
  );
  assert.ok(frame, "@keyframes ac-row has no from block");

  const from: Record<string, string> = {};
  for (const d of declarations(frame.decls)) from[d.prop] = d.value.trim();

  for (const prop of ["opacity", "transform"]) {
    assert.ok(rest[prop], `the rest rule no longer sets ${prop}`);
    assert.ok(from[prop], `@keyframes ac-row { from } no longer sets ${prop}`);
    assert.equal(
      rest[prop],
      from[prop],
      `the rest state says ${prop}: ${rest[prop]} and @keyframes ac-row { from } says ` +
        `${from[prop]}. With \`animation: ... both\` the element holds one and then the other, ` +
        `so it jumps the moment its stagger delay elapses.`,
    );
  }
});

test("the failsafe that lets rule 2 be this low", () => {
  /**
   * The other half of rule 2, and now the half carrying the weight.
   *
   * `.ac-row` rests at 0.15. That is only defensible because the window it can
   * last for is bounded: `motion-script.ts` reveals anything on screen a short
   * time after each scan, and again when the tab becomes visible. Take that
   * away and 0.15 becomes a blank page for the life of the tab, which is
   * exactly the failure the old 0.55 floor was insurance against.
   *
   * Every value is read out of the script rather than retyped here. A test
   * that duplicates the thing it checks is true by construction, which is the
   * species this repo has been bitten by four times.
   */
  const ms = /var FAILSAFE_MS=(\d+)/.exec(MOTION_SCRIPT);
  assert.ok(ms, "motion-script.ts no longer declares `var FAILSAFE_MS=<n>` - teach this test the new shape");
  const window = Number(ms[1]);

  /**
   * The longest legitimate arrival, derived rather than assumed: the stagger
   * cap times the stagger, plus the animation. Read the cap out of the script
   * and the durations out of the stylesheet, so raising either moves this
   * bound with it.
   */
  const cap = Number(/k>(\d+)\?/.exec(MOTION_SCRIPT)?.[1] ?? NaN);
  assert.ok(Number.isFinite(cap), "the stagger cap is no longer `k>N?` in the script");
  const stagger = Number(/--ac-stagger,\s*([\d.]+)s/.exec(CSS)?.[1] ?? NaN);
  assert.ok(Number.isFinite(stagger), "no --ac-stagger fallback found in globals.css");
  const longest = (cap * stagger + 0.45) * 1000;

  assert.ok(
    window >= longest,
    `FAILSAFE_MS is ${window}ms and the longest legitimate arrival is ${longest}ms (${cap} beats ` +
      `of ${stagger}s plus the .45s animation). A failsafe shorter than that fires while a group ` +
      `is still arriving normally.`,
  );
  assert.ok(
    window <= 4000,
    `FAILSAFE_MS is ${window}ms. A content class rests at an opacity this test only permits ` +
      `because the wait is bounded - four seconds of near-invisible text is not bounded enough.`,
  );

  // The sweep must be reachable from both paths, and armed from the scan.
  assert.match(MOTION_SCRIPT, /function sweep\(\)/, "the failsafe sweep is gone");
  assert.match(
    MOTION_SCRIPT,
    /visibilitychange[\s\S]{0,80}visibilityState==='visible'[\s\S]{0,20}arm\(\)/,
    "nothing re-arms the failsafe when the tab becomes visible - this is the background-tab case, " +
      "which is the one that made the old 0.55 floor necessary",
  );
  assert.match(
    MOTION_SCRIPT,
    /io\.observe\(el\);\s*\}\s*arm\(\);/,
    "scan() no longer arms the failsafe, so content inserted by a client navigation has none",
  );

  /**
   * Armed only when idle. Re-arming on every insertion would let a page that
   * mutates constantly - `/scan` during a live run - postpone its own failsafe
   * for as long as it keeps mutating, which is the one page where a stuck row
   * would be least visible and longest lived.
   */
  assert.match(
    MOTION_SCRIPT,
    /function arm\(\)\{\s*if\(armed\)return;/,
    "arm() no longer refuses to re-arm while a sweep is pending, so a constantly mutating page " +
      "can slide its failsafe indefinitely",
  );

  /**
   * And it must stay a targeted reveal rather than a blanket one. Without the
   * rect test every section below the fold plays at once, unseen - the trigger
   * defeating itself, which is the trap Danny named when he asked for this.
   */
  assert.match(
    MOTION_SCRIPT,
    /getBoundingClientRect\(\)/,
    "the sweep no longer measures position, so it reveals below-fold content that nobody has " +
      "scrolled to",
  );
  assert.match(
    MOTION_SCRIPT,
    /b\.bottom<0\|\|b\.top>h/,
    "the sweep no longer bounds vertically - off-screen rows must keep their scroll trigger",
  );
  assert.match(
    MOTION_SCRIPT,
    /if\(!b\.width&&!b\.height\)continue/,
    "the sweep no longer skips boxless elements, so the hidden half of a responsive pair is " +
      "revealed as though somebody were looking at it",
  );
});
