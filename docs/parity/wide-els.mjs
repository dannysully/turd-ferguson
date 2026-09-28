// Which elements stick out past the viewport. node docs/parity/wide-els.mjs <url> [width]
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
const hits = await page.evaluate((w) => {
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.right > w + 1 && r.width > 0) {
      let p = el.parentElement, clipped = false;
      while (p) { const o = getComputedStyle(p).overflowX; if (o !== "visible") { clipped = true; break; } p = p.parentElement; }
      if (!clipped) out.push((clipped ? "[in clip] " : "") +`${el.tagName.toLowerCase()}.${el.className?.baseVal ?? el.className} right=${Math.round(r.right)} ${(el.textContent || "").trim().slice(0, 40)}`);
    }
  }
  return out.filter((l) => !l.startsWith("[in clip]")).slice(0, 25);
}, width);
console.log(hits.join("\n"));
await browser.close();
