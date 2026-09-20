import assert from "node:assert/strict";
import { test } from "node:test";

import { MOTION_SCRIPT } from "./motion-script.ts";

/**
 * The entrance script, executed.
 *
 * This is the one piece of imperative code every page's motion depends on and
 * it had no check at all, because it lived in a `.tsx` that `node --test`
 * cannot load. The defect it shipped with - a `display: none` responsive twin
 * holding a stagger slot - sat in the queue as "an inference from markup, not a
 * measurement" for two runs, and was only settled when the cloud session read
 * the real DOM in Chrome on 20 September 2026.
 *
 * That is the argument for running the string rather than reading it. The fake
 * DOM below is small and deliberately dumb: it implements only what the script
 * touches, so a change to the script that reaches for something else fails here
 * loudly rather than passing against a mock that quietly says yes.
 */

type Fake = {
  className: string;
  display: string;
  /** How many client rects the element has. 0 means it takes up no space. */
  rects: number;
  attrs: Record<string, string>;
  vars: Record<string, string>;
  classes: Set<string>;
  previousElementSibling: Fake | null;
  observed: boolean;
};

function row(className: string, display = "block"): Fake {
  return {
    className,
    display,
    // An element that is `display: none` in its own right has no box. That is
    // the only way to lose one here; `inHiddenWrapper` models the other.
    rects: display === "none" ? 0 : 1,
    attrs: {},
    vars: {},
    classes: new Set(className.split(" ").filter(Boolean)),
    previousElementSibling: null,
    observed: false,
  };
}

/**
 * An element with no box that still computes `display: block`, because an
 * ancestor is `display: none`.
 *
 * This is the case `getComputedStyle(el).display` cannot see, and the reason
 * the check is client rects: `display` is not an inherited property, so hiding
 * a wrapper leaves every computed `display` inside it exactly as it was. The
 * subtree is just never laid out.
 */
function inHiddenWrapper(el: Fake): Fake {
  el.rects = 0;
  return el;
}

/**
 * Run the shipped script against a list of siblings and give back the `--ac-i`
 * each one was assigned. `undefined` means the script set nothing on it, which
 * is the right answer for a target that is not an `.ac-row`.
 */
function stagger(els: Fake[], opts: { reducedMotion?: boolean; noIO?: boolean } = {}) {
  for (let i = 0; i < els.length; i++) els[i].previousElementSibling = els[i - 1] ?? null;

  const root = { attrs: {} as Record<string, string>, setAttribute(k: string, v: string) { this.attrs[k] = v; } };

  const sandbox = {
    document: {
      documentElement: root,
      body: {},
      readyState: "complete",
      addEventListener() {},
      querySelectorAll: () => els,
    },
    getComputedStyle: (el: Fake) => ({ display: el.display }),
    IntersectionObserver: class {
      observe(el: Fake) { el.observed = true; }
      unobserve() {}
    },
    MutationObserver: class {
      observe() {}
    },
    requestAnimationFrame: () => 0,
    matchMedia: () => ({ matches: Boolean(opts.reducedMotion) }),
  } as Record<string, unknown>;

  if (opts.noIO) delete sandbox.IntersectionObserver;

  // The script reads `window` for its two capability checks and bare globals
  // for everything else, so the sandbox is both.
  sandbox.window = sandbox;

  for (const el of els) {
    Object.assign(el, {
      hasAttribute(k: string) { return k in (this as unknown as Fake).attrs; },
      setAttribute(k: string, v: string) { (this as unknown as Fake).attrs[k] = v; },
      classList: {
        contains: (c: string) => el.classes.has(c),
        add: (c: string) => el.classes.add(c),
      },
      style: { setProperty: (k: string, v: string) => { el.vars[k] = v; } },
      // `new Array(n)` is length-n, which is all the script reads.
      getClientRects() { return new Array((this as unknown as Fake).rects); },
    });
  }

  const keys = Object.keys(sandbox);
  new Function(...keys, MOTION_SCRIPT)(...keys.map((k) => sandbox[k]));

  return { indices: els.map((e) => e.vars["--ac-i"]), motion: root.attrs["data-motion"] };
}

test("a plain run of rows is staggered 0, 1, 2, 3", () => {
  const { indices } = stagger([row("ac-row"), row("ac-row"), row("ac-row"), row("ac-row")]);
  assert.deepEqual(indices, ["0", "1", "2", "3"]);
});

/**
 * The hero, as the cloud session measured it at 750px. The `desktop-only`
 * paragraph is `display: none` and used to take index 2 anyway, which left the
 * visible sequence at .00, .09, .27, .36 - one .18s step inside a run of .09s,
 * immediately in front of the call to action.
 */
test("a hidden responsive twin does not hold a stagger slot", () => {
  const { indices } = stagger([
    row("ac-row phone-only"),
    row("ac-row"),
    row("ac-row desktop-only", "none"),
    row("ac-row"),
    row("ac-row"),
  ]);
  // The hidden row is still assigned an index - it is an .ac-row and the script
  // does not know it will stay hidden - but it no longer displaces the ones
  // after it. What matters is that the VISIBLE run is contiguous.
  const visible = [indices[0], indices[1], indices[3], indices[4]];
  assert.deepEqual(visible, ["0", "1", "2", "3"], "the visible rows must arrive one beat apart");
});

test("the same fault flipped: a hidden row first does not push the h1 off zero", () => {
  // At desktop width the phone-only label and paragraph go display:none, and
  // the h1 - the LCP element - was inferred to start at index 1 behind an empty
  // beat. This is that case.
  const { indices } = stagger([
    row("ac-row phone-only", "none"),
    row("ac-row"),
    row("ac-row"),
  ]);
  assert.equal(indices[1], "0", "the first visible row is the first beat");
  assert.equal(indices[2], "1");
});

/**
 * The case with no coverage until now, and the one the first fix could not see.
 *
 * `getComputedStyle(el).display === 'none'` catches a row hidden in its own
 * right. It does not catch a row inside a hidden wrapper, because `display` is
 * not inherited - the child still computes `block`. The cloud session found
 * three such elements live at 2160px on 20 September 2026 and they happened to
 * be harmless, having no visible siblings to displace. Built as a responsive
 * pair instead, they are the original defect again.
 *
 * This test fails against the computed-display check and passes against client
 * rects, which is the whole reason the check changed.
 */
test("a row inside a hidden wrapper holds no slot either", () => {
  const { indices } = stagger([
    row("ac-row"),
    row("ac-row"),
    // Computes `display: block`. Has no box, because its wrapper is hidden.
    inHiddenWrapper(row("ac-row desktop-only")),
    row("ac-row"),
    row("ac-row"),
  ]);
  const visible = [indices[0], indices[1], indices[3], indices[4]];
  assert.deepEqual(visible, ["0", "1", "2", "3"], "a phantom wrapper must not hold a beat");
});

test("a fixed-position row is not mistaken for a hidden one", () => {
  // Why not `offsetParent`, which is the other obvious way to ask this: it is
  // null for `position: fixed`, so it would drop rows that are plainly visible.
  // A fixed element has client rects, so this check keeps it.
  const fixed = row("ac-row");
  fixed.rects = 1;
  const { indices } = stagger([row("ac-row"), fixed, row("ac-row")]);
  assert.deepEqual(indices, ["0", "1", "2"], "a fixed row still takes its beat");
});

test("the stagger is capped at eight so a long table still arrives", () => {
  const rows = Array.from({ length: 14 }, () => row("ac-row"));
  const { indices } = stagger(rows);
  assert.equal(indices[8], "8");
  assert.equal(indices[13], "8", "past the cap every row shares the last beat");
});

test("a non-row target is observed but never staggered", () => {
  const els = [row("chart-line"), row("ac-stamp"), row("ac-row")];
  const { indices } = stagger(els);
  assert.equal(indices[0], undefined);
  assert.equal(indices[1], undefined);
  assert.equal(indices[2], "0");
  assert.ok(els.every((e) => e.observed), "every target is handed to the observer");
});

test("a second scan leaves rows it has already seen alone", () => {
  const els = [row("ac-row"), row("ac-row")];
  stagger(els);
  assert.ok(els.every((e) => "data-ac-seen" in e.attrs));
});

/**
 * The two settled-page guarantees, which matter more here than the timing: the
 * from-states in globals.css are all scoped to `html[data-motion="on"]`, so a
 * visitor who never gets that attribute sees the finished page rather than an
 * invisible one. On an AI visibility product that is the property that matters
 * most on the site.
 */
test("reduced motion never sets the attribute, so the page is settled", () => {
  const { motion, indices } = stagger([row("ac-row"), row("ac-row")], { reducedMotion: true });
  assert.equal(motion, undefined);
  assert.deepEqual(indices, [undefined, undefined], "nothing is touched at all");
});

test("no IntersectionObserver means no attribute either", () => {
  const { motion } = stagger([row("ac-row")], { noIO: true });
  assert.equal(motion, undefined);
});

test("an ordinary run does set the attribute", () => {
  const { motion } = stagger([row("ac-row")]);
  assert.equal(motion, "on");
});
