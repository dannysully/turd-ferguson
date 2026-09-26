import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * /llms.txt is a second hand-kept list of the site's pages, beside the
 * sitemap's - the species this tree keeps catching: two copies of one fact.
 * So it is held to the sitemap both ways, and each entry is held to reading
 * the metadata of its own route, so no line can carry a description the page
 * does not. Added 26 Sep 2026 with the route (R21).
 */
const HERE = fileURLToPath(import.meta.url);
const APP = join(HERE, "..");
const PAGES = readFileSync(join(APP, "llms.txt", "pages.ts"), "utf8");
const SITEMAP = readFileSync(join(APP, "sitemap.ts"), "utf8");

const sitemapPaths = [...SITEMAP.matchAll(/^\s*\["([^"]*)", "\d{4}-\d{2}-\d{2}"/gm)].map((m) => m[1]);
const imports = new Map(
  [...PAGES.matchAll(/^import \{ metadata as (\w+) \} from "@\/app(\/[^"]*)?\/page";$/gm)].map((m) => [m[1], m[2] ?? ""]),
);
const entries = [...PAGES.matchAll(/\{ path: "([^"]*)", meta: (\w+) \}/g)].map((m) => ({ path: m[1], meta: m[2] }));

test("the walks found the lists, so an empty comparison cannot pass", () => {
  assert.ok(sitemapPaths.length >= 21, `read only ${sitemapPaths.length} sitemap entries`);
  assert.ok(entries.length >= 21, `read only ${entries.length} llms.txt entries`);
});

test("llms.txt lists exactly the pages the sitemap offers", () => {
  assert.deepEqual([...entries.map((e) => e.path)].sort(), [...sitemapPaths].sort());
});

test("every llms.txt line reads the metadata of its own route", () => {
  const wrong = entries.filter((e) => imports.get(e.meta) !== e.path).map((e) => `${e.path} <- ${e.meta} (${imports.get(e.meta)})`);
  assert.deepEqual(wrong, []);
});
