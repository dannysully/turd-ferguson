// R49: the static "buyer questions" line steps aside while the homepage field
// is busy. node docs/parity/check-r49.mjs --url http://localhost:3000
// /api/scan/start is intercepted in the browser (held 4s, then 400 or 200), so
// no request reaches the route and no scan runs. The 200 case aborts the
// navigation to /scan/<token>.
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const require = createRequire(path.join(os.homedir(), "code/.parity/package.json"));
const { chromium } = require("playwright");
const base = process.argv[process.argv.indexOf("--url") + 1] ?? "http://localhost:3000";
const out = path.resolve(process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "docs/parity/R49");
const jsOff = process.argv.includes("--js-off");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const route of ["/", "/scan"]) {
  for (const width of [1280, 390]) {
    for (const reduced of [false, true]) {
      for (const outcome of jsOff ? ["idle"] : ["error", "ok"]) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? "reduce" : "no-preference", javaScriptEnabled: !jsOff });
        const page = await ctx.newPage();
        await page.route("**/api/scan/start", async (r) => {
          await new Promise((res) => setTimeout(res, 4000));
          if (outcome === "ok") await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ token: "r49harness" }) });
          else await r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "That does not look like a website address. Try example.com." }) });
        });
        // Held open rather than aborted: an abort makes Next fall back to a hard
        // navigation, and the page under test goes with it.
        await page.route("**/scan/r49harness**", () => new Promise(() => {}));
        await page.goto(base + route, { waitUntil: "load" });
        await page.waitForTimeout(1500);
        const tag = `${route === "/" ? "home" : "scan"}-${width}${reduced ? "-reduced" : ""}-${outcome}${jsOff ? "-jsoff" : ""}`;
        const hero = page.locator("section#scan, form:has(#scan-domain)").first();
        const read = async () => ({
          questionsLine: await page.locator("section#scan p, main > section:first-of-type p").filter({ hasText: "buyer questions," }).count(),
          status: (await page.locator("#scan-domain-err").innerText().catch(() => "")).trim(),
          formLines: await page.locator("form:has(#scan-domain) p").count(),
        });
        const idle = await read();
        await hero.screenshot({ path: `${out}/${tag}-idle.png` });
        if (jsOff) {
          console.log(tag, JSON.stringify({ idle }));
          await ctx.close();
          continue;
        }
        await page.locator("#scan-domain").fill("example.com");
        await page.locator("form:has(#scan-domain) button[type=submit]").first().click();
        await page.waitForTimeout(2000);
        const busy = await read();
        await hero.screenshot({ path: `${out}/${tag}-busy.png` });
        await page.waitForTimeout(3500);
        const after = await read();
        await hero.screenshot({ path: `${out}/${tag}-after.png` });
        console.log(tag, JSON.stringify({ idle, busy, after }));
        await ctx.close();
      }
    }
  }
}
await browser.close();
