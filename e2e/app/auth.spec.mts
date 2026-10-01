/**
 * R163 (1 Oct 2026, danny.md line 172): the login link opens the dashboard
 * without a click. Fixture mode (src/lib/tracking/login-link-state.ts
 * FIXTURE_LINKS): any well-shaped token is fresh, two fixed ones are spent and
 * expired. The fixture has no token table, so the fresh case stops the POST
 * in the browser and asserts what it would have sent; nothing is claimed and
 * no mail is sent (the new-link request is stopped the same way).
 *
 * Same harness as overview.spec.mts: `next start` on the build in-process
 * with TRACKING_FIXTURE=1, unless E2E_BASE names a fixture server.
 */
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";

import { FIXTURE_LINKS } from "../../src/lib/tracking/login-link-state.ts";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const require = createRequire(path.join(os.homedir(), "code/.parity/package.json"));
type Route = { request(): { method(): string; postData(): string | null; url(): string }; fulfill(o: object): Promise<void> };
type Page = {
  goto(url: string, o?: object): Promise<unknown>;
  route(url: string, fn: (r: Route) => void): Promise<void>;
  waitForRequest(pred: (r: { url(): string; method(): string }) => boolean, o?: object): Promise<{ postData(): string | null }>;
  textContent(sel: string): Promise<string | null>;
  locator(sel: string): { count(): Promise<number>; click(): Promise<void> };
  waitForTimeout(ms: number): Promise<void>;
};
type Context = { newPage(): Promise<Page>; close(): Promise<void> };
type Browser = { newContext(o: object): Promise<Context>; close(): Promise<void> };
const { chromium } = require("playwright") as { chromium: { launch(): Promise<Browser> } };

const PORT = Number(process.env.E2E_PORT ?? 3107);
const BASE = process.env.E2E_BASE ?? `http://127.0.0.1:${PORT}`;
const FRESH = "a".repeat(64);

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

async function open(javaScriptEnabled: boolean) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled });
  return { ctx, page: await ctx.newPage() };
}

test("a fresh link posts its token on load, with no click", async () => {
  const { ctx, page } = await open(true);
  await page.route(`${BASE}/api/app/auth`, (r) => void r.fulfill({ status: 204, body: "" }));
  const posted = page.waitForRequest((r) => r.url().endsWith("/api/app/auth") && r.method() === "POST", { timeout: 10_000 });
  await page.goto(`${BASE}/app/auth?token=${FRESH}`);
  assert.equal((await posted).postData(), `token=${FRESH}`);
  await ctx.close();
});

test("without script a fresh link shows the button and posts nothing", async () => {
  const { ctx, page } = await open(false);
  let posts = 0;
  await page.route(`${BASE}/api/app/auth`, (r) => {
    posts += 1;
    void r.fulfill({ status: 204, body: "" });
  });
  await page.goto(`${BASE}/app/auth?token=${FRESH}`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  assert.match((await page.textContent("button")) ?? "", /Open my dashboard/);
  assert.equal(posts, 0, "the GET spent the token without a click");
  await ctx.close();
});

test("a failed claim comes back to the button and does not submit again", async () => {
  const { ctx, page } = await open(true);
  let posts = 0;
  await page.route(`${BASE}/api/app/auth`, (r) => {
    posts += 1;
    void r.fulfill({ status: 204, body: "" });
  });
  await page.goto(`${BASE}/app/auth?token=${FRESH}&failed=1`, { waitUntil: "networkidle" });
  assert.match((await page.textContent("button")) ?? "", /Open my dashboard/);
  assert.equal(posts, 0);
  await ctx.close();
});

for (const [name, token] of Object.entries(FIXTURE_LINKS)) {
  test(`the ${name} link says so and offers a new one in one click`, async () => {
    const { ctx, page } = await open(true);
    let authPosts = 0;
    await page.route(`${BASE}/api/app/auth`, (r) => {
      authPosts += 1;
      void r.fulfill({ status: 204, body: "" });
    });
    let sent: string | null = null;
    await page.route(`${BASE}/api/app/login`, (r) => {
      sent = r.request().postData();
      void r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "Check your inbox." }) });
    });
    await page.goto(`${BASE}/app/auth?token=${token}`, { waitUntil: "networkidle" });
    assert.equal(await page.textContent("h1"), "That link has already been used");
    const button = (await page.textContent("button")) ?? "";
    const email = button.replace(/^Send a new link to /, "");
    assert.ok(button.startsWith("Send a new link to ") && email.includes("@"), `button reads ${button}`);
    assert.equal(authPosts, 0, "a spent link still posted");
    await page.locator("button").click();
    await page.waitForTimeout(300);
    assert.deepEqual(JSON.parse(sent ?? "{}"), { email });
    assert.match((await page.textContent('[role="status"]')) ?? "", /Check your inbox/);
    await ctx.close();
  });
}
