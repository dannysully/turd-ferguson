/**
 * Scan adapter. Switched by SCAN_SOURCE - "fixture" or "live". Nothing else
 * in the site imports the implementations directly, so the swap is one env
 * var and no code.
 */

import type { ScanAdapter } from "./contract";
import { fixtureAdapter } from "./fixture";
import { liveAdapter } from "./live";

export * from "./contract";
export { normalizeDomain } from "./mapper";

export function getScanAdapter(): ScanAdapter {
  const source = (process.env.SCAN_SOURCE ?? "fixture").toLowerCase();
  if (source === "live") return liveAdapter;
  return fixtureAdapter;
}

export const startScan: ScanAdapter["startScan"] = (i) => getScanAdapter().startScan(i);
export const runScan: ScanAdapter["runScan"] = (i) => getScanAdapter().runScan(i);
export const signUp: ScanAdapter["signUp"] = (i) => getScanAdapter().signUp(i);
