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
type Locator = { click(): Promise<void>; count(): Promise<number>; getByRole(role: string, o?: object): Locator; first(): Locator };
type Page = {
  goto(url: string, o?: object): Promise<{ status(): number } | null>;
  evaluate<R, A>(fn: (a: A) => R | Promise<R>, a: A): Promise<R>;
  getByRole(role: string, o?: object): Locator;
  waitForURL(url: RegExp, o?: object): Promise<void>;
  waitForLoadState(state: string): Promise<void>;
  url(): string;
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

// Pass 7 (R148/R153, 1 Oct 2026): TRACKING_FIXTURE_STATE=new is the first
// view after checkout, before any check. The journeys below need readings, so
// that run checks day zero instead:
//   TRACKING_FIXTURE_STATE=new node --test e2e/journeys/app.spec.mts
const dayZero = process.env.TRACKING_FIXTURE_STATE === "new";

for (const width of [1280, 390]) {
  if (dayZero) {
    describe(`day zero at ${width} as ${role}`, () => {
      test("the Overview says when the first check runs, right under the top bar", async () => {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        await page.goto(BASE + HOME, { waitUntil: "load" });
        const t = await page.evaluate(() => document.body.innerText, null);
        assert.match(t, /Your first check runs tomorrow at 06:00\./);
        assert.match(t, /\d+ prompts are set up on/);
        assert.doesNotMatch(t, /Tracking began/, "nothing has begun yet");
        // The phone shell once opened a ~215px gap above a short page.
        const top = await page.evaluate(() => document.querySelector(".app-main")!.getBoundingClientRect().top, null);
        assert.ok(top <= 80, `.app-main starts at ${top}px`);
        await ctx.close();
      });
      test("a cluster before its first check shows no counts, and a way to its prompts", async () => {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        const r = await page.goto(`${BASE}${HOME}/clusters/c1`, { waitUntil: "load" });
        assert.equal(r?.status(), 200);
        const t = await page.evaluate(() => document.body.innerText, null);
        assert.deepEqual(t.match(/.{0,30}(\b0 of \d+\b|days named, of 0).{0,30}/g), null, "no zero counts before a reading");
        assert.match(t, /Not checked yet/);
        assert.ok(await page.getByRole("link", { name: /Manage prompts/ }).count(), "Manage prompts is offered");
        await ctx.close();
      });
    });
    continue;
  }
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

      // Pass 3 (1 Oct 2026, 04:20Z): the four journeys pass 2 left.
      const text = (page: Page) => page.evaluate(() => document.body.innerText, null);

      test("did my Google position move this month: on the Overview, no click", async () => {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        await page.goto(BASE + HOME, { waitUntil: "load" });
        // Each cluster card shows its Google position as #N beside the move chip.
        assert.match(await text(page), /#\d+/);
        await ctx.close();
      });

      test("add a cluster and see it pending: Add a cluster is 2 clicks, the pending one shows on the Overview", async () => {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        // The fixture's c10 starts the day after `today`, so it is the pending cluster.
        await page.goto(BASE + HOME, { waitUntil: "load" });
        assert.match(await text(page), /payroll and accounting software/i);
        assert.match(await text(page), /First check\s+tomorrow/);
        assert.ok((await clicks(page, `${HOME}/clusters`, 1)) !== null, "Clusters is one click from the Overview");
        await page.goto(`${BASE}${HOME}/clusters`, { waitUntil: "load" });
        const add = page.getByRole("link", { name: "Add a cluster" });
        if (role === "viewer") {
          assert.equal(await add.count(), 0, "a viewer is not offered Add a cluster");
        } else {
          await add.click();
          await page.waitForURL(/[?&]add=1/);
          assert.equal(await page.getByRole("region", { name: "Add a cluster" }).count(), 1, "the Add a cluster panel opens");
        }
        await ctx.close();
      });

      test("stop a prompt: the stop control is on the open cluster, 2 clicks from the Overview", async () => {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        await page.goto(`${BASE}${HOME}/clusters?open=c1`, { waitUntil: "load" });
        // Only forms posting to the stop route: Log out and the upgrade prompts post too.
        const stops = await page.evaluate(() => document.querySelectorAll("form[method=post][action*='/stop?'] button[type=submit]").length, null);
        if (role === "viewer") assert.equal(stops, 0, "a viewer has no stop forms");
        else assert.ok(stops >= 5, `${stops} stop forms on the open cluster`);
        // Undo rides the toast after a real stop (stopped_on after today); the
        // fixture holds no such prompt and this spec never posts, so Undo is
        // held by src/lib/tracking/stop.test.mts, not here.
        await ctx.close();
      });

      test("change the date range and compare: 3 clicks, and the compare comes with it", async () => {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        await page.goto(BASE + HOME, { waitUntil: "load" });
        await page.getByRole("button", { name: "Change date range" }).first().click();
        const dialog = page.getByRole("dialog", { name: "Choose a date range" });
        await dialog.getByRole("button", { name: "Last 7 days" }).click();
        await dialog.getByRole("button", { name: "Apply" }).click();
        await page.waitForURL(/[?&]from=/);
        await page.waitForLoadState("load");
        // The previous period is the default compare, so it comes with no fourth
        // click: the headline reads "up from", and names the span ("vs" at 1280;
        // at 390 the chart's "Dashed:" caption, as Mobile.dc.html drops it from the face).
        const t = await text(page);
        assert.match(t, /Last 7 days/);
        assert.match(t, /up from \d+%|down from \d+%|was \d+ of \d+/);
        assert.match(t, /(vs|Dashed:) \d+ \w+ - \d+ \w+/);
        await ctx.close();
      });
    });
  }
}
