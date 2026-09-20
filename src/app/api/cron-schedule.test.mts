import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * `vercel.json`, which nothing here had ever read.
 *
 * It is the third document on this site served to somebody that is not a page,
 * after `/sitemap.xml` and `/robots.txt`, and it has the same shape as the
 * first: **a hand-maintained list of paths against a route set that can
 * change.** That is this repo's declared defect species, and the failure is
 * silent in both directions.
 *
 *   A path in `crons` that no longer resolves - a route renamed or deleted -
 *   means Vercel calls a 404 every night at 03:30 and nothing goes red. The
 *   purge simply stops happening, and the one signal anybody watches is a
 *   scheduled job that "ran".
 *
 *   A route under `/api/cron/` that is *not* in `crons` is a job nobody
 *   invokes. It typechecks, it is covered by its own tests, and it never runs.
 *
 * Both directions are checked here against the build manifest, so a renamed
 * route fails the push rather than the night.
 *
 * The third check is the one with teeth. `purge-responses` clears
 * `response_text`, which by its own comment "cannot be fetched again", and it
 * answers a **GET**. The two routes that exist authenticate correctly today -
 * constant-time bearer against `CRON_SECRET`, 503 when the variable is unset,
 * both read on 20 Sep. Nothing enforces that on the third one somebody adds.
 * A cron route that forgets the check is a destructive endpoint on the public
 * internet answering an unauthenticated GET, and `paid-get.test.mts` does not
 * cover it - a purge spends no money, so it is not in the paid set.
 */

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const BUILD = join(ROOT, ".next");
const CRON_DIR = join(ROOT, "src", "app", "api", "cron");

// ------------------------------------------------------------- the probes

export type Cron = { path: string; schedule: string };

/** The scheduled jobs the platform is told to call. */
export function declaredCrons(json: string): Cron[] {
  const parsed = JSON.parse(json) as { crons?: Cron[] };
  return parsed.crons ?? [];
}

/** Every `/api/cron/*` route that exists, as the build manifest names it. */
export function cronRoutes(manifest: string): string[] {
  const parsed = JSON.parse(manifest) as Record<string, string>;
  return Object.values(parsed)
    .filter((route) => route.startsWith("/api/cron/"))
    .sort();
}

/**
 * A five-field cron expression, which is what Vercel accepts.
 *
 * Deliberately shallow: this catches a field count that is wrong and a stray
 * character, not every invalid range. A six-field expression with seconds is
 * the mistake worth catching, because it is what every other cron dialect
 * uses and it is accepted nowhere on this platform.
 */
export function validSchedule(schedule: string): boolean {
  const fields = schedule.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  return fields.every((f) => /^[-0-9*,/]+$/.test(f));
}

/**
 * What is missing from one cron route's defences, as a list of sentences.
 *
 * Split out from the sweep so it can be fired at injected source rather than
 * only at the two routes that are already correct. A sweep that has only ever
 * seen passing input is the "tripwire that passes because it is blind" this
 * repo has now been bitten by three times.
 */
export function authWeaknesses(route: string, src: string): string[] {
  const out: string[] = [];
  // Fails shut with no secret configured, rather than running the job.
  if (!/CRON_SECRET/.test(src) || !/status:\s*503/.test(src)) {
    out.push(`  ${route}  does not refuse when CRON_SECRET is unset`);
  }
  // Compares the bearer in constant time, like the admin proxy and the other
  // cron route. The point is less the timing than that one codebase should
  // not hold two secret comparisons that look different - that is how the
  // weaker one survives a reading.
  if (!/constantTimeEqual\(\s*(offered|[^)]*authorization)/.test(src)) {
    out.push(`  ${route}  does not compare its bearer token with constantTimeEqual`);
  }
  if (!/status:\s*401/.test(src)) {
    out.push(`  ${route}  has no 401 branch`);
  }
  return out;
}

/** Every route file under `src/app/api/cron`, with its source. */
function cronSources(dir = CRON_DIR): { route: string; src: string }[] {
  const out: { route: string; src: string }[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") {
        const rel = relative(CRON_DIR, full).split(sep).slice(0, -1).join("/");
        out.push({ route: "/api/cron/" + rel, src: readFileSync(full, "utf8") });
      }
    }
  };
  walk(dir);
  return out.sort((a, b) => a.route.localeCompare(b.route));
}

// -------------------------------------------------------------- the guards

test("the cron probes fire on the shapes that are wrong", () => {
  assert.deepEqual(declaredCrons('{"crons":[{"path":"/api/cron/x","schedule":"0 3 * * *"}]}'), [
    { path: "/api/cron/x", schedule: "0 3 * * *" },
  ]);
  assert.deepEqual(declaredCrons("{}"), [], "no crons key is no crons, not a crash");

  assert.deepEqual(
    cronRoutes('{"/api/cron/a/route":"/api/cron/a","/api/version/route":"/api/version"}'),
    ["/api/cron/a"],
    "only /api/cron routes are scheduled jobs",
  );

  assert.ok(validSchedule("30 3 * * *"));
  assert.ok(validSchedule("*/15 * * * 1-5"));
  // The mistake worth catching: six fields, which every other cron dialect
  // takes and this platform does not.
  assert.ok(!validSchedule("0 30 3 * * *"), "six fields is not a Vercel schedule");
  assert.ok(!validSchedule("30 3 * *"), "four fields is not a schedule either");
  assert.ok(!validSchedule("@daily"), "a macro is not a five-field expression");
});

test("the auth sweep fires at a cron route that forgot to check", () => {
  // The shape this exists to catch: a new scheduled job, written quickly,
  // that reads the body and does the work with no bearer check at all.
  assert.deepEqual(
    authWeaknesses("/api/cron/new-job", "export async function GET() { await purge(); }"),
    [
      "  /api/cron/new-job  does not refuse when CRON_SECRET is unset",
      "  /api/cron/new-job  does not compare its bearer token with constantTimeEqual",
      "  /api/cron/new-job  has no 401 branch",
    ],
  );

  // The subtler one: it checks, but with `===` rather than the shared helper,
  // so the codebase now holds two secret comparisons that do not look alike.
  const looseCompare =
    'const secret = process.env.CRON_SECRET;\n' +
    'if (!secret) return NextResponse.json({}, { status: 503 });\n' +
    'if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({}, { status: 401 });\n';
  assert.deepEqual(authWeaknesses("/api/cron/loose", looseCompare), [
    "  /api/cron/loose  does not compare its bearer token with constantTimeEqual",
  ]);

  // And the real routes must still come back clean through the same function,
  // so the narrowing above is real rather than a probe that matches nothing.
  assert.deepEqual(
    authWeaknesses(
      "/api/cron/correct",
      'const secret = process.env.CRON_SECRET;\n' +
        'if (!secret) return NextResponse.json({}, { status: 503 });\n' +
        'const offered = req.headers.get("authorization") ?? "";\n' +
        'if (!constantTimeEqual(offered, `Bearer ${secret}`)) return NextResponse.json({}, { status: 401 });\n',
    ),
    [],
  );
});

// --------------------------------------------------------- the real files

test("every scheduled path resolves, and every cron route is scheduled", (t) => {
  const manifestPath = join(BUILD, "app-path-routes-manifest.json");
  if (!existsSync(manifestPath)) {
    t.skip("no build to read - run `npm run build`");
    return;
  }

  const crons = declaredCrons(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  const routes = cronRoutes(readFileSync(manifestPath, "utf8"));

  // Counter-guards: an empty list on either side makes both comparisons below
  // pass while checking nothing.
  assert.ok(crons.length > 0, "no crons declared in vercel.json - the parser or the file has changed");
  assert.ok(routes.length > 0, "no /api/cron routes in the build - the manifest probe has drifted");

  const declared = crons.map((c) => c.path).sort();

  t.diagnostic(`${crons.length} scheduled: ${crons.map((c) => `${c.path} (${c.schedule})`).join(", ")}`);

  assert.deepEqual(
    declared.filter((p) => !routes.includes(p)),
    [],
    "vercel.json schedules these and no route answers them. The platform will call a 404 on " +
      "schedule and nothing will report it:\n" + declared.filter((p) => !routes.includes(p)).join("\n"),
  );

  assert.deepEqual(
    routes.filter((r) => !declared.includes(r)),
    [],
    "These cron routes exist and nothing invokes them. Add each to `crons` in vercel.json, or " +
      "delete the route:\n" + routes.filter((r) => !declared.includes(r)).join("\n"),
  );

  for (const { path, schedule } of crons) {
    assert.ok(validSchedule(schedule), `${path} has a schedule Vercel will not accept: "${schedule}"`);
  }
});

test("every cron route refuses an unauthenticated call", (t) => {
  const sources = cronSources();
  assert.ok(sources.length > 0, "no cron route sources found - the walker has drifted");

  t.diagnostic(`${sources.length} cron route(s): ${sources.map((s) => s.route).join(", ")}`);

  const weak = sources.flatMap(({ route, src }) => authWeaknesses(route, src));

  assert.deepEqual(
    weak,
    [],
    "A cron route answers a GET on the public internet and one of these clears data that cannot " +
      "be fetched again. Every one must fail shut with no secret and refuse a wrong bearer:\n" +
      weak.join("\n"),
  );
});
