/**
 * Live adapter. Posts to the product API per the section 3 contract.
 * The API does not exist yet; this is the target the fixture stands in for.
 */

import type { RunScanResponse, ScanAdapter, SignUpResponse, StartScanResponse } from "./contract";
import { ScanError } from "./contract";

const BASE = process.env.SCAN_API_BASE ?? "https://app.alwayscited.com";

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ScanError("api_down", "Could not reach the scan API");
  }
  if (res.status === 429) throw new ScanError("rate_limited", "Five checks this hour");
  if (res.status === 422) throw new ScanError("unreachable", "Could not load that domain");
  if (!res.ok) throw new ScanError("api_down", `Scan API returned ${res.status}`);
  return (await res.json()) as T;
}

export const liveAdapter: ScanAdapter = {
  startScan: (input) => post<StartScanResponse>("/api/scan/start", input),
  runScan: (input) => post<RunScanResponse>("/api/scan/run", input),
  signUp: (input) => post<SignUpResponse>("/api/signup", input),
};
