import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { MOTION_SCRIPT } from "./motion-script.ts";
import { PRERENDER_DIR as PRERENDER, sweptPages } from "../app/dynamic-render.mts";

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

/** The fake viewport every positioned element below is measured against. */
const VIEWPORT = { width: 1200, height: 800 };

type Fake = {
  className: string;
  display: string;
  /** How many client rects the element has. 0 means it takes up no space. */
  rects: number;
  /** Where the element sits relative to the viewport, for the failsafe sweep. */
  top: number;
  height: number;
  attrs: Record<string, string>;
  vars: Record<string, string>;
  classes: Set<string>;
  previousElementSibling: Fake | null;
  observed: boolean;
  unobserved: boolean;
};

function row(className: string, display = "block"): Fake {
  return {
    className,
    display,
    // An element that is `display: none` in its own right has no box. That is
    // the only way to lose one here; `inHiddenWrapper` models the other.
    rects: display === "none" ? 0 : 1,
    // On screen unless a test says otherwise, which is the common case and
    // the one the stagger tests care nothing about.
    top: 0,
    height: 20,
    attrs: {},
    vars: {},
    classes: new Set(className.split(" ").filter(Boolean)),
    previousElementSibling: null,
    observed: false,
    unobserved: false,
  };
}

/** Put an element below the fold, where the failsafe must leave it alone. */
function below(el: Fake): Fake {
  el.top = VIEWPORT.height + 200;
  return el;
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

  /**
   * A fake clock, not the real one.
   *
   * The script arms a timer on every scan. Left as the global `setTimeout`
   * that timer outlives the test, fires against a DOM that no longer has the
   * methods it needs, and node reports it as asynchronous activity after the
   * test ended - which is how this harness first met the failsafe. Capturing
   * the callback instead makes the sweep something a test can run on purpose.
   */
  const timers: { fn: () => void; ms: number }[] = [];
  /** Handlers the script registers on `document` or `window`, by event type. */
  const handlers: Record<string, (() => void)[]> = {};
  const listen = (type: string, fn: () => void) => {
    (handlers[type] ??= []).push(fn);
  };

  const doc = {
    documentElement: root,
    body: {},
    readyState: "complete",
    visibilityState: "visible",
    addEventListener: listen,
    querySelectorAll: () => els,
  };

  const sandbox = {
    document: doc,
    getComputedStyle: (el: Fake) => ({ display: el.display }),
    IntersectionObserver: class {
      observe(el: Fake) { el.observed = true; }
      unobserve(el: Fake) { el.unobserved = true; }
    },
    MutationObserver: class {
      observe() {}
    },
    requestAnimationFrame: () => 0,
    matchMedia: () => ({ matches: Boolean(opts.reducedMotion) }),
    setTimeout: (fn: () => void, ms: number) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearTimeout: () => {},
    // `window.addEventListener` for the scroll path. Shares the handler map
    // with `document`, which is safe here only because no event name is
    // registered on both.
    addEventListener: listen,
    innerWidth: VIEWPORT.width,
    innerHeight: VIEWPORT.height,
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
      /**
       * A boxless element reports a zero rect, which is what the browser does
       * and what the sweep's width/height test is looking for. Everything
       * else is placed at its own `top`, full viewport width.
       */
      getBoundingClientRect() {
        const e = this as unknown as Fake;
        if (!e.rects) return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
        return {
          top: e.top,
          bottom: e.top + e.height,
          left: 0,
          right: VIEWPORT.width,
          width: VIEWPORT.width,
          height: e.height,
        };
      },
    });
  }

  const keys = Object.keys(sandbox);
  new Function(...keys, MOTION_SCRIPT)(...keys.map((k) => sandbox[k]));

  return {
    indices: els.map((e) => e.vars["--ac-i"]),
    motion: root.attrs["data-motion"],
    /** Run every timer the script has armed, as the clock would. */
    runTimers() {
      const due = timers.splice(0);
      for (const t of due) t.fn();
      return due.map((t) => t.ms);
    },
    /** Fire a registered document event, as the browser would. */
    fire(type: string) {
      for (const fn of handlers[type] ?? []) fn();
    },
    timers,
    handlers,
  };
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
 * attribute is not set, so no from-state applies and the visitor sees the
 * finished page rather than an invisible one. On an AI visibility product that
 * is the property that matters most on the site.
 *
 * Note what these three do and do not establish. They are the *trigger* half:
 * `data-motion` stays off under reduced motion and with no IntersectionObserver.
 * The other half is that globals.css has no from-state outside
 * `html[data-motion="on"]` - and this comment used to assert it here, above
 * three tests that never read the stylesheet. That claim is now checked where
 * it can fail, in `src/app/motion-rest-state.test.mts`, which also covers the
 * case neither half sees: a content class resting invisible while the attribute
 * IS set and the observer has not delivered.
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

// ------------------------------------------------------------ the failsafe

/**
 * Danny's instruction on 20 Sep took `.ac-row` from `opacity: .55` to `.15`,
 * which is only defensible if nothing can sit in that state indefinitely.
 *
 * The observer in this harness never delivers - it records `observe()` and
 * calls nobody back - so every test below is already running in exactly the
 * failure the failsafe exists for: JavaScript ran, the attribute is set, and
 * `.in-view` never arrives on its own. That is the background tab, where
 * Chrome suspends rAF and IntersectionObserver delivery together.
 *
 * He asked for two proofs, and they are the two tests here: that it fires
 * when the observer does not, and that it does NOT reach below-fold rows,
 * because a blanket reveal plays every section nobody has scrolled to.
 */

test("the failsafe reveals on-screen rows when the observer never delivers", () => {
  const rows = [row("ac-row"), row("ac-row"), row("ac-row")];
  const run = stagger(rows);

  // Precondition, asserted rather than assumed: the observer has taken them
  // and given nothing back. Without this the test could pass on a harness
  // that revealed everything for some other reason.
  assert.ok(rows.every((r) => r.observed), "the script did not observe the rows");
  assert.deepEqual(
    rows.map((r) => r.classes.has("in-view")),
    [false, false, false],
    "something revealed these before the failsafe ran - the precondition is gone",
  );

  const fired = run.runTimers();
  assert.equal(fired.length, 1, `expected exactly one armed timer, got ${fired.length}`);

  assert.deepEqual(
    rows.map((r) => r.classes.has("in-view")),
    [true, true, true],
    "the failsafe did not reveal rows that are on screen, so at opacity .15 they stay invisible " +
      "for the life of the page",
  );

  // And it stops observing what it has revealed, like the observer's own path.
  assert.ok(rows.every((r) => r.unobserved), "the failsafe revealed without unobserving");
});

test("the failsafe leaves below-fold rows to their scroll trigger", () => {
  const onScreen = row("ac-row");
  const offScreen = below(row("ac-row"));
  const run = stagger([onScreen, offScreen]);

  run.runTimers();

  assert.equal(onScreen.classes.has("in-view"), true, "the on-screen row should have been revealed");
  assert.equal(
    offScreen.classes.has("in-view"),
    false,
    "the failsafe revealed a row below the fold. A blanket reveal plays every section nobody " +
      "has scrolled to, which is the scroll trigger defeating itself.",
  );
  assert.equal(offScreen.unobserved, false, "the below-fold row must keep its observer");
});

test("the failsafe skips the hidden half of a responsive pair", () => {
  // No box, so nobody is looking at it. Revealing it would be harmless to the
  // eye and wrong in the same way counting it as a stagger slot was wrong.
  const shown = row("ac-row");
  const hiddenTwin = row("ac-row", "none");
  const run = stagger([shown, hiddenTwin]);

  run.runTimers();

  assert.equal(shown.classes.has("in-view"), true);
  assert.equal(hiddenTwin.classes.has("in-view"), false, "a boxless element was swept in");
});

test("a visible tab re-arms the failsafe, which is the background-tab case", () => {
  const r = row("ac-row");
  const run = stagger([r]);

  // Spend the timer the initial scan armed, and leave the row unrevealed by
  // putting it off screen for that pass.
  r.top = VIEWPORT.height + 500;
  run.runTimers();
  assert.equal(r.classes.has("in-view"), false);

  // The visitor comes back to the tab, having scrolled - the row is on screen
  // now and the observer, suspended all along, still has not delivered.
  r.top = 0;
  run.fire("visibilitychange");
  assert.equal(run.timers.length, 1, "visibilitychange did not arm a sweep");
  run.runTimers();

  assert.equal(
    r.classes.has("in-view"),
    true,
    "returning to the tab did not clear a stuck row, which is the exact case the old .55 floor " +
      "was insurance against",
  );
});

test("the failsafe is armed once, not once per mutation", () => {
  /**
   * `/scan` mutates constantly during a live run. If every insertion re-armed
   * the timer, the page where a stuck row is least visible and longest lived
   * would postpone its own failsafe for as long as it kept mutating.
   */
  const r = row("ac-row");
  const run = stagger([r]);
  assert.equal(run.timers.length, 1, "the first scan should arm exactly one timer");

  // A second scan, as a client navigation or an insertion would cause. The
  // script refuses to stack a second timer while one is pending.
  run.fire("visibilitychange");
  assert.equal(
    run.timers.length,
    1,
    `a second arm stacked another timer (${run.timers.length} pending) - a mutating page can now ` +
      `slide its failsafe`,
  );

  // Once it has fired, the next one may arm again.
  run.runTimers();
  run.fire("visibilitychange");
  assert.equal(run.timers.length, 1, "after firing, the failsafe can no longer be re-armed");
});

test("scrolling to a below-fold row rescues it when the observer is dead", () => {
  /**
   * The case the timer and `visibilitychange` both miss, and the reason the
   * script listens for scroll at all.
   *
   * The one-shot sweep reveals what is on screen at 1.5s and correctly leaves
   * everything below the fold to its trigger. But if the OBSERVER is the
   * broken thing, that trigger never comes - so a row the visitor scrolls to
   * would sit at .15 for the life of the page. Danny's property is "nothing
   * may sit in a from-state once the page is visible and settled", and a row
   * somebody has just scrolled to is the plainest case of it.
   */
  const top = row("ac-row");
  const lower = below(row("ac-row"));
  const run = stagger([top, lower]);

  run.runTimers();
  assert.equal(top.classes.has("in-view"), true);
  assert.equal(lower.classes.has("in-view"), false, "the below-fold row should not have been swept");

  // The visitor scrolls. The row is on screen now; the observer still is not
  // delivering, because in this harness it never does.
  lower.top = 100;
  run.fire("scroll");
  assert.equal(run.timers.length, 1, "scroll did not arm a sweep");
  run.runTimers();

  assert.equal(
    lower.classes.has("in-view"),
    true,
    "a row scrolled into view stayed in its from-state. With the observer broken nothing else " +
      "will ever reveal it.",
  );
});

test("scrolling hard arms at most one sweep at a time", () => {
  const r = below(row("ac-row"));
  const run = stagger([r]);
  run.runTimers();

  for (let i = 0; i < 50; i++) run.fire("scroll");
  assert.equal(
    run.timers.length,
    1,
    `50 scroll events armed ${run.timers.length} sweeps - the arm-once guard is not holding, and ` +
      `a sweep is a querySelectorAll plus a rect per element`,
  );
});

test("reduced motion arms no failsafe, because there is nothing to fail", () => {
  // The whole system is off: no attribute, no from-state, nothing hidden.
  const run = stagger([row("ac-row")], { reducedMotion: true });
  assert.equal(run.timers.length, 0, "a settled page armed a sweep it does not need");
});

// ------------------------------------------ the cap, against the real pages

/**
 * The cap has two halves and only one of them was checked.
 *
 * The test above pins the mechanism: past eight, every row shares the last
 * beat. That is deliberate - an uncapped .09s puts the twentieth row of a
 * table 1.71s behind the first, and the boards stagger short groups. What
 * nothing checked is the half that decides whether the cap ever bites: how
 * long the groups on the shipped pages actually are.
 *
 * This is `f559df3` again, one system over. There a stagger ladder ran out of
 * rungs and flattened the tail of any list past the fifth, and `QUESTION_ROWS`
 * sat at exactly five - so the next row anybody added was the one that broke
 * it, silently, on a board with no visual witness. The homepage's largest
 * `.ac-row` group is eight against a cap that bites at ten. Two rows of
 * headroom, and the failure looks like nothing at all in the markup: the class
 * is right, the custom property is set, and two rows simply arrive together.
 *
 * So the group sizes are measured rather than remembered. Read off the
 * prerendered HTML, because sibling structure is a property of the rendered
 * document and no walk of `src/` can see it - the rows in one group come from
 * four different components.
 *
 * Counting every `.ac-row` child, including any hidden at some viewport, is
 * deliberate: a hidden twin only ever makes the script's `k` smaller, so the
 * group size is an upper bound on the index at any width. A page that passes
 * here cannot flatten at a width this did not think of.
 */

/** Read the cap out of the shipped script, so the two cannot drift apart. */
function capFromScript(): number {
  const found = /k>(\d+)\?\1:k/.exec(MOTION_SCRIPT);
  assert.ok(found, "the cap is no longer written as `k>N?N:k` - teach this test the new shape");
  return Number(found[1]);
}

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/**
 * How many `.ac-row` children sit directly inside each element of one page.
 *
 * A deliberately small parser rather than a dependency: it needs to know about
 * nesting, void elements and raw-text elements, and nothing else. Validated
 * against the cloud session's reading of the live homepage in Chrome on
 * 20 September 2026 - 13 groups, 49 rows - which this reproduces exactly.
 */
function acRowGroups(html: string): number[] {
  const stack: { tag: string; rows: number }[] = [{ tag: "#root", rows: 0 }];
  const sizes: number[] = [];
  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;

  let match: RegExpExecArray | null;
  while ((match = tag.exec(html)) !== null) {
    const [, closing, rawName, attrs, selfClosing] = match;
    const name = rawName.toLowerCase();

    if (closing) {
      // Unwind to the matching open tag. Anything left dangling above it is
      // closed too, so malformed nesting cannot strand a frame forever.
      const at = stack.map((f) => f.tag).lastIndexOf(name);
      if (at > 0) {
        for (let i = stack.length - 1; i >= at; i--) sizes.push(stack[i].rows);
        stack.length = at;
      }
      continue;
    }

    const cls = /\sclass\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
    const names = (cls ? (cls[2] ?? cls[3] ?? "") : "").split(/\s+/);
    if (names.includes("ac-row")) stack[stack.length - 1].rows += 1;

    if (VOID_ELEMENTS.has(name) || selfClosing) continue;
    // Skip the contents of raw-text elements, so markup inside a string is not
    // parsed as markup. The motion script itself is inlined in one of these.
    if (name === "script" || name === "style") {
      const end = html.indexOf(`</${name}`, tag.lastIndex);
      if (end !== -1) tag.lastIndex = end;
      continue;
    }
    stack.push({ tag: name, rows: 0 });
  }

  for (let i = stack.length - 1; i >= 0; i--) sizes.push(stack[i].rows);
  return sizes.filter((n) => n > 0);
}

/**
 * Every `.ac-row` that has an open `.ac-row` above it.
 *
 * A row inside a row takes the ancestor's `translateY(8px)` and its own, on
 * two different delays, and the two together read as mush rather than as a
 * beat. It is the one thing the coverage work keeps having to remember not to
 * do - "leaf content, not the wrapper" - and until now nothing checked it, so
 * the rule lived in a commit message and in whoever had read it last.
 *
 * Same walker shape as `acRowGroups`: unwind to the matching open tag on a
 * close, skip raw-text elements so the inlined script is not parsed as markup.
 */
function nestedRows(html: string): string[] {
  const stack: string[] = [];
  const rowDepths: number[] = [];
  const hits: string[] = [];
  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;

  let match: RegExpExecArray | null;
  while ((match = tag.exec(html)) !== null) {
    const [, closing, rawName, attrs, selfClosing] = match;
    const name = rawName.toLowerCase();

    if (closing) {
      const at = stack.lastIndexOf(name);
      if (at >= 0) {
        stack.length = at;
        while (rowDepths.length && rowDepths[rowDepths.length - 1] > stack.length) rowDepths.pop();
      }
      continue;
    }

    const cls = /\sclass\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
    const names = (cls ? (cls[2] ?? cls[3] ?? "") : "").split(/\s+/);
    const isRow = names.includes("ac-row");

    if (VOID_ELEMENTS.has(name) || selfClosing) {
      // A void element cannot contain anything, but it is still a nested row
      // if one is already open above it.
      if (isRow && rowDepths.length) hits.push(`<${name} class="${cls?.[2] ?? cls?.[3] ?? ""}">`);
      continue;
    }
    if (name === "script" || name === "style") {
      const end = html.indexOf(`</${name}`, tag.lastIndex);
      if (end !== -1) tag.lastIndex = end;
      continue;
    }

    stack.push(name);
    if (isRow) {
      if (rowDepths.length) hits.push(`<${name} class="${cls?.[2] ?? cls?.[3] ?? ""}">`);
      rowDepths.push(stack.length);
    }
  }
  return hits;
}

test("no shipped page has an .ac-row group long enough to flatten its tail", (t) => {
  if (!existsSync(PRERENDER)) {
    // Skipped rather than passed. `npm run build` is part of the push gate, so
    // this runs on every push; a clean checkout with no build should not fail,
    // but it must not quietly report success either.
    t.skip("no prerendered build to read - run `npm run build` first");
    return;
  }

  const cap = capFromScript();
  // Rows take k = 0 .. n-1 and the cap only bites once some k exceeds it, so a
  // group of cap+1 still gives every row its own beat and cap+2 is the first
  // that makes two share one.
  const limit = cap + 1;

  const groups = sweptPages().flatMap(({ page, html }) =>
    acRowGroups(html).map((rows) => ({ page, rows })),
  );
  assert.ok(groups.length, "no .ac-row in the build at all - the class or the markup has moved");

  groups.sort((a, b) => b.rows - a.rows);
  const biggest = groups[0]!;

  t.diagnostic(
    `${groups.length} .ac-row groups over ${groups.reduce((n, g) => n + g.rows, 0)} rows; ` +
      `largest ${biggest.rows} (${biggest.page}), cap ${cap} bites at ${limit + 1}, ` +
      `${limit - biggest.rows} row(s) of headroom`,
  );

  assert.ok(
    biggest.rows <= limit,
    `${biggest.page} has an .ac-row group of ${biggest.rows}. Past ${limit} the cap at ${cap} ` +
      `gives the tail one shared beat, which reads as correct in the markup and arrives wrong. ` +
      `Either split the group or give the stagger a budget it divides across the rows.`,
  );
});

test("the nesting probe fires on a row inside a row, and only then", () => {
  // Proved before it is trusted. A sweep that passes because it cannot see
  // anything is the failure this repo has already found twice in its own
  // tripwires, so the narrowing is asserted rather than assumed.
  assert.equal(nestedRows('<div class="ac-row"><p class="ac-row">x</p></div>').length, 1, "missed a nested row");
  assert.equal(
    nestedRows('<div class="ac-row"><span><em class="ac-row">x</em></span></div>').length,
    1,
    "missed a nested row two levels down",
  );
  assert.equal(nestedRows('<div class="ac-row">a</div><div class="ac-row">b</div>').length, 0, "siblings are not nested");
  assert.equal(
    nestedRows('<div class="ac-row"><p>x</p></div><div class="ac-row">y</div>').length,
    0,
    "a row after a closed row is not nested - the depth must unwind on the close tag",
  );
  assert.equal(
    nestedRows('<div class="ac-rows"><p class="ac-row">x</p></div>').length,
    0,
    "ac-rows is a different class and must not open a frame",
  );
});

test("no .ac-row on any shipped page sits inside another", (t) => {
  if (!existsSync(PRERENDER)) {
    t.skip("no prerendered build to read - run `npm run build` first");
    return;
  }

  const pages = sweptPages();
  const offenders = pages.flatMap(({ page, html }) => nestedRows(html).map((el) => `${page}  ${el}`));

  t.diagnostic(`${pages.length} pages checked for rows inside rows; ${offenders.length} found`);

  assert.deepEqual(
    offenders,
    [],
    `A row inside a row takes both transforms on two delays and reads as mush rather than as a beat. ` +
      `Put the class on the leaf content and take it off the wrapper around it:\n${offenders.join("\n")}`,
  );
});
