import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { MAX_COVERAGE_URLS, parseCoverageCsv } from "./csv.ts";
import {
  REPORT_LIMIT_LINE,
  clientDomainFrom,
  draftMarket,
  draftMarketLine,
  outboundLinks,
  pretick,
  runBlocker,
  tickedRows,
} from "./draft.ts";

/**
 * R140 part 1 (Danny, 30 Sep 2026, danny.md lines 128-133): the draft's rules
 * that need no network. The route and the two-step form come in later parts.
 */

const eight = parseCoverageCsv(
  Array.from({ length: 8 }, (_, i) => `https://pub${i}.com/piece-${i}`).join("\n"),
).rows;

test("over five rows: every row listed, exactly five pre-ticked", () => {
  const rows = pretick(eight);
  assert.equal(rows.length, 8, "a row past the limit was dropped");
  assert.equal(rows.filter((r) => r.ticked).length, MAX_COVERAGE_URLS);
  assert.deepEqual(rows.map((r) => r.ticked), [true, true, true, true, true, false, false, false]);
  assert.equal(REPORT_LIMIT_LINE, "We report on 5 per reading");
});

test("the run gets the ticked rows, never more than five", () => {
  const rows = pretick(eight).map((r, i) => ({ ...r, ticked: i >= 2 }));
  const out = tickedRows(rows);
  assert.equal(out.length, MAX_COVERAGE_URLS);
  assert.equal(out[0]!.url, "https://pub2.com/piece-2");
  assert.deepEqual(Object.keys(out[0]!).sort(), ["source_domain", "url"]);
});

test("a blank client domain blocks the run", () => {
  const rows = pretick(eight);
  assert.match(runBlocker({ clientDomain: "", rows })!, /client's domain/);
  assert.match(runBlocker({ clientDomain: "   ", rows })!, /client's domain/);
  assert.match(runBlocker({ clientDomain: "not a domain", rows })!, /website address/);
  assert.match(runBlocker({ clientDomain: "brightbook.com", rows: rows.map((r) => ({ ...r, ticked: false })) })!, /Tick/);
  assert.equal(runBlocker({ clientDomain: "https://www.brightbook.com/", rows }), null);
});

test("market: client ending, then publications, then currency, then the US", () => {
  const uk = parseCoverageCsv("https://retailweek.co.uk/a\nhttps://thegrocer.co.uk/b\nhttps://forbes.com/c").rows;
  assert.deepEqual(draftMarket({ clientDomain: "acme.us", rows: uk, text: "" }), { market: "US", reason: "domain ending" });
  assert.deepEqual(draftMarket({ clientDomain: "acme.com", rows: uk, text: "$5" }), { market: "UK", reason: "publications" });
  const neutral = parseCoverageCsv("https://forbes.com/c\nhttps://techcrunch.com/d").rows;
  assert.deepEqual(draftMarket({ clientDomain: null, rows: neutral, text: "costs £40, or £400 a year" }), { market: "UK", reason: "currency" });
  assert.deepEqual(draftMarket({ clientDomain: null, rows: neutral, text: "costs $40 (USD)" }), { market: "US", reason: "currency" });
  assert.deepEqual(draftMarket({ clientDomain: null, rows: neutral, text: "£4 and $4" }), { market: "US", reason: "default" });
  assert.match(draftMarketLine({ market: "UK", reason: "publications" }, null), /UK sites/);
  assert.match(draftMarketLine({ market: "UK", reason: "domain ending" }, "acme.co.uk"), /acme\.co\.uk/);
  assert.match(draftMarketLine({ market: "US", reason: "default" }, null), /default to the US/);
});

test("outbound links leave the publication and are resolved and decoded", () => {
  const html = `
    <a href="/about">About</a>
    <a href="https://www.retailweek.co.uk/x">own</a>
    <a href="https://news.retailweek.co.uk/y">own subdomain</a>
    <a href="https://www.brightbook.com/?utm=a&amp;b=2#top">Brightbook</a>
    <a href="mailto:press@brightbook.com">mail</a>
    <a href='//twitter.com/brightbook'>tw</a>`;
  assert.deepEqual(outboundLinks(html, "https://retailweek.co.uk/piece"), [
    "https://www.brightbook.com/?utm=a&b=2",
    "https://twitter.com/brightbook",
  ]);
});

/**
 * The draft route, read as source: node cannot load it (its `@/` imports), so
 * the order of its gates is what is held. Turnstile before the parse, the parse
 * before any spend; the model call only when a page was read; and no exit
 * between reading the pieces and the response, so a fetch failure still
 * returns a draft.
 */
test("draft route: refuses without Turnstile, and a fetch failure still returns a draft", () => {
  const src = readFileSync(join(import.meta.dirname, "../../app/api/coverage-check/draft/route.ts"), "utf8");
  const at = (s: string) => {
    const i = src.indexOf(s);
    assert.ok(i >= 0, `${s} is not in the draft route`);
    return i;
  };
  assert.ok(at("verifyTurnstile(") < at("parseCoverageCsv("), "Turnstile must be checked before the coverage is parsed");
  assert.ok(at('fail(403, "turnstile_failed"') < at("readPieces("), "no page may be fetched without Turnstile");
  assert.ok(at("checkCeilings(") < at("readPieces("), "the ceilings stand in front of the fetch");
  assert.ok(at("DRAFTS_PER_IP_PER_DAY)") < at("readPieces("), "the per-IP cap stands in front of the fetch");
  assert.match(src, /if \(read\.length\) \{[\s\S]*?readCoverage\(/, "the model call runs only when a page was read");
  const tail = src.slice(at("readPieces("));
  assert.doesNotMatch(tail, /return fail\(/, "an exit after the fetch would turn an unreadable page into no draft");
});

test("client domain: the brand's own domain, the most linked, or blank - never a guess", () => {
  const publications = ["retailweek.co.uk", "forbes.com"];
  assert.equal(
    clientDomainFrom({ brand: "Brightbook", links: ["https://www.brightbook.com/", "https://twitter.com/brightbook"], publications }),
    "brightbook.com",
  );
  assert.equal(
    clientDomainFrom({ brand: "Brightbook Ltd", links: ["https://brightbookltd.co.uk/x"], publications }),
    "brightbookltd.co.uk",
    "brand words with a suffix still match their compact domain",
  );
  assert.equal(
    clientDomainFrom({
      brand: "Brightbook",
      links: ["https://brightbook.com/a", "https://brightbook.com/b", "https://getbrightbook.io/"],
      publications,
    }),
    "brightbook.com",
  );
  assert.equal(
    clientDomainFrom({ brand: "Brightbook", links: ["https://brightbook.com/", "https://brightbookhq.com/"], publications }),
    null,
    "a tie is not a pick",
  );
  assert.equal(clientDomainFrom({ brand: "Brightbook", links: ["https://twitter.com/brightbook"], publications }), null);
  assert.equal(
    clientDomainFrom({ brand: "Forbes", links: ["https://forbes.com/other"], publications }),
    null,
    "a link back to a publication is never the client",
  );
});

/**
 * R140 part 4: a typed client domain is checked against the 30-day ceiling on
 * blur, through the same function and sentence the run route uses, and the
 * route that answers it spends nothing and reads no address.
 */
test("domain route: the run route's ceiling, said on blur, spending nothing", () => {
  const route = readFileSync(join(import.meta.dirname, "../../app/api/coverage-check/domain/route.ts"), "utf8");
  assert.match(route, /recentReadingRefusal\(domain\)/, "the domain route asks the shared ceiling");
  assert.match(route, /normalizeDomain\(/, "the domain is normalised as the run route normalises it");
  for (const spend of ["readPieces(", "readCoverage(", "runScan(", "startBenchmark(", "clientIp(", "recordModelCallDebit("]) {
    assert.ok(!route.includes(spend), `the domain route must not call ${spend}`);
  }
  const ceiling = readFileSync(join(import.meta.dirname, "domain-ceiling.ts"), "utf8");
  assert.match(ceiling, /return recentReadingLine\(domain\)/, "the refusal and the fixture share one sentence");
  const form = readFileSync(join(import.meta.dirname, "../../components/coverage/CoverageForm.tsx"), "utf8");
  assert.match(form, /onBlur=\{\(\) => void checkDomain\(domain\)\}/, "the client domain field asks on blur");
  assert.match(form, /"\/api\/coverage-check\/domain"/);
  assert.match(form, /json\.error === "domain_recently_read"/, "the run route's refusal lands under the field too");
});
