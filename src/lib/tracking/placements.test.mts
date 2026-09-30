import assert from "node:assert/strict";
import { test } from "node:test";

import { citesPlacement, decideLinkCheck, isLinkCheckDay, LINK_CHECK_UA, linksTo, readPlacement, urlKey } from "./placements.ts";

// R96 / BRIEF-2 T12 (30 Sep 2026). Stubbed fetch only: nothing here reaches the network.

test("url_key: lowercase host, no www, no query or fragment, no trailing slash", () => {
  assert.equal(urlKey("https://WWW.Example.com/Guides/Best-Apps/?utm=x#top"), "example.com/Guides/Best-Apps");
  assert.equal(urlKey("http://example.com/"), "example.com");
  assert.equal(urlKey("example.com/a//"), "example.com/a");
  assert.equal(urlKey("  https://example.com/p  "), "example.com/p");
  assert.equal(urlKey("example.com:8080/p"), "example.com/p");
  assert.equal(urlKey("mailto:a@example.com"), null);
  assert.equal(urlKey("not a url"), null);
  assert.equal(urlKey(""), null);
});

test("a citation matches a placement on url_key", () => {
  const key = urlKey("https://example.com/best-apps")!;
  assert.equal(citesPlacement([{ url: "https://www.example.com/best-apps/?ref=x" }], key), true);
  assert.equal(citesPlacement([{ url: "https://example.com/other" }, { url: null }], key), false);
});

test("linksTo finds a link to the domain or a subdomain, not a lookalike", () => {
  assert.equal(linksTo('<a href="https://www.tallyroo.com/pricing">x</a>', "tallyroo.com"), true);
  // Subdomain and lookalike on the reserved .test TLD (RFC 2606), so the privacy census's made-up set is not widened.
  assert.equal(linksTo("<a href=https://app.tallyroo.test>x</a>", "tallyroo.test"), true);
  assert.equal(linksTo('<a href="https://nottallyroo.test/">x</a>', "tallyroo.test"), false);
  assert.equal(linksTo("<p>tallyroo.com is great</p>", "tallyroo.com"), false);
});

const live = { url: "https://example.com/p", last_checked_on: "2026-09-20", link_present: true };

test("a page that still links records present, no alert", () => {
  assert.deepEqual(decideLinkCheck(live, { kind: "page", status: 200, html: '<a href="https://tallyroo.com">t</a>' }, "tallyroo.com", "2026-09-27"), {
    write: { last_checked_on: "2026-09-27", link_present: true },
    alert: null,
  });
});

test("a page that dropped the link alerts once", () => {
  const first = decideLinkCheck(live, { kind: "page", status: 200, html: "<p>none</p>" }, "tallyroo.com", "2026-09-27");
  assert.deepEqual(first.write, { last_checked_on: "2026-09-27", link_present: false });
  assert.match(first.alert!, /no longer links/);
  const again = decideLinkCheck({ ...live, link_present: false }, { kind: "page", status: 200, html: "" }, "tallyroo.com", "2026-10-04");
  assert.equal(again.alert, null);
});

test("404 or 410 alerts on the second in a row, not the first", () => {
  const first = decideLinkCheck(live, { kind: "page", status: 404, html: "" }, "tallyroo.com", "2026-09-27");
  assert.deepEqual(first, { write: { last_checked_on: "2026-09-27", link_present: null }, alert: null });
  const second = decideLinkCheck({ ...live, last_checked_on: "2026-09-27", link_present: null }, { kind: "page", status: 410, html: "" }, "tallyroo.com", "2026-10-04");
  assert.deepEqual(second.write, { last_checked_on: "2026-10-04", link_present: false });
  assert.match(second.alert!, /twice in a row/);
  // A never-checked row's first 404 is only the first.
  assert.equal(decideLinkCheck({ ...live, last_checked_on: null, link_present: null }, { kind: "page", status: 404, html: "" }, "tallyroo.com", "2026-09-27").alert, null);
  // Already flagged: no second email.
  assert.equal(decideLinkCheck({ ...live, link_present: false }, { kind: "page", status: 404, html: "" }, "tallyroo.com", "2026-10-04").alert, null);
});

test("a failed fetch or a 5xx records nothing", () => {
  assert.deepEqual(decideLinkCheck(live, { kind: "failed", reason: "timeout" }, "tallyroo.com", "2026-09-27"), { write: null, alert: null });
  assert.deepEqual(decideLinkCheck(live, { kind: "page", status: 503, html: "" }, "tallyroo.com", "2026-09-27"), { write: null, alert: null });
});

test("readPlacement sends the polite agent with a timeout, and never throws", async () => {
  const seen: { ua?: string; signal?: boolean } = {};
  const ok = await readPlacement("https://example.com/p", async (_u, init) => {
    seen.ua = init.headers["user-agent"];
    seen.signal = init.signal instanceof AbortSignal;
    return { status: 200, text: async () => "<html></html>" };
  });
  assert.deepEqual(ok, { kind: "page", status: 200, html: "<html></html>" });
  assert.equal(seen.ua, LINK_CHECK_UA);
  assert.equal(seen.signal, true);
  const bad = await readPlacement("https://example.com/p", async () => {
    throw new Error("The operation was aborted due to timeout");
  });
  assert.equal(bad.kind, "failed");
});

test("the link check runs on Sundays", () => {
  assert.equal(isLinkCheckDay("2026-10-04"), true);
  assert.equal(isLinkCheckDay("2026-09-30"), false);
});
