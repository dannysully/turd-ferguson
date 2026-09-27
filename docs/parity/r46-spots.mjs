// Element clips for R46: the hero line and the three engine-logo spots.
//   node docs/parity/r46-spots.mjs http://localhost:3000 docs/parity/R46-spots
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const require = createRequire(path.join(os.homedir(), "code/.parity/package.json"));
const { chromium } = require("playwright");
const base = process.argv[2];
const out = process.argv[3];
const jsOff = process.argv.includes("--js-off");
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const jobs = [
  ["/scan", "#scan h1", 390], ["/scan", "#scan h1", 1280],
  ["/", ".proc-qrow", 1280], ["/", ".proc-qrow", 390],
  ["/pr-agencies", "text=brand question", 1280], ["/pr-agencies", "text=brand question", 390],
  ["/seo-agencies", "text=best invoicing software for freelancers", 1280], ["/seo-agencies", "text=best invoicing software for freelancers", 390],
];
for (const [u, sel, w] of jobs) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 }, reducedMotion: "reduce", javaScriptEnabled: !jsOff });
  const p = await ctx.newPage();
  await p.goto(base + u, { waitUntil: "load" });
  const el = p.locator(sel).first();
  try {
    await el.scrollIntoViewIfNeeded();
    await p.waitForTimeout(600);
    const bb = await el.boundingBox();
    const f = path.join(out, (u.slice(1) || "home") + "-" + w + (jsOff ? "-nojs" : "") + ".png");
    await p.screenshot({ path: f, clip: { x: 0, y: Math.max(0, bb.y - 60), width: w, height: 260 } });
    console.log("ok", f);
  } catch (e) {
    console.log("FAIL", u, w, String(e).slice(0, 160));
  }
  await ctx.close();
}
await b.close();
