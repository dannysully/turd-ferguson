import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { ENGINE_SPECS, FREE_ENGINES } from "../lib/scan/engines.ts";
import { FREE_ENGINE_COUNT, FREE_ENGINE_LABELS, listOf, namedOf, pickEngines } from "./scan-shape.ts";
import { WORKED_QUESTIONS, overviewLabel, workedQuestion } from "./worked-example.ts";

/**
 * The homepage's worked example, executed.
 *
 * These two files exist because the same example was typed into two panels and
 * three of its four shared rows disagreed - one page answering one question two
 * ways, under a heading selling "the engines disagree about you and here is the
 * count". Naming it once fixed that. What nothing did was run it.
 *
 * The risk that remains is this repo's named defect species: **a ladder with a
 * ceiling.** A row names its engines by *position* in `FREE_ENGINES`, which is
 * exactly what stops a typed engine name drifting - and exactly what a
 * shortened engine set silently invalidates. `pickEngines` drops a position
 * past the end deliberately, so the example says less rather than something
 * untrue; the cost is that `q.engines.length` and `pickEngines(q.engines)
 * .length` stop agreeing, and the panels drew their colour off one while
 * printing the other.
 *
 * So the load-bearing assertion here is not that the data is right today. It is
 * that every position resolves, and that a state and the text beside it are
 * counted the same way.
 */

const EXPLORER = readFileSync(new URL("../components/home/AnswerExplorer.tsx", import.meta.url), "utf8");
const JOURNEY = readFileSync(new URL("../components/home/TierJourney.tsx", import.meta.url), "utf8");

/**
 * Comments out, before any probe reads the source.
 *
 * Both panels carry long comments *about* the defect being checked for - the
 * one below is named in prose three times in AnswerExplorer alone - so a probe
 * that greps the file raw fires on the explanation of the fix. That is
 * `isComment` in copy.test.mts all over again, and it caught this file on its
 * first run.
 *
 * A line comment is only stripped where it starts the line, so a `//` inside a
 * URL in copy survives. Block comments go wherever they are, which covers the
 * JSX `{/* ... *\/}` form.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

test("every pick resolves to a real engine", () => {
  assert.ok(WORKED_QUESTIONS.length > 0, "there are no worked questions at all");
  for (const q of WORKED_QUESTIONS) {
    assert.equal(
      pickEngines(q.engines).length,
      q.engines.length,
      `${q.id} names position(s) past the end of a ${FREE_ENGINE_COUNT}-engine free set, ` +
        `so its count and its state would disagree: ${JSON.stringify(q.engines)}`,
    );
    for (const i of q.engines) {
      assert.ok(Number.isInteger(i) && i >= 0, `${q.id} has a pick that is not a position: ${i}`);
    }
  }
});

test("no row names the same engine twice", () => {
  for (const q of WORKED_QUESTIONS) {
    assert.equal(
      new Set(q.engines).size,
      q.engines.length,
      `${q.id} repeats a position, so "${namedOf(q.engines)}" counts one engine twice`,
    );
  }
});

test("the count a row prints is the number of engines it actually names", () => {
  for (const q of WORKED_QUESTIONS) {
    const labels = pickEngines(q.engines);
    assert.equal(namedOf(q.engines), `${labels.length} of ${FREE_ENGINE_COUNT}`);
    // And never more named than exist, which is the sentence a reader checks.
    assert.ok(labels.length <= FREE_ENGINE_COUNT, `${q.id} names more engines than a scan reads`);
    for (const l of labels) assert.ok(FREE_ENGINE_LABELS.includes(l), `${q.id} names "${l}", not a free engine`);
  }
});

/**
 * The Overview column is derived from `engines` and only falls back to
 * `overviewShown`, so the two cannot contradict. Asserted as the property
 * rather than as five expected strings, which would be a second copy of the
 * data to keep in step.
 */
test("the Overview column never contradicts the engine list", () => {
  const aio = FREE_ENGINES.indexOf("google_aio");
  assert.ok(aio >= 0, "google_aio is not in the free set, so this column has no source");

  for (const q of WORKED_QUESTIONS) {
    const named = q.engines.includes(aio);
    const label = overviewLabel(q);
    if (named) {
      assert.equal(label, "mentioned", `${q.id} lists the Overview as naming the brand but reads "${label}"`);
    } else {
      assert.notEqual(label, "mentioned", `${q.id} says the Overview mentioned the brand and does not list it`);
      assert.equal(label, q.overviewShown ? "shown, absent" : "none shown");
    }
  }

  // The label is the engine list's, not the flag's: a row whose flag says the
  // Overview never showed still reads "mentioned" when it is in the list.
  assert.equal(overviewLabel({ id: "xero", text: "x", engines: [aio], overviewShown: false }), "mentioned");
});

test("an unregistered question id fails the build rather than rendering half-built", () => {
  assert.throws(
    () => workedQuestion("not-a-question" as never),
    /no worked-example question registered/,
    "an unknown id returned something instead of throwing",
  );
  for (const q of WORKED_QUESTIONS) assert.equal(workedQuestion(q.id), q);
});

test("every registered question is on the page, and every id the page asks for is registered", () => {
  // [a-z0-9-], not [a-z-]: `crm-b2b` carries a digit, and without it this
  // matched "crm-b" and reported the one id that is on both panels as missing.
  const rendered = new Set(
    [...code(EXPLORER).matchAll(/"([a-z0-9-]+)"/g), ...code(JOURNEY).matchAll(/"([a-z0-9-]+)"/g)].map(
      (m) => m[1],
    ),
  );
  const ids = WORKED_QUESTIONS.map((q) => q.id);
  const unused = ids.filter((id) => !rendered.has(id));
  assert.deepEqual(unused, [], "a worked question is registered and shown by neither panel");
});

/**
 * The defect this file was written to stop, stated as a rule the panels must
 * keep: the colour and the words beside it are counted the same way. Both drew
 * their state off the raw pick count while printing the filtered one, so a
 * shortened engine set would have rendered the amber "named" pill against
 * "0 of 3".
 */
test("neither panel takes a state off the unfiltered pick count", () => {
  for (const [name, src] of [["AnswerExplorer", EXPLORER], ["TierJourney", JOURNEY]] as const) {
    assert.equal(
      /\.engines\.length/.test(code(src)),
      false,
      `${name} reads .engines.length directly; count it through pickEngines so the state ` +
        "and the text beside it cannot disagree",
    );
  }
});

test("listOf and pickEngines are what the sentences are made of", () => {
  assert.equal(listOf([]), "");
  assert.equal(listOf(["a"]), "a");
  assert.equal(listOf(["a", "b"]), "a and b");
  assert.equal(listOf(["a", "b", "c"]), "a, b and c");

  // A position past the end drops out rather than printing "undefined".
  assert.deepEqual(pickEngines([FREE_ENGINE_COUNT, FREE_ENGINE_COUNT + 9]), []);
  assert.deepEqual(pickEngines([-1]), []);
  assert.deepEqual(pickEngines([0]), [ENGINE_SPECS[FREE_ENGINES[0]].label]);
  assert.equal(namedOf([FREE_ENGINE_COUNT]), `0 of ${FREE_ENGINE_COUNT}`);
});

/**
 * Placeholder brands stay placeholders - a worked example on a marketing site
 * must not read as a measurement of a real company. The bracketed form is the
 * marker, so the rule is that a question naming a competitor names it bracketed.
 */
test("the only brand named in a question is a placeholder", () => {
  const real = [...FREE_ENGINES.map((e) => ENGINE_SPECS[e].label), "Shopify", "HubSpot", "Salesforce", "Ahrefs"];
  for (const q of WORKED_QUESTIONS) {
    const bare = q.text.replace(/\[[^\]]*\]/g, "");
    for (const name of real) {
      assert.equal(
        bare.toLowerCase().includes(name.toLowerCase()),
        false,
        `${q.id} names ${name} outside brackets, so the example reads as a measurement`,
      );
    }
    assert.equal(q.text, q.text.toLowerCase().replace(/\[competitor a\]/, "[Competitor A]"),
      `${q.id} is not in the lower-case form the other questions use`);
  }
});
