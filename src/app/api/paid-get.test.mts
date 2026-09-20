import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { apiRoutes, missingEntryPoints, spendingRoutes } from "./spenders.mts";

/**
 * A route that spends money must not answer GET.
 *
 * Asked by the 20 Sep design review, which had just seen `/scan` in a browser
 * for the first time and noticed that `robots.txt` closes `/scan/` but not
 * `/scan?domain=...` - robots matching is literal prefix, and after `/scan`
 * comes `?`, not `/`. GPTBot, Googlebot and Bingbot are all `Allow: /` on that
 * path. So: if a GET with a query string could start a pass, every crawler
 * that follows one spends a scan.
 *
 * It cannot, for three independent reasons, and this test freezes the one that
 * is cheapest to break by accident. `/scan` is a server component that passes
 * `domain` into a `useState` initial value; there is no `useEffect` anywhere in
 * `HeroSection`, `LiveScanChecker` or `RequestScanForm`, so nothing runs on
 * mount; and the fetch to `/api/scan/start` sits inside a submit handler
 * against a POST-only route. A crawler issues GETs and does not submit forms.
 *
 * The third is the one worth a tripwire, because a route gains a method in one
 * line and nothing else in the tree would notice.
 *
 * ## The denominator was derived off the wrong thing, and it moved out
 *
 * This file used to say: "The paid set is DERIVED, not typed here - a list of
 * paid routes in a test is the fixed-rung-against-a-growing-list species this
 * repo keeps finding. A route is paid if it calls `checkCeilings` or
 * `completeUnlock`." It was derived, and it was still wrong, which is the
 * sharper lesson: **those two names are the GUARDS, not the spend.** A route
 * bounded by something else entirely is a route that spends and calls
 * neither.
 *
 * Measured 20 September 2026: it saw **five of the eight** routes that can
 * cause a paid call. The three outside it were `scan/[token]/confirm`, which
 * runs the entire free pass and is bounded by a compare-and-swap;
 * `scan/[token]/questions`, bounded by a per-scan reservation; and
 * `scan/[token]/resend`, which bills Resend and was in no sweep's list at all.
 * All three are POST-only today, so nothing was served wrong - but the rule
 * this file states was being enforced on five eighths of its own subject, and
 * a `GET` added to the confirm route is precisely the crawler-spends-a-scan
 * scenario it exists for, passing green.
 *
 * `spend-gates.test.mts` had already censused the true set two files away, off
 * a denominator of its own that was blind somewhere else. Two copies of one
 * denominator, so the set now lives in `spenders.mts` and both import it.
 * That file's header carries the whole measurement; do not re-derive it here.
 */

const API = join(import.meta.dirname, ".");

/**
 * The one paid route that is a GET, and why that is right rather than an
 * oversight.
 *
 * It is the link in a verification email, so it cannot be anything but a GET.
 * What makes that safe is not the method: mail-security scanners fetch links
 * on delivery, so this URL genuinely is fetched by a machine before its owner
 * clicks it. The route answers that with a compare-and-swap - the UPDATE
 * itself is the arbiter of who verified first - plus a token nobody can guess
 * and a `robots.txt` that closes `/api/` to every named agent.
 *
 * The exemption is re-earned below rather than trusted. If the compare-and-swap
 * goes, this stops being a safe GET and the test says so.
 */
const EMAIL_LINK = "verify/[vtoken]";
const COMPARE_AND_SWAP = '.is("verified_at", null)';

const ROOT = join(import.meta.dirname, "..", "..", "..");

/**
 * Deliberately not `git ls-files`, which is what this walked before.
 *
 * `npm run check` runs before `git add`, so a route file that exists and is
 * not yet staged is invisible to that listing - and a brand new paid route is
 * exactly the thing most likely to be both unstaged and wrong. `apiRoutes`
 * walks the filesystem. This repo has the rule written down; this file was
 * breaking it.
 */
const routes = () => apiRoutes(ROOT);

/**
 * Strip comments, so a route that only *mentions* a spend door is not counted.
 *
 * Kept local rather than taken from `spenders.mts`, whose cut is not identical.
 * A stripper that differs in one case blinds the sweep that depended on that
 * case, and `methodsOf` and the compare-and-swap check below were both proved
 * against this one.
 */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join("\n");
}

const methodsOf = (src: string) =>
  [...code(src).matchAll(/export\s+async\s+function\s+([A-Z]+)\s*\(/g)].map((m) => m[1]!);

test("every route that spends money refuses GET, except the email link", () => {
  const all = routes();

  // The sweep must be looking at something. A `git ls-files` that stopped
  // matching and a site with no API routes read identically.
  assert.ok(all.length > 10, `only ${all.length} API routes found - the file walk has drifted`);

  const paid = spendingRoutes(ROOT);

  // Counter-guard: if the entry points were renamed, `paid` empties and every
  // assertion below passes while checking nothing at all. The floor is 8 and
  // not 4 because the set is now the measured one - see `spenders.mts`.
  assert.ok(
    paid.length >= 8,
    `only ${paid.length} paid routes detected - the spend walk in spenders.mts has gone blind: ` +
      paid.map((r) => r.name).join(", "),
  );
  assert.deepEqual(
    missingEntryPoints(ROOT),
    [],
    "a paid entry point was renamed, so the set this rule runs over is short by however many " +
      "routes reached money through it",
  );

  const gettable = paid.filter((r) => methodsOf(r.src).includes("GET"));

  assert.deepEqual(
    gettable.map((r) => r.name),
    [EMAIL_LINK],
    `These routes spend money and answer GET, so any crawler that follows a link to one pays for ` +
      `it:\n${gettable.map((r) => "  " + r.name).join("\n")}\n` +
      `A pass must start on a POST. If one of these genuinely has to be a GET, it needs what ` +
      `${EMAIL_LINK} has - an unguessable token and a compare-and-swap - and an entry here saying so.`,
  );

  // Earn the exemption rather than assert it.
  const emailLink = paid.find((r) => r.name === EMAIL_LINK);
  assert.ok(emailLink, `${EMAIL_LINK} is not in the paid set - the exemption below is unearned`);
  // Against `code()`, not the raw source. This route explains its own
  // compare-and-swap in a comment directly above it, so a raw `includes` is
  // satisfied by the explanation after the code it describes has gone - the
  // tripwire would be held up by its own documentation.
  assert.ok(
    code(emailLink.src).includes(COMPARE_AND_SWAP),
    `${EMAIL_LINK} is a GET that spends, and the compare-and-swap that makes that safe ` +
      `(${COMPARE_AND_SWAP}) is gone. A mail scanner's prefetch and the recipient's click now ` +
      `both unlock: two report emails and two attempts at the gated pass.`,
  );
});

test("robots.txt closes /api/ to every agent it names", () => {
  const src = readFileSync(join(import.meta.dirname, "..", "robots.ts"), "utf8");

  // Belt to the POST rule's braces. Even a paid GET should not be advertised.
  assert.match(src, /const CLOSED = \[[^\]]*"\/api\/"/, "robots.ts no longer disallows /api/");
});
