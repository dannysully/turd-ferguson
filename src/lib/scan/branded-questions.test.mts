import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { brandedQuestions, withoutBrand } from "./brand-name.ts";

/**
 * The scan's generator is told not to name the brand; since 30 Sep 2026 that
 * is enforced. A branded question always names the brand, and it is what
 * would be copied into tracking as a branded prompt. Tallyroo is made up.
 */

const qs = [
  { kind: "category", question: "best invoicing software for freelancers" },
  { kind: "positioning", question: "what does tallyroo do for freelancers" },
  { kind: "comparison", question: "is tallyroo.com better than the rest" },
];

test("branded questions are found by brand and by domain, and dropped", () => {
  assert.deepEqual(brandedQuestions(qs, "Tallyroo", "tallyroo.com").map((q) => q.kind), ["positioning", "comparison"]);
  assert.deepEqual(withoutBrand(qs, "Tallyroo", "tallyroo.com").map((q) => q.kind), ["category"]);
  assert.deepEqual(withoutBrand([qs[0]!], "Tallyroo", "tallyroo.com"), [qs[0]], "a clean set is untouched");
});

test("census: generateQuestions asks again once for a branded set, then drops what is left; both callers pass the domain", () => {
  const src = readFileSync(new URL("./anthropic.ts", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("export async function generateQuestions("), src.indexOf("\n}\n", src.indexOf("export async function generateQuestions(")));
  assert.match(body, /if \(brandedQuestions\(questions, input\.brand, input\.domain\)\.length\) \{\n\s+const again = shape\(await ask\(\)\);/);
  assert.match(body, /questions = withoutBrand\(questions, input\.brand, input\.domain\);/);
  assert.match(readFileSync(new URL("./pipeline.ts", import.meta.url), "utf8"), /brand,\n\s+domain: scan\.domain,/);
  assert.match(readFileSync(new URL("../../app/api/scan/[token]/questions/route.ts", import.meta.url), "utf8"), /brand: scan\.brand_name \?\? scan\.domain,\n\s+domain: scan\.domain,/);
});

test("probe: the matcher the census relies on fires on an injected branded question", () => {
  assert.equal(brandedQuestions([{ question: "Tallyroo pricing" }], "Tallyroo").length, 1);
  assert.equal(withoutBrand([{ question: "Tallyroo pricing" }], "Tallyroo").length, 0);
});
