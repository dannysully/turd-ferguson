import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { COVERAGE_LIMITS, SCAN_LIMITS, WAITLIST_LIMITS } from "./contact.ts";

/**
 * Every `<input>` in the tree, and whether anything bounds what can be typed
 * into it.
 *
 * `scan-form.test.mts` is the same question asked of a denominator one form
 * wide: `<form action="/scan" method="get">`. It is correct about all five of
 * those and could not see any of these, which is the defect this queue keeps
 * naming arriving for the sixth time. Widening the denominator from "the /scan
 * GET forms" to "every input" found six unbounded fields in three files:
 *
 *   - four on `CoverageForm`, the form that spends money, whose route had its
 *     own table of limits typed inline - the fourth table `contact.ts` predicted
 *     in as many words;
 *   - the category field on `ConfirmScreen`, which is where a question is
 *     edited before it is billed, while its own question rows one screen down
 *     were bounded;
 *   - the email field on `ScanFlow`, while the same field on `RequestScanForm`
 *     was bounded.
 *
 * None of the six was a hole: every route already refused an over-length value.
 * What each one was is a refusal the visitor cannot act on, because `text()`
 * and its callers return the same message for too-short and too-long, and the
 * message describes the short case. The bound on the input is what makes that
 * branch unreachable from the form.
 *
 * The count is asserted, not the files. A census that silently narrows reads
 * exactly like a clean sweep - see the four blind tests in the queue.
 */

const SRC = new URL("..", import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const SOURCES = walk(SRC).filter((f) => /\.tsx$/.test(f));

type Field = { file: string; line: number; tag: string; id: string };

/**
 * Every `<input>` tag in the tree.
 *
 * Scanned brace-aware rather than with `/<input[^>]*>/`, because a JSX prop can
 * hold a `>` inside an expression - `onChange={(e) => ...}` is on most of these
 * inputs - and a regex that stops at the first `>` truncates the tag before its
 * maxLength, reading a bounded field as an unbounded one.
 */
function inputs(): Field[] {
  const out: Field[] = [];
  for (const file of SOURCES) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/<input\b/g)) {
      const start = m.index;
      let depth = 0;
      let end = -1;
      for (let i = start; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") depth--;
        else if (text[i] === ">" && depth === 0) {
          end = i + 1;
          break;
        }
      }
      assert.notEqual(end, -1, `${file}: an <input> with no closing bracket`);
      const tag = text.slice(start, end);
      out.push({
        file: file.slice(SRC.length),
        line: text.slice(0, start).split("\n").length,
        tag,
        id: tag.match(/id="([^"]+)"/)?.[1] ?? tag.match(/id=\{`([^`]+)`\}/)?.[1] ?? "",
      });
    }
  }
  return out;
}

/**
 * The two inputs that are deliberately unbounded, each with the thing that
 * bounds it instead. Earned in the test rather than assumed: the check below
 * fails if one of these stops being unbounded, so the list cannot quietly grow
 * into a blanket pass.
 */
const EXEMPT: Record<string, string> = {
  "c-website": [
    "the contact honeypot. A bot does not honour maxLength, so a bound here buys",
    "nothing, and a real visitor never reaches the field - it is tabIndex={-1}.",
    "What protects the log is the server: contact/actions.ts slices it to",
    "CONTACT_LIMITS.website before writing it.",
  ].join(" "),
  "cc-coverage": [
    "type=file, which maxLength does not apply to at all. It is bounded by bytes",
    "in onFile against MAX_COVERAGE_BYTES, and again by the route before it",
    "parses.",
  ].join(" "),
};

test("the census still sees every input - a shrinking count is a blind probe", () => {
  const found = inputs();
  const files = new Set(found.map((f) => f.file));
  assert.ok(
    found.length >= 21,
    `only ${found.length} inputs were found across the tree, and there were 21 when this was written - a falling count means the scanner broke, not that fields were deleted`,
  );
  assert.ok(files.size >= 11, `only ${files.size} files carry an input, and 11 did`);
});

test("every input is bounded, or is on the exemption list with its reason", () => {
  const unbounded = inputs()
    .filter((f) => !/maxLength=/.test(f.tag))
    .filter((f) => !(f.id in EXEMPT))
    .map((f) => `${f.file}:${f.line} ${f.id || "(no id)"}`);
  assert.deepEqual(
    unbounded,
    [],
    "these accept unbounded typed input. Bound them from a constant in config/contact.ts, or add an id to EXEMPT with what bounds it instead",
  );
});

test("no exemption is stale - each one is still an input, and still unbounded", () => {
  const found = inputs();
  for (const [id, reason] of Object.entries(EXEMPT)) {
    const field = found.find((f) => f.id === id);
    assert.ok(field, `EXEMPT lists "${id}", which is no longer an input in the tree - drop it`);
    assert.ok(
      !/maxLength=/.test(field.tag),
      `EXEMPT lists "${id}" as deliberately unbounded, but it now carries a maxLength - drop it from the list`,
    );
    assert.ok(reason.length > 40, `EXEMPT["${id}"] needs a reason, not a placeholder`);
  }
});

/**
 * A typed `maxLength={120}` passes the check above while being exactly the
 * defect it exists to catch: `ConfirmScreen`'s question rows carried
 * `maxLength={200}`, which matched the confirm route's own 200 by coincidence
 * and would not have followed it anywhere.
 */
test("every bound is read from a constant, never typed as a number", () => {
  const typed = inputs()
    .filter((f) => /maxLength=\{\s*\d/.test(f.tag))
    .map((f) => `${f.file}:${f.line} ${f.id || "(no id)"}`);
  assert.deepEqual(typed, [], "these type a bound as a literal instead of reading one from config");
});

/**
 * The other half of the same rule, on the side the input cannot see. A bound on
 * the field and a different number in the route is the disagreement the field
 * bound was added to prevent, so the routes are read for a typed comparison the
 * same way the inputs are.
 */
const ROUTES = walk(new URL("../app/api", import.meta.url).pathname).filter((f) => /route\.ts$/.test(f));

test("the routes behind these fields compare against the same constants", () => {
  const checks: { route: string; typed: RegExp; constant: string }[] = [
    { route: "coverage-check/route.ts", typed: /text\(body\.\w+,\s*\d/, constant: "COVERAGE_LIMITS" },
    { route: "confirm/route.ts", typed: /topic\.length > \d|question\.length > \d/, constant: "SCAN_LIMITS" },
    { route: "questions/route.ts", typed: /topic\.length > \d/, constant: "SCAN_LIMITS" },
  ];
  for (const { route, typed, constant } of checks) {
    const file = ROUTES.find((f) => f.endsWith(route));
    assert.ok(file, `${route} was not found - this check has gone blind`);
    const text = readFileSync(file, "utf8");
    assert.ok(
      text.includes(constant),
      `${route} bounds a field the form also bounds, but does not read ${constant}`,
    );
    assert.ok(!typed.test(text), `${route} still compares a length against a typed number`);
  }
});

/**
 * Asserted as values so the checks above cannot pass over a table that has
 * drifted. 253 is the longest a DNS name may be; 254 the longest an address may
 * be over SMTP; 120 and 200 are what the scan routes have always enforced.
 */
test("the bounds are the numbers the servers actually enforce", () => {
  assert.equal(WAITLIST_LIMITS.domain, 253);
  assert.equal(SCAN_LIMITS.topic, 120);
  assert.equal(SCAN_LIMITS.question, 200);
  assert.equal(SCAN_LIMITS.email, 254);
  assert.deepEqual(COVERAGE_LIMITS.brand, { min: 2, max: 80 });
  assert.deepEqual(COVERAGE_LIMITS.topic, { min: 2, max: 120 });
  assert.deepEqual(COVERAGE_LIMITS.segment, { min: 2, max: 80 });
});

/**
 * `TopicScreen` posts to the waitlist action, not to a scan route, so its topic
 * bound is the waitlist's 200 and not SCAN_LIMITS.topic. The two are different
 * numbers for different servers and look like a drift that wants tidying; this
 * holds the negative so the next run does not "fix" them into agreement.
 */
test("the waitlist topic bound is not the scan one, deliberately", () => {
  assert.notEqual(WAITLIST_LIMITS.topic, SCAN_LIMITS.topic);
  const screens = readFileSync(join(SRC, "components/scan/screens.tsx"), "utf8");
  assert.ok(
    screens.includes("maxLength={WAITLIST_LIMITS.topic}"),
    "TopicScreen's topic field should read WAITLIST_LIMITS.topic - it posts to the waitlist action",
  );
});
