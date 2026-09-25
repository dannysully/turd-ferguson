import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { blankComments } from "../../lib/source-read.mts";

/**
 * QF1, Danny, 25 September 2026: nothing on the scan result may name or imply
 * a marketplace or a price, and no tier name sits inside a link.
 *
 * The difficulty score is derived from what a link marketplace lists a site
 * at (placement-difficulty.ts). That derivation is ours and stays; the words
 * behind it - the marketplace, the price band - do not reach the visitor. The
 * one-line `difficulty_basis` is where they lived, and it was printed under
 * every placement row and returned by /api/scan/[token]/full. It is still
 * stored on the row; this asserts it goes no further.
 */

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const read = (rel: string) => blankComments(readFileSync(join(ROOT, rel), "utf8"));

/** The files that paint or serve the result. */
const RESULT_SURFACES = ["src/components/scan/ResultView.tsx", "src/lib/scan/unlock.ts", "src/lib/scan/contract.ts"];
const PAYLOAD_ROUTE = "src/app/api/scan/[token]/full/route.ts";

test("no result surface or payload names a marketplace, a listing or a price beside a placement", () => {
  for (const file of [...RESULT_SURFACES, PAYLOAD_ROUTE]) {
    const src = read(file);
    assert.ok(src.length > 200, `${file} read as nearly empty - the sweep is not looking at it`);
    assert.doesNotMatch(src, /marketplace/i, `${file} says "marketplace" outside a comment`);
    assert.doesNotMatch(src, /listed on/i, `${file} says "listed on" outside a comment`);
    assert.doesNotMatch(src, /["'`][^"'`\n]*\$\s?\d/, `${file} writes a dollar figure in a string`);
  }
});

test("the difficulty basis stays on the server", () => {
  for (const file of [...RESULT_SURFACES, PAYLOAD_ROUTE]) {
    assert.doesNotMatch(read(file), /difficulty_basis|NOT_LISTED_BASIS/, `${file} carries the difficulty basis again`);
  }
  // The rule is not guarding nothing: the basis is still made and stored.
  assert.match(read("src/lib/scan/difficulty.ts"), /difficulty_basis/, "difficulty.ts no longer stores the basis - if that was deliberate, this rule's premise moved");
});

/**
 * Every <TierName>/<TierText> rendered inside an <a> or <Link>.
 *
 * One is allowed: the logo. The header's home link is the alwayscited lockup
 * itself - the brand mark, which every board draws as the link home - not the
 * tier used as a link label. Everything else puts the lockup in the sentence
 * and gives the link plain words.
 */
const LOGO = new Set(["src/components/Header.tsx"]);

function tierInLink(): { sites: string[]; files: number; tierUses: number } {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(join(ROOT, d))) {
      const rel = `${d}/${e}`;
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
      else if (rel.endsWith(".tsx")) files.push(rel);
    }
  };
  walk("src");
  const sites: string[] = [];
  let tierUses = 0;
  for (const f of files) {
    const src = read(f);
    let depth = 0;
    for (const m of src.matchAll(/<(\/?)(a|Link|TierName|TierText)\b[^>]*?(\/?)>/g)) {
      const [, close, tag, self] = m;
      if (tag === "a" || tag === "Link") {
        if (close) depth = Math.max(0, depth - 1);
        else if (!self) depth++;
      } else if (!close) {
        tierUses++;
        if (depth > 0) sites.push(`${f}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
  }
  return { sites, files: files.length, tierUses };
}

test("no tier name sits inside a link, bar the logo", () => {
  const { sites, files, tierUses } = tierInLink();
  // Floors: 25 Sep 2026 the walk read 95+ .tsx files and 60+ tier lockups.
  assert.ok(files >= 60, `only ${files} .tsx files walked - the sweep has gone blind`);
  assert.ok(tierUses >= 30, `only ${tierUses} TierName/TierText uses found - the tag match has broken`);
  const logo = sites.filter((s) => LOGO.has(s.split(":")[0]!));
  assert.equal(logo.length, 1, "the header logo is the one allowed lockup in a link, and the sweep should still see it");
  assert.deepEqual(sites.filter((s) => !LOGO.has(s.split(":")[0]!)), []);
});

/**
 * R16/R17, 25 September 2026. The classifier's note is database text, so the
 * sweep above cannot see what it says - "Marketplace/directory listing..."
 * reached the live table. Every note that leaves the server goes through
 * `publicNote` (opportunities.ts, tested there); this pins that no builder
 * reads a raw note past it, and that the result paints notes in exactly the
 * two places that read those filtered rows.
 */
test("every note that reaches the result has been through publicNote", () => {
  const opp = read("src/lib/scan/opportunities.ts");
  const unlock = read("src/lib/scan/unlock.ts");
  assert.match(opp, /note: publicNote\(classified\?\.note\)/, "deriveOpportunities no longer filters the note");
  assert.match(unlock, /note: publicNote\(kindOf\.get\(c\.source_domain\)\?\.note\)/, "the sources list no longer filters the note");
  for (const [file, src] of [["opportunities.ts", opp], ["unlock.ts", unlock]] as const) {
    assert.doesNotMatch(src, /note: [^\n]*\?\.note \?\? null/, `${file} copies a raw classifier note`);
  }
  const paints = read("src/components/scan/ResultView.tsx").match(/\bo\.note\b/g) ?? [];
  // Two sites, each reading o.note twice (the guard and the text): PlanCards and PlacementTable.
  assert.equal(paints.length, 4, "ResultView paints a note somewhere new - check it reads a filtered row");
});
