/**
 * Dashboard journeys as an owner, editor and viewer (R148 and R154, 1 Oct
 * 2026; danny.md lines 138-154). Fixture only: `next start` in-process with
 * TRACKING_FIXTURE=1, as e2e/app does, so no login, no database and nothing
 * real. Read-only: links are followed and controls found, never pressed.
 *
 *   npm run build && node --test e2e/journeys/app.spec.mts
 *   TRACKING_FIXTURE_ROLE=editor node --test e2e/journeys/app.spec.mts
 *   TRACKING_FIXTURE_ROLE=viewer node --test e2e/journeys/app.spec.mts
 *
 * Each journey starts on the Overview and counts the clicks to the page that
 * answers it. R148: more than 3 clicks, or a page with no visible way on, is a
 * friction point, and fails here.
 */
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const require = createRequire(path.join(os.homedir(), "code/.parity/package.json"));
type Page = {
  goto(url: string, o?: object): Promise<{ status(): number } | null>;
  evaluate<R, A>(fn: (a: A) => R | Promise<R>, a: A): Promise<R>;
};
type Context = { newPage(): Promise<Page>; close(): Promise<void> };
type Browser = { newContext(o: object): Promise<Context>; close(): Promise<void> };
const { chromium } = require("playwright") as { chromium: { launch(): Promise<Browser> } };

const PORT = Number(process.env.E2E_PORT ?? 3108);
const BASE = process.env.E2E_BASE ?? `http://127.0.0.1:${PORT}`;
const HOME = "/app/tallyroo";

/** Journey -> the route that answers it and, there, what must be on the page. */
const JOURNEYS: { ask: string; route: string; finds: RegExp; owner?: true }[] = [
  { ask: "prompts that don't name me", route: `${HOME}/clusters`, finds: /prompt/i },
  { ask: "who is named instead", route: `${HOME}/named`, finds: /named/i },
  { ask: "which pages to get placed on", route: `${HOME}/cited`, finds: /cite/i },
  { ask: "export this month for my client", route: `${HOME}/reports`, finds: /CSV/ },
  { ask: "find billing", route: `${HOME}/settings`, finds: /Billing/, owner: true },
  { ask: "invite a colleague", route: `${HOME}/settings`, finds: /Invite/, owner: true },
];

let server: Server | null = null;
let browser: Browser;

before(async () => {
  if (!process.env.E2E_BASE) {
    process.env.TRACKING_FIXTURE = "1";
    process.env.VERCEL_ENV = "development";
    const { default: next } = await import("next");
    const app = next({ dev: false, dir: ROOT });
    await app.prepare();
    const handle = app.getRequestHandler();
    server = createServer((req, res) => handle(req, res));
    await new Promise<void>((resolve) => server!.listen(PORT, "127.0.0.1", () => resolve()));
  }
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
  server?.closeAllConnections();
});

/** The same-site links a page shows, pathname only. */
async function links(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      [...document.querySelectorAll("a[href]")]
        .filter((a) => (a as HTMLElement).offsetParent !== null || getComputedStyle(a).position === "fixed")
        .map((a) => new URL((a as HTMLAnchorElement).href).pathname),
    null,
  );
}

/** Fewest clicks from the Overview to `route`, by breadth-first walk of visible links, up to `max`. */
async function clicks(page: Page, route: string, max = 3): Promise<number | null> {
  let frontier = [HOME];
  const seen = new Set(frontier);
  for (let depth = 0; depth <= max; depth++) {
    if (frontier.includes(route)) return depth;
    const next: string[] = [];
    for (const r of frontier) {
      await page.goto(BASE + r, { waitUntil: "load" });
      for (const l of await links(page)) if (l.startsWith("/app/") && !seen.has(l)) (seen.add(l), next.push(l));
    }
    frontier = next;
  }
  return null;
}

// repo.ts reads the fixture, role included, once per process, so a run is one
// role: run the file three times, TRACKING_FIXTURE_ROLE unset, =editor, =viewer.
const role = process.env.TRACKING_FIXTURE_ROLE || "owner";

for (const width of [1280, 390]) {
  {
    describe(`dashboard journeys at ${width} as ${role}`, () => {
      for (const j of JOURNEYS) {
        if (j.owner && role !== "owner") continue;
        test(`${j.ask}: at most 3 clicks from the Overview`, async () => {
          const ctx = await browser.newContext({ viewport: { width, height: 900 } });
          const page = await ctx.newPage();
          const n = await clicks(page, j.route);
          assert.ok(n !== null && n <= 3, `${j.route} not reachable in 3 clicks at ${width}`);
          const r = await page.goto(BASE + j.route, { waitUntil: "load" });
          assert.equal(r?.status(), 200);
          const text = await page.evaluate(() => document.body.innerText, null);
          assert.match(text, j.finds, `${j.route} shows ${j.finds}`);
          await ctx.close();
        });
      }
      // Proves the role switch reaches the in-process server: only the owner may invite.
      test("Settings offers Invite to the owner only", async () => {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        await page.goto(`${BASE}${HOME}/settings`, { waitUntil: "load" });
        const invite = await page.evaluate(() => [...document.querySelectorAll("button, summary")].some((b) => /^Invite/.test((b.textContent ?? "").trim())), null);
        assert.equal(invite, role === "owner", `${role} ${invite ? "sees" : "does not see"} Invite`);
        await ctx.close();
      });
    });
  }
}
