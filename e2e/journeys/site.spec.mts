/**
 * Site journeys as a first-time buyer (R148 and R154, 1 Oct 2026; danny.md
 * lines 138-154). Read-only against production by default, or JOURNEY_BASE:
 * pages are opened and links followed, and nothing else - no form is
 * submitted, no scan is started, no payment is begun, no mail is sent.
 * "Continue to payment" is found and left alone; /api/checkout is never hit.
 *
 *   node --test e2e/journeys/site.spec.mts
 *
 * The scan tokens are the two real scans Danny pasted into docs/inbox.md,
 * read from there at run time so no capability URL is written into this
 * public repo. Playwright is resolved from ~/code/.parity, as in e2e/app.
 *
 * Journeys (R148): (1) / -> free scan -> result -> its next step; (2)
 * /alwaystracked -> checkout; (3) /packages -> each tier's next page, US and
 * UK; (4) /white-label and the SEO and PR agency pages; (5) the phone width
 * on /, /scan and a result; (6) a returning visitor on an emailed scan link.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

import { trackOffer } from "../../src/components/scan/track-offer.ts";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const require = createRequire(path.join(os.homedir(), "code/.parity/package.json"));
type Locator = { evaluate<R>(fn: (el: Element) => R): Promise<R>; count(): Promise<number>; first(): Locator; getAttribute(n: string): Promise<string | null>; isVisible(): Promise<boolean>; boundingBox(): Promise<{ height: number; width: number } | null>; textContent(): Promise<string | null> };
type Page = {
  goto(url: string, o?: object): Promise<{ status(): number } | null>;
  url(): string;
  title(): Promise<string>;
  evaluate<R>(fn: () => R | Promise<R>): Promise<R>;
  locator(sel: string, o?: { hasText?: string | RegExp }): Locator;
  getByRole(role: string, o: { name: string | RegExp }): Locator;
  waitForTimeout(ms: number): Promise<void>;
};
type Context = { newPage(): Promise<Page>; close(): Promise<void> };
type Browser = { newContext(o: object): Promise<Context>; close(): Promise<void> };
const { chromium } = require("playwright") as { chromium: { launch(): Promise<Browser> } };

const BASE = process.env.JOURNEY_BASE ?? "https://alwayscited.com";
const TOKENS = [...readFileSync(path.join(ROOT, "docs", "inbox.md"), "utf8").matchAll(/\/scan\/([0-9a-f]{32})\b/g)].map((m) => m[1]);

let browser: Browser;
before(async () => {
  browser = await chromium.launch();
});
after(async () => {
  await browser.close();
});

async function open(width: number, route: string): Promise<{ page: Page; ctx: Context; status: number }> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const r = await page.goto(BASE + route, { waitUntil: "load" });
  // Client islands (the market toggle, the picks) settle after hydration.
  await page.waitForTimeout(600);
  return { page, ctx, status: r?.status() ?? 0 };
}

/** The status a GET of `href` comes back with, followed through redirects. */
async function statusOf(href: string): Promise<number> {
  const r = await fetch(new URL(href, BASE), { redirect: "follow" });
  return r.status;
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("the two real scan tokens are in docs/inbox.md", () => {
  assert.ok(TOKENS.length >= 2, `found ${TOKENS.length} - the inbox's scan list has moved`);
});

for (const width of [1280, 390]) {
  describe(`journeys at ${width}`, () => {
    test("(1) / offers the free scan and reaches a result's next step", async () => {
      const { page, ctx, status } = await open(width, "/");
      assert.equal(status, 200);
      assert.equal(await page.getByRole("button", { name: /Run a free scan/ }).first().isVisible(), true, "the hero's free scan button");
      assert.ok((await overflow(page)) <= 0, "no sideways scroll on /");
      await ctx.close();

      const res = await open(width, `/scan/${TOKENS[0]}`);
      assert.equal(res.status, 200);
      // A cluster scan sells the cluster it read; an older scan offers the walkthrough.
      const buy = res.page.locator('[data-figure="tracked-checkout"] a');
      if (await buy.count()) {
        const href = (await buy.first().getAttribute("href")) ?? "";
        assert.match(href, /^\/checkout\?tier=alwaystracked/);
        assert.equal(await statusOf(href), 200);
      } else {
        assert.equal(await res.page.getByRole("button", { name: /Send me the walkthrough/ }).first().isVisible(), true, "no checkout card, so the walkthrough form");
      }
      await res.ctx.close();
    });

    // The "Track this cluster" click itself needs a cluster scan, and both inbox
    // tokens predate them (pass 3). So the leg after the click: the exact href
    // trackOffer gives the card, opened on production for each market's token -
    // tokens in the inbox's order, the .co.uk scan then the US .com one.
    test("(1b) a result's Track this cluster link lands on the order form with its scan and market", async () => {
      for (const [market, token] of [["UK", TOKENS[0]], ["US", TOKENS[1]]] as const) {
        const { href } = trackOffer(market, { us: 0, uk: 0 }, "/checkout?tier=alwaystracked", token);
        const co = await open(width, href);
        assert.equal(co.status, 200, href);
        const price = (await co.page.locator('[data-figure="checkout-price"]').first().textContent()) ?? "";
        assert.match(price, market === "UK" ? /^£\d.*plus VAT$/ : /^\$\d/, `${market} price "${price}"`);
        assert.equal(await co.page.locator('select[name="market"]').first().evaluate((s) => (s as HTMLSelectElement).value), market.toLowerCase());
        // The scan rides both forms: a market change keeps it, and the Session gets it for the webhook.
        for (const id of ["#checkout-pick-scan", "#checkout-scan"]) {
          assert.equal(await co.page.locator(id).first().getAttribute("value"), token, `${market}: ${id} carries the scan`);
        }
        assert.equal(await co.page.getByRole("button", { name: /Continue to payment/ }).first().isVisible(), true);
        await co.ctx.close();
      }
    });

    test("(2) /alwaystracked -> the order form, price and terms before payment", async () => {
      const { page, ctx, status } = await open(width, "/alwaystracked");
      assert.equal(status, 200);
      const href = (await page.getByRole("link", { name: /^Start tracking$/ }).first().getAttribute("href")) ?? "";
      assert.match(href, /^\/checkout\?tier=alwaystracked/);
      await ctx.close();

      for (const market of ["us", "uk"]) {
        const co = await open(width, `/checkout?tier=alwaystracked&market=${market}`);
        assert.equal(co.status, 200);
        const price = (await co.page.locator('[data-figure="checkout-price"]').first().textContent()) ?? "";
        assert.match(price, market === "uk" ? /^£\d.*plus VAT$/ : /^\$\d/, `${market} price "${price}"`);
        const body = await co.page.evaluate(() => document.body.innerText);
        assert.match(body, /30 days.? notice to cancel/);
        assert.match(body, /Stripe/);
        assert.equal(await co.page.getByRole("button", { name: /Continue to payment/ }).first().isVisible(), true);
        assert.ok((await overflow(co.page)) <= 0, `no sideways scroll on ${market} checkout`);
        await co.ctx.close();
      }
    });

    test("(3) /packages -> every tier's CTA opens, alwaystracked's at the order form", async () => {
      const { page, ctx, status } = await open(width, "/packages");
      assert.equal(status, 200);
      const tracked = (await page.getByRole("link", { name: /^Start tracking$/ }).first().getAttribute("href")) ?? "";
      assert.match(tracked, /^\/checkout\?tier=alwaystracked/, "alwaystracked's CTA goes straight to the order form");
      for (const name of [/^Start tracking$/, /^Get recommended$/, /^Get cited$/, /^Be everywhere$/]) {
        const href = await page.getByRole("link", { name }).first().getAttribute("href");
        assert.ok(href, `a ${name} link`);
        assert.equal(await statusOf(href), 200, `${name} -> ${href}`);
      }
      // The UK toggle carries UK to the order form.
      const uk = page.getByRole("button", { name: /^UK/ });
      if (await uk.count()) {
        await (uk.first() as unknown as { click(): Promise<void> }).click();
        await page.waitForTimeout(300);
        const after = (await page.getByRole("link", { name: /^Start tracking$/ }).first().getAttribute("href")) ?? "";
        assert.match(after, /market=uk/, "the UK pick travels to checkout");
      }
      await ctx.close();
    });

    test("(4) /white-label, /seo-agencies and /pr-agencies each have a next step", async () => {
      for (const route of ["/white-label", "/seo-agencies", "/pr-agencies"]) {
        const { page, ctx, status } = await open(width, route);
        assert.equal(status, 200, route);
        assert.equal(await page.locator("h1").count(), 1, `${route}: one h1`);
        const hrefs = await page.evaluate(() => [...document.querySelectorAll("main a[href^='/']")].map((a) => a.getAttribute("href")!));
        assert.ok(hrefs.length >= 1, `${route}: no onward link in main`);
        for (const h of new Set(hrefs)) assert.equal(await statusOf(h), 200, `${route} -> ${h}`);
        assert.ok((await overflow(page)) <= 0, `${route}: no sideways scroll`);
        await ctx.close();
      }
    });

    test("(5) /, /scan and a result fit the width with tappable primary actions", async () => {
      for (const route of ["/", "/scan", `/scan/${TOKENS[0]}`]) {
        const { page, ctx, status } = await open(width, route);
        assert.equal(status, 200, route);
        assert.ok((await overflow(page)) <= 0, `${route}: no sideways scroll`);
        const small = await page.evaluate(() =>
          [...document.querySelectorAll("main button, main a.btn-primary, main input[type=submit]")]
            .filter((e) => (e as HTMLElement).offsetParent !== null)
            .map((e) => ({ t: (e.textContent ?? "").trim().slice(0, 40), h: e.getBoundingClientRect().height }))
            .filter((x) => x.t && x.h > 0 && x.h < 44),
        );
        if (width === 390) assert.deepEqual(small, [], `${route}: primary actions under 44px`);
        await ctx.close();
      }
    });

    test("(6) a returning visitor on an emailed scan link sees the report", async () => {
      for (const t of TOKENS) {
        const { page, ctx, status } = await open(width, `/scan/${t}`);
        assert.equal(status, 200);
        assert.equal(await page.title(), "Your AI visibility report | alwayscited");
        const body = await page.evaluate(() => document.body.innerText);
        assert.doesNotMatch(body, /something went wrong|not found/i);
        assert.ok((await overflow(page)) <= 0, "no sideways scroll on the result");
        await ctx.close();
      }
    });
  });
}
