import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

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
 * The paid set is DERIVED, not typed here - a list of paid routes in a test is
 * the fixed-rung-against-a-growing-list species this repo keeps finding. A
 * route is paid if it calls `checkCeilings` (every pass that costs DataForSEO
 * or Anthropic goes through it) or `completeUnlock` (which starts the gated
 * pass in `after()`). A new paid route joins this sweep by calling either.
 */

const API = join(import.meta.dirname, ".");

/** The two doors everything that spends money goes through. */
const SPEND = ["checkCeilings", "completeUnlock"];

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

type Route = { name: string; src: string };

function routes(): Route[] {
  const out = execFileSync("git", ["ls-files", "src/app/api"], { encoding: "utf8" })
    .split("\n")
    .filter((f) => f.endsWith("/route.ts"));

  return out.map((f) => ({
    name: f.replace(/^src\/app\/api\//, "").replace(/\/route\.ts$/, ""),
    src: readFileSync(f, "utf8"),
  }));
}

/** Strip comments, so a route that only *mentions* a spend door is not counted. */
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

  const paid = all.filter((r) => SPEND.some((door) => code(r.src).includes(door + "(")));

  // Counter-guard: if the doors were renamed, `paid` empties and every
  // assertion below passes while checking nothing at all.
  assert.ok(
    paid.length >= 4,
    `only ${paid.length} paid routes detected via ${SPEND.join("/")} - the spend doors have been ` +
      `renamed and this sweep is now blind. Update SPEND.`,
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
