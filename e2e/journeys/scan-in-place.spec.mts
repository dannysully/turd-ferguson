/**
 * The page scan cards run the scan in place (R181, 2 Oct 2026; danny.md lines
 * 209-216): /seo-agencies, /how-it-works and /case-studies/vibe-retail.
 *
 *   node --test e2e/journeys/scan-in-place.spec.mts
 *
 * Against production by default, or JOURNEY_BASE, and nothing is submitted
 * there: /api/scan/start is answered by page.route inside the browser, so the
 * press never leaves it. While that answer is held the card must be on its
 * next step - "Checking <domain>" under the field, the button busy - on the
 * same URL, with every id on the page unique. With JavaScript off the card is
 * read, not pressed: a GET form to /scan carrying `domain`.
 */
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

const require = createRequire(path.join(os.homedir(), "code/.parity/package.json"));
type Route = { request(): { method(): string; postData(): string | null }; fulfill(o: object): Promise<void> };
type Locator = { fill(v: string): Promise<void>; click(): Promise<void>; count(): Promise<number>; first(): Locator; getAttribute(n: string): Promise<string | null>; textContent(): Promise<string | null>; isDisabled(): Promise<boolean>; waitFor(o?: object): Promise<void> };
type Page = {
  goto(url: string, o?: object): Promise<{ status(): number } | null>;
  url(): string;
  evaluate<R>(fn: () => R | Promise<R>): Promise<R>;
  locator(sel: string, o?: { hasText?: string | RegExp }): Locator;
  route(url: string, handler: (r: Route) => void): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
};
type Context = { newPage(): Promise<Page>; close(): Promise<void> };
type Browser = { newContext(o: object): Promise<Context>; close(): Promise<void> };
const { chromium } = require("playwright") as { chromium: { launch(): Promise<Browser> } };

const BASE = process.env.JOURNEY_BASE ?? "https://alwayscited.com";
const PAGES: { route: string; label: string }[] = [
  { route: "/seo-agencies", label: "Client domain" },
  { route: "/how-it-works", label: "Domain" },
  { route: "/case-studies/vibe-retail", label: "Domain" },
];

let browser: Browser;
before(async () => {
  browser = await chromium.launch();
});
after(async () => {
  await browser.close();
});

const duplicateIds = (page: Page) =>
  page.evaluate(() => {
    const seen = new Map<string, number>();
    for (const el of document.querySelectorAll("[id]")) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
    return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
  });

/**
 * The card's form, ScanBox's, with this card's label. data-scan-card is "live"
 * when LiveScanChecker drew it and "get" when the checker is not ready.
 */
const card = (label: string) => `form[action="/scan"][data-scan-card]:has(label:text-is("${label}"))`;

for (const width of [1280, 390]) {
  describe(`scan cards at ${width}`, () => {
    for (const { route, label } of PAGES) {
      test(`${route}: the card starts the scan where it is`, async () => {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        let release: (() => Promise<void>) | null = null;
        let posted = "";
        await page.route("**/api/scan/start", (r) => {
          posted = `${r.request().method()} ${r.request().postData() ?? ""}`;
          release = () => r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "Stubbed by the journey spec." }) });
        });
        assert.equal((await page.goto(BASE + route, { waitUntil: "load" }))?.status(), 200);
        await page.waitForTimeout(600);
        assert.deepEqual(await duplicateIds(page), [], "ids used twice before the press");
        const form = page.locator(card(label)).first();
        assert.equal(await form.count(), 1, "the card's form");
        assert.equal(await form.getAttribute("data-scan-card"), "live", "the card is the dormant GET - the checker is not ready here");
        const before = page.url();

        await page.locator(`${card(label)} input[name="domain"]`).fill("example.com");
        await page.locator(`${card(label)} button[type="submit"]`).click();
        await page.locator(`${card(label)} [role="status"]`, { hasText: "Checking example.com" }).waitFor({ timeout: 5000 });

        assert.equal(page.url(), before, "pressing Check navigated");
        assert.match(posted, /^POST .*"domain":"example\.com"/, "the start was not asked for this domain");
        assert.equal(await page.locator(`${card(label)} button[type="submit"]`).isDisabled(), true, "the button is not busy");
        assert.deepEqual(await duplicateIds(page), [], "ids used twice while checking");

        assert.ok(release, "the start route was never called");
        await (release as unknown as () => Promise<void>)();
        await page.locator(`${card(label)} [role="alert"]`, { hasText: "Stubbed by the journey spec." }).waitFor({ timeout: 5000 });
        assert.equal(page.url(), before, "a refused start navigated");
        await ctx.close();
      });

      test(`${route}: with JavaScript off the card is a GET to /scan`, async () => {
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: false });
        const page = await ctx.newPage();
        assert.equal((await page.goto(BASE + route, { waitUntil: "load" }))?.status(), 200);
        const form = page.locator(card(label)).first();
        assert.equal(await form.count(), 1, "the card's form");
        assert.equal((await form.getAttribute("method"))?.toLowerCase(), "get");
        assert.equal(await page.locator(`${card(label)} input[name="domain"]`).count(), 1);
        assert.deepEqual(await duplicateIds(page), [], "ids used twice in the served HTML");
        await ctx.close();
      });
    }
  });
}
