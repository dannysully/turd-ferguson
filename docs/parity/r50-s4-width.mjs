// R50 section 4: page scroll width at 390 on every page that draws a price tile.
// node docs/parity/r50-s4-width.mjs <baseUrl>
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(path.join(os.homedir(), "code/.parity/package.json"));
const { chromium } = require("playwright");
const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
for (const route of ["/", "/alwaystracked", "/alwaysmentioned", "/alwayscited", "/alwayseverywhere"]) {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.goto(base + route, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(route, w, w > 390 ? "OVERFLOW" : "ok");
  await page.close();
}
await browser.close();
