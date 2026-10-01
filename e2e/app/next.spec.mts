/**
 * R164 (1 Oct 2026, danny.md line 173): a logged-out bookmark returns to its
 * page. Fixture mode signed out (TRACKING_FIXTURE_SESSION=none): bookmark ->
 * /app/login?next= -> the email request carries next -> the link's page
 * posts it with the token. The fixture has no token table and sends no mail,
 * so both POSTs are stopped in the browser and what they carried is asserted;
 * the redirect onto next after a real claim is held by next-path.test.mts and
 * read live. Hostile next values are shown dropped at each hop.
 *
 * Same harness as overview.spec.mts, its own server because the session
 * switch is read per request from this process's environment.
 */
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const require = createRequire(path.join(os.homedir(), "code/.parity/package.json"));
type Route = { request(): { postData(): string | null }; fulfill(o: object): Promise<void> };
type Page = {
  goto(url: string, o?: object): Promise<unknown>;
  url(): string;
  route(url: string, fn: (r: Route) => void): Promise<void>;
  waitForRequest(pred: (r: { url(): string; method(): string }) => boolean, o?: object): Promise<{ postData(): string | null }>;
  fill(sel: string, v: string): Promise<void>;
  click(sel: string): Promise<void>;
  locator(sel: string): { count(): Promise<number> };
};
type Context = { newPage(): Promise<Page>; close(): Promise<void> };
type Browser = { newContext(o: object): Promise<Context>; close(): Promise<void> };
const { chromium } = require("playwright") as { chromium: { launch(): Promise<Browser> } };

const PORT = Number(process.env.E2E_PORT ?? 3107);
const BASE = process.env.E2E_BASE ?? `http://127.0.0.1:${PORT}`;
const FRESH = "a".repeat(64);
const BOOKMARK = "/app/tallyroo/clusters";

let server: Server | null = null;
let browser: Browser;

before(async () => {
  if (!process.env.E2E_BASE) {
    process.env.TRACKING_FIXTURE = "1";
    process.env.TRACKING_FIXTURE_SESSION = "none";
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

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  return { ctx, page: await ctx.newPage() };
}

test("bookmark -> login -> email -> auth carries the bookmark the whole way", async () => {
  const { ctx, page } = await open();
  await page.goto(`${BASE}${BOOKMARK}`, { waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).pathname, "/app/login");
  assert.equal(new URL(page.url()).searchParams.get("next"), BOOKMARK);

  let asked: string | null = null;
  await page.route(`${BASE}/api/app/login`, (r) => {
    asked = r.request().postData();
    void r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, message: "sent" }) });
  });
  await page.fill("#app-login-email", "owner@example.com");
  await page.click('button[type="submit"]');
  for (let i = 0; i < 20 && asked === null; i++) await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(JSON.parse(asked ?? "{}"), { email: "owner@example.com", next: BOOKMARK });

  // The link the login route writes: /app/auth?token=...&next=<encoded bookmark>.
  await page.route(`${BASE}/api/app/auth`, (r) => void r.fulfill({ status: 204, body: "" }));
  const posted = page.waitForRequest((r) => r.url().endsWith("/api/app/auth") && r.method() === "POST", { timeout: 10_000 });
  await page.goto(`${BASE}/app/auth?token=${FRESH}&next=${encodeURIComponent(BOOKMARK)}`);
  const body = new URLSearchParams((await posted).postData() ?? "");
  assert.equal(body.get("token"), FRESH);
  assert.equal(body.get("next"), BOOKMARK);
  await ctx.close();
});

test("a deep page keeps its query in next", async () => {
  const { ctx, page } = await open();
  await page.goto(`${BASE}/app/tallyroo/named?range=90d`, { waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).searchParams.get("next"), "/app/tallyroo/named?range=90d");
  await ctx.close();
});

for (const hostile of ["//example.com", "https://example.com/app/x", "/app/\\example.com", "/app/login"]) {
  test(`hostile next ${hostile} is dropped at login and at auth`, async () => {
    const { ctx, page } = await open();
    let asked: string | null = null;
    await page.route(`${BASE}/api/app/login`, (r) => {
      asked = r.request().postData();
      void r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, message: "sent" }) });
    });
    await page.goto(`${BASE}/app/login?next=${encodeURIComponent(hostile)}`, { waitUntil: "networkidle" });
    await page.fill("#app-login-email", "owner@example.com");
    await page.click('button[type="submit"]');
    for (let i = 0; i < 20 && asked === null; i++) await new Promise((r) => setTimeout(r, 100));
    assert.deepEqual(JSON.parse(asked ?? "{}"), { email: "owner@example.com" });

    await page.route(`${BASE}/api/app/auth`, (r) => void r.fulfill({ status: 204, body: "" }));
    const posted = page.waitForRequest((r) => r.url().endsWith("/api/app/auth") && r.method() === "POST", { timeout: 10_000 });
    await page.goto(`${BASE}/app/auth?token=${FRESH}&next=${encodeURIComponent(hostile)}`);
    assert.equal(new URLSearchParams((await posted).postData() ?? "").get("next"), null);
    await ctx.close();
  });
}
