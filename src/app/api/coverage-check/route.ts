import { after } from "next/server";

import { BenchmarkStoreError, startBenchmark } from "@/lib/coverage/campaign";
import { COVERAGE_LIMITS } from "@/config/contact";
import { MAX_COVERAGE_BYTES, MAX_COVERAGE_ROWS, parseCoverageCsv } from "@/lib/coverage/csv";
import { checkCeilings } from "@/lib/scan/ceilings";
import { isMarket, isPlausibleDomain, normalizeDomain } from "@/lib/scan/domain";
import { clientIp, hashIp } from "@/lib/scan/ip";
import { runScan } from "@/lib/scan/pipeline";
import { getSettings } from "@/lib/scan/settings";
import { verifyTurnstile } from "@/lib/scan/turnstile";

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
  const csv = typeof body.coverageCsv === "string" ? body.coverageCsv : "";
  if (Buffer.byteLength(csv, "utf8") > MAX_COVERAGE_BYTES) {
    return fail(
      413,
      "coverage_too_large",
      `That file is larger than we accept. Send up to ${MAX_COVERAGE_ROWS} URLs.`,
    );
  }
  const coverage = parseCoverageCsv(csv);

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
