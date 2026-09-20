import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
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

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..");
const PRERENDER = join(ROOT, ".next", "server", "app");

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

function prerenderedPages(): { page: string; html: string }[] {
  const out: { page: string; html: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) {
        out.push({ page: relative(PRERENDER, full).split(sep).join("/"), html: readFileSync(full, "utf8") });
      }
    }
  };
  walk(PRERENDER);
  return out;
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

  const groups = prerenderedPages().flatMap(({ page, html }) =>
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
