/**
 * Fixture-backed adapter. Reads the raw DataForSEO responses saved under
 * /fixtures and maps them through the shared mapper.
 *
 * Every state the UI must render is reachable from the browser by typing a
 * sentinel domain, so Phase 2 can be reviewed before the live API exists:
 *
 *   nomadadigital.co.uk   real Nomada data (also the "brand not in sources" case)
 *   nobrand.test          startScan returns brand: null -> "What is the brand called?"
 *   unreachable.test      ScanError("unreachable")
 *   ratelimit.test        ScanError("rate_limited")
 *   down.test             ScanError("api_down")
 *   anything else         empty result - we have no data for that domain
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Market, RunScanResponse, ScanAdapter, SignUpResponse, StartScanResponse } from "./contract";
import { ScanError } from "./contract";
import { buildRunResult, mapHistory, mapLeaderboard, mapSources, normalizeDomain } from "./mapper";

const FIXTURE_DIR = join(process.cwd(), "fixtures", "dataforseo");

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf8")) as T;
}

const NOMADA = new Set(["nomadadigital.co.uk", "nomadadigital.com"]);

/* The scan_id carries what startScan learned. Stateless on purpose: on
   serverless hosting startScan and runScan can land on different instances,
   so an in-memory map would lose the session between steps. */
type Session = { domain: string; brand: string | null };
const encode = (s: Session) => "fx_" + Buffer.from(JSON.stringify(s)).toString("base64url");
const decode = (id: string): Session | null => {
  if (!id.startsWith("fx_")) return null;
  try { return JSON.parse(Buffer.from(id.slice(3), "base64url").toString("utf8")); } catch { return null; }
};

function raiseSentinel(domain: string) {
  if (domain === "unreachable.test") throw new ScanError("unreachable", `Could not load ${domain}`);
  if (domain === "ratelimit.test") throw new ScanError("rate_limited", "Five checks this hour");
  if (domain === "down.test") throw new ScanError("api_down", "Fixture API down");
}

export const fixtureAdapter: ScanAdapter = {
  source: "fixture",
  async startScan({ domain }): Promise<StartScanResponse> {
    const host = normalizeDomain(domain);
    raiseSentinel(host);

    let brand: string | null;
    let suggested_topic: string | null;

    if (NOMADA.has(host)) {
      brand = "Nomada Digital";
      suggested_topic = "b2b seo agency";
    } else if (host === "nobrand.test") {
      brand = null;
      suggested_topic = null;
    } else {
      /* Derived from the domain string, not read from the site */
      const stem = host.split(".")[0] ?? host;
      brand = stem.split(/[-_]/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || null;
      suggested_topic = null;
    }

    const scan_id = encode({ domain: host, brand });
    return { scan_id, brand, suggested_topic, markets: ["UK", "US"] };
  },

  async runScan({ scan_id, topic, market }): Promise<RunScanResponse> {
    const session = decode(scan_id);
    if (!session) throw new ScanError("api_down", "Unknown scan_id");
    raiseSentinel(session.domain);

    const meta = load<{ generated_at: string }>("meta.json");
    const brandName = session.brand ?? session.domain;

    if (!NOMADA.has(session.domain)) {
      /* No fixture for this domain. Empty, honestly. */
      return buildRunResult({
        scan_id, brandName, brandDomain: session.domain, topic, market: market as Market,
        read_at: meta.generated_at, history: [], sources: [], leaderboard: [], gated: true,
      });
    }

    return buildRunResult({
      scan_id,
      brandName,
      brandDomain: session.domain,
      topic,
      market: market as Market,
      read_at: meta.generated_at,
      history: mapHistory(load("llm_mentions_historical.json")),
      sources: mapSources(load("top_mentioned_domains_lite.json")),
      leaderboard: mapLeaderboard(load("top_mentioned_brands_lite.json")),
      gated: true,
    });
  },

  async signUp({ scan_id }): Promise<SignUpResponse> {
    if (!decode(scan_id)) throw new ScanError("api_down", "Unknown scan_id");
    return { ok: true };
  },
};
