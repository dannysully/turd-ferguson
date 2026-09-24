import { after } from "next/server";

import { BenchmarkStoreError, startBenchmark } from "@/lib/coverage/campaign";
import { COVERAGE_LIMITS } from "@/config/contact";
import { MAX_COVERAGE_BYTES, MAX_COVERAGE_ROWS, MAX_COVERAGE_URLS, parseCoverageCsv } from "@/lib/coverage/csv";
import { agencyPrompts, MAX_AGENCY_PROMPTS } from "@/lib/coverage/prompts";
import { checkCeilings } from "@/lib/scan/ceilings";
import { isMarket, isPlausibleDomain, normalizeDomain } from "@/lib/scan/domain";
import { clientIp, hashIp } from "@/lib/scan/ip";
import { runScan } from "@/lib/scan/pipeline";
import { getSettings } from "@/lib/scan/settings";
import { verifyTurnstile } from "@/lib/scan/turnstile";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Start a campaign benchmark.
 *
 * Deliberately shaped like /api/scan/start, because it is the same thing: bot
 * filter, validate, the ceilings, then a row and a pass in `after()`. What it
 * does not do is read the domain cache. A free scan returning a completed run
 * for the same domain is an optimisation; a benchmark doing it would return a
 * reading taken on another day, under somebody else's campaign topic, and call
 * it today's starting line. The whole product is the date on the reading.
 *
 * There is no email field, and that is proposal 6 rather than an omission. An
 * address is taken when the thing behind it can send, together with its line in
 * the privacy policy. The reading opens on its own link instead, which needs
 * nothing from the visitor.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * The response is sent as soon as the reading is queued; the pass itself
 * continues in after(), so this ceiling covers the whole pipeline rather than
 * the round trip. Same figure and same reason as the confirm route.
 */
export const maxDuration = 300;

/**
 * How long a domain's free reading lasts before another may be started.
 *
 * Thirty days because that is the shape of the thing being measured: a
 * campaign lands, the engines take time to pick it up, and a second free
 * reading a week later measures the lag rather than the campaign. Named here
 * rather than typed into the sentence that refuses, so the number the visitor
 * reads and the number enforced cannot come apart.
 */
const FREE_RUN_DAYS = 30;

function fail(status: number, code: string, message: string) {
  return Response.json({ error: code, message }, { status });
}

/** Trim, collapse whitespace, and bound. Returns null when it is not usable. */
function text(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const tidy = value.replace(/\s+/g, " ").trim();
  if (tidy.length < min || tidy.length > max) return null;
  return tidy;
}

export async function POST(req: Request) {
  let body: {
    brand?: unknown;
    domain?: unknown;
    topic?: unknown;
    segment?: unknown;
    market?: unknown;
    coverageCsv?: unknown;
    coverageLinks?: unknown;
    coveragePrompts?: unknown;
    turnstileToken?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request", "Send a JSON body with the campaign.");
  }

  const ip = clientIp(req);

  // Bot filter first: everything below this line costs money or database work.
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : undefined;
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return fail(403, "turnstile_failed", "We could not verify that request. Please reload and try again.");
  }

  const brand = text(body.brand, COVERAGE_LIMITS.brand.min, COVERAGE_LIMITS.brand.max);
  if (!brand) return fail(400, "bad_brand", "Tell us the brand name.");

  const domain = normalizeDomain(typeof body.domain === "string" ? body.domain : "");
  if (!isPlausibleDomain(domain)) {
    return fail(400, "bad_domain", "That does not look like a website address. Try example.com.");
  }

  const topic = text(body.topic, COVERAGE_LIMITS.topic.min, COVERAGE_LIMITS.topic.max);
  if (!topic) {
    return fail(400, "bad_topic", "Tell us what the campaign is about, in a few words.");
  }

  /**
   * Optional, and an unusable segment becomes null rather than an error. The
   * template already handles its absence - the category question asks the
   * broader form, which is a worse question but still a real one - so refusing
   * the whole submission over an optional field would cost the visitor a
   * benchmark to save them a slightly weaker one.
   */
  const segment = text(body.segment, COVERAGE_LIMITS.segment.min, COVERAGE_LIMITS.segment.max);

  const market = isMarket(body.market) ? body.market : "UK";

  /**
   * The coverage list, parsed before anything is inserted.
   *
   * Bounded by bytes before it is bounded by rows, because the row ceiling is
   * only knowable after parsing and the parse itself is the work an unbounded
   * body would make us do.
   */
  /**
   * The pasted block and the uploaded file are two fields and are bounded
   * differently, because they are two different things.
   *
   * A paste is somebody typing into a textarea, so it is bounded by the same
   * constant the textarea is - `input-bounds.test.mts` holds those two in
   * agreement, and a bound carried only by a `maxLength` is one a post that
   * never rendered the form walks straight past. A file is a file, and is
   * bounded by bytes.
   *
   * They are concatenated after both have passed, and parsed once.
   */
  const links = typeof body.coverageLinks === "string" ? body.coverageLinks : "";
  if (links.length > COVERAGE_LIMITS.links.max) {
    return fail(413, "links_too_long", "That is more coverage than we take here. Upload it as a file instead.");
  }

  const file = typeof body.coverageCsv === "string" ? body.coverageCsv : "";
  const csv = [links, file].filter((t) => t.trim()).join("\n");
  if (Buffer.byteLength(file, "utf8") > MAX_COVERAGE_BYTES) {
    return fail(
      413,
      "coverage_too_large",
      `That file is larger than we accept. Send up to ${MAX_COVERAGE_ROWS} URLs.`,
    );
  }
  const parsed = parseCoverageCsv(csv);
  /**
   * Capped at what the reading reports on, and the excess is dropped here
   * rather than stored.
   *
   * Storing rows the page will never show would be storing somebody's coverage
   * list for nothing, and the per-piece table is the finding now - a row that
   * is inserted and never reported on is a promise the reading does not keep.
   * The form tells them the same number before they submit, off the same
   * parser, so this is a bound rather than a surprise.
   */
  const coverage = { ...parsed, rows: parsed.rows.slice(0, MAX_COVERAGE_URLS) };

  /**
   * The agency's own questions, when they sent any.
   *
   * Bounded and de-duplicated by `agencyPrompts`, which also drops blank
   * lines, so an array of empty strings arrives here as no prompts at all and
   * falls through to the fixed template - the same outcome as sending none.
   */
  const promptText = typeof body.coveragePrompts === "string" ? body.coveragePrompts : "";
  if (promptText.length > COVERAGE_LIMITS.prompts.max) {
    return fail(413, "prompts_too_long", `Keep it to ${MAX_AGENCY_PROMPTS} prompts, one per line.`);
  }
  const prompts = agencyPrompts(promptText.split(/\r\n|\r|\n/));

  /**
   * One free reading per domain in 30 days.
   *
   * Beside the IP ceiling rather than instead of it: that one is about what a
   * caller may spend, and this is about what a domain may have. They catch
   * different abuse - the same agency running the same client's domain from
   * four offices is nothing the IP ceiling sees - and a benchmark is a dated
   * starting line, so a second one a week later is not a second measurement of
   * anything, it is the same measurement billed twice.
   *
   * A re-run is the supported way to take another reading, and it goes through
   * `/api/coverage-check/[token]/rerun` against the campaign that already
   * exists. That path is untouched by this: re-reading a campaign you hold the
   * token for is the feature, and starting a fresh one for the same domain is
   * what this refuses.
   */
  const db = supabaseAdmin();
  const domainSince = new Date(Date.now() - FREE_RUN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: recent, error: recentErr } = await db
    .from("campaigns")
    .select("created_at")
    .eq("domain", domain)
    .gte("created_at", domainSince)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentErr) {
    // The read failing is ours, not theirs. Refusing a benchmark because our
    // own ceiling query broke would be charging the visitor for our outage, so
    // this logs and lets them through - the IP ceiling below is still standing.
    console.warn("[coverage] could not check the per-domain ceiling: " + recentErr.message);
  } else if (recent) {
    return fail(
      429,
      "domain_recently_read",
      `We have already taken a free reading for ${domain} in the last ${FREE_RUN_DAYS} days. ` +
        "Open that reading's link to run it again, or get in touch and we will take another.",
    );
  }

  const settings = await getSettings();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const refusal = await checkCeilings({
    settings,
    since,
    ipHash: hashIp(ip),
    countCampaigns: true,
    subject: "benchmark",
  });
  if (refusal) return fail(refusal.http, refusal.code, refusal.message);

  let started;
  try {
    started = await startBenchmark({
      brand,
      domain,
      topic,
      segment,
      market,
      ipHash: hashIp(ip),
      // The scan's own free set, frozen onto the reading exactly as a free scan
      // freezes it, so a settings change mid-run cannot leave a reading
      // claiming engines it never read.
      engines: settings.scan_engines_free,
      coverage: coverage.rows,
      // Undefined rather than an empty array, so `addReading` falls through to
      // the template instead of inserting a reading with no questions on it.
      prompts: prompts.length ? prompts : undefined,
    });
  } catch (err) {
    // Named by step in the log and generic on screen. Which of the four writes
    // failed is what whoever reads the log needs; it tells the visitor nothing
    // they can act on.
    const step = err instanceof BenchmarkStoreError ? err.step : "unknown";
    console.error(
      `[coverage] could not start a benchmark for ${domain} (${market}) at the ${step} step: ` +
        (err instanceof Error ? err.message : String(err)),
    );
    return fail(500, "store_failed", "We could not start that benchmark. Please try again.");
  }

  after(async () => {
    console.log(
      `[coverage] benchmark ${started.token} started for ${domain} (${market}): ` +
        `${settings.scan_engines_free.join(",")}, ${started.coverageStored} placement(s) uploaded`,
    );
    await runScan(started.scanId);
  });

  return Response.json({
    token: started.token,
    /**
     * Reported back so the form can say what was read out of the file before
     * the reading itself exists. A visitor who uploaded sixty rows and had
     * eleven read needs to know now, not after the pass finishes.
     */
    coverage: {
      stored: started.coverageStored,
      skipped: coverage.skipped,
      truncated: coverage.truncated,
    },
  });
}
