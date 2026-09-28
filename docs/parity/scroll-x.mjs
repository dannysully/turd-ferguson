// Can the page actually be scrolled sideways? node docs/parity/scroll-x.mjs <url> [width]
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(path.join(os.homedir(), "code/.parity/package.json"));
const { chromium } = require("playwright");
const width = Number(process.argv[3] ?? 390);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto(process.argv[2], { waitUntil: "load" });
await page.waitForTimeout(1500);
const r = await page.evaluate((process_strip) => {
  if (process_strip) document.querySelectorAll(process.argv_sel).forEach((e) => e.remove());
  window.scrollTo(500, 0);
  return {
    scrollX: window.scrollX,
    html: getComputedStyle(document.documentElement).overflowX,
    body: getComputedStyle(document.body).overflowX,
  };
}, process.argv[4] === "strip");
console.log(JSON.stringify(r));
await browser.close();
