/**
 * The example page's result, with a last-good fallback.
 *
 * refreshExample runs the adapter. On success the result is stored and
 * served. On failure the previous good result is served with its ORIGINAL
 * read_at - never today's date on stale data - and an alert fires. The page
 * never renders blank.
 *
 * Storage is a JSON file next to the fixtures. That is correct for local and
 * fixture mode. On serverless hosting the deployed filesystem is read-only, so
 * production needs this swapped for a KV or blob store - the interface stays.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RunScanResponse, ScanAdapter } from "./contract";
import { getScanAdapter } from "./index";

const LAST_GOOD = join(process.cwd(), "fixtures", "dataforseo", "example-last-good.json");

export const EXAMPLE = { domain: "nomadadigital.co.uk", topic: "b2b seo agency", market: "UK" as const };

export type RefreshOutcome = {
  ok: boolean;
  refreshed: boolean;
  result: RunScanResponse;
  error?: string;
};

function readLastGood(): RunScanResponse | null {
  if (!existsSync(LAST_GOOD)) return null;
  try { return JSON.parse(readFileSync(LAST_GOOD, "utf8")) as RunScanResponse; } catch { return null; }
}

function writeLastGood(r: RunScanResponse) {
  writeFileSync(LAST_GOOD, JSON.stringify(r, null, 2));
}

async function runOnce(adapter: ScanAdapter): Promise<RunScanResponse> {
  const start = await adapter.startScan({ domain: EXAMPLE.domain });
  return adapter.runScan({ scan_id: start.scan_id, topic: start.suggested_topic ?? EXAMPLE.topic, market: EXAMPLE.market });
}

/** Default alert: email if configured, otherwise the server log. */
async function defaultAlert(message: string) {
  console.error("[example] refresh failed:", message);
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    const { Resend } = await import("resend");
    await new Resend(key).emails.send({
      from: process.env.SCAN_FROM_EMAIL ?? "alwayscited <onboarding@resend.dev>",
      to: process.env.CONTACT_EMAIL_DESTINATION ?? "hello@alwayscited.com",
      subject: "alwayscited: /example refresh failed",
      text: `The weekly re-run of the example result failed. The last good result is still being served with its original read date.\n\n${message}`,
    });
  } catch (e) { console.error("[example] alert email failed", e); }
}

export async function refreshExample(opts: { adapter?: ScanAdapter; onAlert?: (msg: string) => void | Promise<void> } = {}): Promise<RefreshOutcome> {
  const adapter = opts.adapter ?? getScanAdapter();
  const alert = opts.onAlert ?? defaultAlert;
  const last = readLastGood();
  try {
    const fresh = await runOnce(adapter);
    writeLastGood(fresh);
    return { ok: true, refreshed: true, result: fresh };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await alert(message);
    if (last) return { ok: false, refreshed: false, result: last, error: message };
    /* No last-good yet and the run failed: fall back to the fixture seed rather than a blank page */
    const { fixtureAdapter } = await import("./fixture");
    const seed = await runOnce(fixtureAdapter);
    return { ok: false, refreshed: false, result: seed, error: message };
  }
}

/** What the page renders. Last-good if present, else seeded from the adapter and stored. */
export async function getExampleResult(): Promise<RunScanResponse> {
  const last = readLastGood();
  if (last) return last;
  const outcome = await refreshExample();
  return outcome.result;
}
