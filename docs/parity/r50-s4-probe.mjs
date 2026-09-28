// R50 section 4: drive the tile selectors and record what each state reads.
// node docs/parity/r50-s4-probe.mjs <baseUrl> <outDir>
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(path.join(os.homedir(), "code/.parity/package.json"));
const { chromium } = require("playwright");
const base = process.argv[2] ?? "http://localhost:3000";
const out = path.resolve(process.argv[3] ?? "docs/parity/R50-s4");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const log = [];
for (const width of [1280, 390]) {
  for (const route of ["/alwaysmentioned", "/"]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    // "load", not "networkidle": live, Turnstile keeps a connection open.
    await page.goto(base + route, { waitUntil: "load" });
    await page.locator("#sp-mentioned").waitFor({ state: "attached", timeout: 20000 });
    const tag = `${route === "/" ? "home" : route.slice(1)}-${width}`;
    const sel = page.locator("#sp-mentioned");
    await sel.scrollIntoViewIfNeeded();
    const priceOf = () => sel.evaluate((el) => el.closest("div").parentElement.querySelector("[aria-live]").textContent);
    log.push([tag, "idle", await priceOf()]);
    await page.screenshot({ path: `${out}/${tag}-idle.png`, fullPage: route !== "/" });
    await sel.selectOption("finance");
    log.push([tag, "finance x1", await priceOf()]);
    const more = page.locator('button[aria-label="One more cluster"]').first();
    await more.click(); await more.click();
    log.push([tag, "finance x3", await priceOf()]);
    await page.locator('button[aria-pressed]', { hasText: "UK" }).first().click();
    log.push([tag, "finance x3 uk", await priceOf()]);
    await page.screenshot({ path: `${out}/${tag}-uk3.png`, fullPage: route !== "/" });
    for (let i = 0; i < 8; i++) await more.click();
    log.push([tag, "11+ uk", await priceOf()]);
    await sel.selectOption("other");
    log.push([tag, "other", await priceOf()]);
    await page.close();
  }
}
await browser.close();
for (const l of log) console.log(l.join(" | "));
