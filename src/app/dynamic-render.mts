import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";


/**
 * Renders the routes `next build` does not prerender, so the sweeps can see
 * them.
 *
 * Every sweep in this tree walks `.next/server/app` for `*.html`. That set is
 * the *statically prerendered* pages, not the site: a route marked `ƒ` in the
 * build output has no file there at all. So `/blog` served the motion script
 * and `data-motion="on"` with zero motion classes for as long as it has
 * existed, and the motion census, the rows-inside-rows test, the tier-lockup
 * sweep and the href/h1/title/canonical/og sweeps all reported themselves
 * clear over a set that did not contain it. Every "all 22 pages" claim in the
 * worklog is true and narrower than it reads.
 *
 * The fix is not a list of dynamic routes typed here. That is this repo's own
 * defect species - a fixed rung against a list that can grow - and it would go
 * stale the first time somebody adds a route that reads `searchParams`. So the
 * unswept set is *derived*: every app page route in the build manifest that
 * did not get an `.html`. A new dynamic route joins the sweeps by existing.
 *
 * What still has to be declared is what a route needs in order to render at
 * all - a concrete value for a `[token]` segment, or the admission that it
 * needs a database this machine does not have. `STATES` holds that, and a
 * route missing from it is a hard failure rather than a silent omission.
 */

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..");
const BUILD = join(ROOT, ".next");
const PRERENDER = join(BUILD, "server", "app");

/** Where captured HTML lands. Inside `.next`, so it dies with the build. */
export const CAPTURE = join(BUILD, "dynamic");
export const CAPTURE_MANIFEST = join(CAPTURE, "captured.json");

export type Capture = {
  /** The URL rendered, which is also the label the sweeps report. */
  url: string;
  /** The app route it came from, as the build manifest names it. */
  route: string;
  status: number;
  /** The file under `CAPTURE`, or null when nothing renderable came back. */
  file: string | null;
  /** Why there is no file. Present only when `file` is null. */
  blocked?: string;
};

// ---------------------------------------------------------------- the set

/** `/about` -> `about.html`, `/` -> `index.html`. How Next names a prerender. */
function prerenderPath(route: string): string {
  const rel = route === "/" ? "index" : route.replace(/^\//, "");
  return join(PRERENDER, rel + ".html");
}

/**
 * Every page route in the build that has no prerendered HTML.
 *
 * Read from `app-path-routes-manifest.json` rather than by walking `src/app`,
 * because the manifest is what the build actually produced - a page excluded
 * by config would still be a file on disk.
 */
export function unsweptRoutes(): string[] {
  const manifest = JSON.parse(
    readFileSync(join(BUILD, "app-path-routes-manifest.json"), "utf8"),
  ) as Record<string, string>;

  return Object.entries(manifest)
    .filter(([key]) => key.endsWith("/page"))
    .map(([, route]) => route)
    // An API route renders no HTML and is not a page. `/page` already excludes
    // them (they end `/route`), but say so rather than lean on it.
    .filter((route) => !route.startsWith("/api/"))
    .filter((route) => !existsSync(prerenderPath(route)))
    .sort();
}

// ------------------------------------------------------------- the states

/**
 * What each dynamic route needs in order to render, and what to do when it
 * cannot.
 *
 * `urls` is the list of distinct rendered states worth sweeping - a route that
 * branches on `searchParams` is more than one page. An empty `urls` with a
 * `blocked` reason is a route this machine genuinely cannot render; it is
 * recorded in the manifest so it stays *visible* as a gap rather than being
 * quietly absent, which is how this whole class of blindness started.
 *
 * Deliberately not here: writing a 404 or a 401 body out as if it were the
 * page. A sweep walking `_not-found` markup under the name `/scan/[token]`
 * would report that route cleared while having read nothing of it - the same
 * false clear, one layer down.
 *
 * `discover` reads more states off the page once it has rendered. The filter
 * pills on `/blog` are one per post kind, so a new kind is a new state of that
 * page - and a list of kinds typed here would go stale the day somebody adds
 * one. Reading the rendered pills instead means the set follows the site.
 * Importing `config/posts.ts` was the obvious alternative and does not work:
 * it reaches for `@/config/og`, and bare node has no path alias.
 */
export type State = {
  urls: string[];
  discover?: (html: string) => string[];
  blocked?: string;
};

/** Every distinct `?kind=` the rendered filter pills link to. */
function blogKindStates(html: string): string[] {
  const found = new Set<string>();
  for (const [, href] of html.matchAll(/href="(\/blog\?kind=[^"&]*)"/g)) {
    found.add(href.replace(/&amp;/g, "&"));
  }
  return [...found];
}

export const STATES: Record<string, State> = {
  // The writing index. `kind` filters it; an unknown kind falls back to the
  // unfiltered list, so that state is swept too.
  "/blog": {
    urls: ["/blog", "/blog?kind=nonsense"],
    discover: blogKindStates,
  },

  // The funnel's entry point, and the largest single thing that was unswept.
  // `verify` is the notice a broken verification link lands on; both branches
  // of the Map are states of this page and neither had ever been rendered
  // anywhere a sweep could read it. `constructor` is here because a previous
  // object-literal lookup answered 500 to it.
  "/scan": {
    urls: ["/scan", "/scan?domain=example.com", "/scan?verify=failed", "/scan?verify=invalid", "/scan?verify=constructor"],
  },

  "/scan/[token]": {
    urls: [],
    blocked:
      "needs a scans row: without a database the route 404s, and the not-found page is already swept under its own name",
  },
  "/coverage-check/[token]": {
    urls: [],
    blocked: "needs a campaign row and its token; 404s without a database",
  },
  "/admin/scans": {
    urls: [],
    blocked: "behind auth - answers 401 with 24 bytes and no HTML at all, and a credential is not ours to hold",
  },
};

// ------------------------------------------------------------ the capture

function fileFor(url: string): string {
  // One file per state, named so a human reading the directory can tell which
  // is which. Any character that is not safe in a filename becomes `_`.
  const slug = url.replace(/^\//, "").replace(/[^a-zA-Z0-9._-]+/g, "_") || "index";
  return slug + ".html";
}

export async function capture(port = 4311): Promise<Capture[]> {
  const unswept = unsweptRoutes();

  const undeclared = unswept.filter((route) => !(route in STATES));
  if (undeclared.length) {
    throw new Error(
      `These routes are dynamic and nothing says how to render them: ${undeclared.join(", ")}.\n` +
        `Add each to STATES in src/app/dynamic-render.mts - either the URLs that render it, or an ` +
        `empty list and the reason it cannot be rendered here. A dynamic route with no entry is ` +
        `invisible to every sweep in this tree, which is the defect this file exists to close.`,
    );
  }

  const { default: next } = await import("next");
  const app = next({ dev: false, dir: ROOT });
  await app.prepare();
  const handle = app.getRequestHandler();

  const server = createServer((req, res) => handle(req, res));
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", () => resolve()));

  rmSync(CAPTURE, { recursive: true, force: true });
  mkdirSync(CAPTURE, { recursive: true });

  const captured: Capture[] = [];
  try {
    for (const route of unswept) {
      const { urls, blocked, discover } = STATES[route]!;

      if (!urls.length) {
        // Rendered anyway, so the claim in `blocked` is measured rather than
        // remembered. A route that starts answering 200 has become sweepable
        // and must not stay on this list.
        const res = await fetch(`http://127.0.0.1:${port}${route.replace(/\[[^\]]+\]/g, "probe")}`);
        await res.text();
        if (res.status === 200) {
          throw new Error(
            `${route} is recorded as unrenderable ("${blocked}") but answered 200. It can be swept ` +
              `now - give it real URLs in STATES.`,
          );
        }
        captured.push({ url: route, route, status: res.status, file: null, blocked });
        continue;
      }

      // A queue rather than a loop over `urls`, so a state `discover` finds in
      // the markup is rendered on the same pass.
      const queue = [...urls];
      const seen = new Set<string>();
      let discovered = false;

      while (queue.length) {
        const url = queue.shift()!;
        if (seen.has(url)) continue;
        seen.add(url);

        const res = await fetch("http://127.0.0.1:" + port + url);
        const html = await res.text();
        if (res.status !== 200) {
          throw new Error(
            `${url} answered ${res.status}. A declared state of a shipped route must render; ` +
              `either fix the route or move it to a blocked entry with the reason.`,
          );
        }

        // Only off the first state. The pills are the same on every one of
        // them, and re-reading them each time only re-walks what `seen` drops.
        if (!discovered && discover) {
          discovered = true;
          queue.push(...discover(html));
        }

        const file = fileFor(url);
        writeFileSync(join(CAPTURE, file), html, "utf8");
        captured.push({ url, route, status: res.status, file });
      }
    }
  } finally {
    server.close();
    await app.close?.();
  }

  writeFileSync(CAPTURE_MANIFEST, JSON.stringify(captured, null, 2) + "\n", "utf8");
  return captured;
}

// -------------------------------------------------------------- the reader

export type Page = { page: string; html: string };

/** The prerendered pages, exactly as every sweep here has always read them. */
export function prerenderedPages(): Page[] {
  const out: Page[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) {
        out.push({ page: relative(PRERENDER, full).split(sep).join("/"), html: readFileSync(full, "utf8") });
      }
    }
  };
  walk(PRERENDER);
  return out;
}

/** The captured dynamic states, labelled by URL so a failure names the state. */
export function capturedPages(): Page[] {
  if (!existsSync(CAPTURE_MANIFEST)) return [];
  const manifest = JSON.parse(readFileSync(CAPTURE_MANIFEST, "utf8")) as Capture[];
  return manifest
    .filter((c) => c.file)
    .map((c) => ({ page: c.url, html: readFileSync(join(CAPTURE, c.file!), "utf8") }));
}

/**
 * Every page a sweep should read: the prerender plus whatever `capture()` got.
 *
 * Callers check `existsSync(PRERENDER)` and skip when there is no build. They
 * do NOT skip on a missing capture - an absent capture silently narrows the
 * sweep back to where it started, so `dynamic-render.test.mts` fails on it
 * instead, in one place, with the command to fix it.
 */
export function sweptPages(): Page[] {
  return [...prerenderedPages(), ...capturedPages()];
}

export const BUILD_DIR = BUILD;
export const PRERENDER_DIR = PRERENDER;

// Run as a script: `node src/app/dynamic-render.mts`.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const captured = await capture();
  for (const c of captured) {
    console.log(
      c.file
        ? `  rendered  ${c.url}  ->  ${c.file}`
        : `  BLOCKED   ${c.url}  (${c.status})  ${c.blocked}`,
    );
  }
  const n = captured.filter((c) => c.file).length;
  console.log(`\n${n} dynamic states captured, ${captured.length - n} route(s) blocked.`);
  process.exit(0);
}
