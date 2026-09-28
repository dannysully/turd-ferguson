// R54: the walkthrough form's three options, "Book a call" selected, at 1280 and 390.
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(path.join(os.homedir(), "code/.parity/package.json"));
const { chromium } = require("playwright");

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "docs/parity/R54-local";
const browser = await chromium.launch();
// JS off: the form renders nothing and the card's own "Book a call" link stands in.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + "/alwaystracked");
  const card = page.locator(".see-first");
  console.log("js-off radios:", await card.locator('[role="radio"]').count(), "links:", await card.locator('a[href="/contact"]').allInnerTexts());
  await card.screenshot({ path: `${out}-390-jsoff.png` });
  await ctx.close();
}
for (const width of [1280, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: width === 390 ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  await page.goto(base + "/alwaystracked", { waitUntil: "networkidle" });
  const card = page.locator(".see-first");
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const radios = card.locator('[role="radio"]');
  console.log(width, "options:", await radios.allInnerTexts());
  await card.screenshot({ path: `${out}-${width}-video.png` });
  await card.getByRole("radio", { name: "Book a call" }).click();
  const link = card.locator('a.btn-primary');
  console.log(width, "call link:", await link.getAttribute("href"), "email field:", await card.locator("#wt-email").count());
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  console.log(width, "scrollWidth/innerWidth:", sw);
  await card.screenshot({ path: `${out}-${width}-call.png` });
  await page.close();
}
await browser.close();
