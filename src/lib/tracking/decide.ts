import { createHmac } from "node:crypto";

import { constantTimeEqual } from "../constant-time.ts";

/**
 * The decisions the daily tracking runner makes, with nothing in here that
 * needs a credential or a socket - so `decide.test.mts` can run every one.
 * `runner.ts` is the network half and imports `server-only`, which Node's
 * runner cannot load; anything moved back there has no executor.
 *
 * Imports are relative on purpose, for the same reason: `@/` does not resolve
 * under `node --test`.
 *
 * T1 of docs/tracked-dashboard-2026-09-29/BRIEF.md (Danny, 29 Sep 2026).
 */

/** Today's date as the dashboard dates a run: the calendar day in London. */
export function trackingDay(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is what a Postgres date column takes.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Which clients the cron dispatches a run for.
 *
 * Danny, 29 Sep 2026 (danny.md 86): client_domains already holds twelve rows,
 * every one `status = 'active'` by the migration's default and none with a
 * tracked question. A client with no active question is skipped - it would be
 * a run that reads nothing and a row that says "complete" about nothing - and
 * that is also what keeps those twelve out: only a client set up through
 * /admin/tracking has questions. `started_on` in the future is skipped too,
 * because additions start at the next daily check (BRIEF decision 7).
 */
export type ClientForDispatch = {
  id: string;
  status: string | null;
  started_on: string | null;
  activeQuestions: number;
};

export function shouldTrack(client: ClientForDispatch, today: string): boolean {
  if (client.status !== "active") return false;
  if (client.activeQuestions < 1) return false;
  if (client.started_on && client.started_on > today) return false;
  return true;
}

/** A question or keyword is live on `day` if it was added by then and not yet stopped. */
export function liveOn(row: { added_on: string; stopped_on: string | null }, day: string): boolean {
  return row.added_on <= day && (row.stopped_on === null || row.stopped_on > day);
}

/**
 * The two tracking settings, read off app_settings rows.
 *
 * Fails closed: a missing or wrong-typed `tracking_enabled` is off, and a
 * missing cap is zero, so a settings read that half-worked cannot turn into
 * spend nobody bounded. The migration inserts both rows.
 */
export type TrackingSettings = { enabled: boolean; dailyCapUsd: number };

export function readTrackingSettings(rows: readonly { key: string; value: unknown }[]): TrackingSettings {
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  const enabled = get("tracking_enabled") === true;
  const cap = Number(get("tracking_daily_cost_cap_usd"));
  return { enabled, dailyCapUsd: Number.isFinite(cap) && cap > 0 ? cap : 0 };
}

/** Null when a run may start, or the reason it may not. */
export function refuseRun(settings: TrackingSettings, spentTodayUsd: number): string | null {
  if (!settings.enabled) return "tracking is switched off (tracking_enabled)";
  if (spentTodayUsd >= settings.dailyCapUsd) {
    return `today's tracking spend $${spentTodayUsd.toFixed(2)} has reached the cap of $${settings.dailyCapUsd.toFixed(2)}`;
  }
  return null;
}

/**
 * The cron hands each run to its own invocation, signed so nobody else can.
 *
 * HMAC-SHA256 of the exact body, keyed on CRON_SECRET, hex. The run route
 * verifies against the raw text it received, before parsing it.
 */
export const RUN_SIGNATURE_HEADER = "x-track-signature";

export function signRun(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyRun(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  return constantTimeEqual(signature, signRun(body, secret));
}

/**
 * How a run ends. Complete only when every read landed; partial when some
 * failed after the retry; failed when none did, which is a run that measured
 * nothing and must not read as a day of zeros.
 */
export function runOutcome(reads: number, failed: number): "complete" | "partial" | "failed" {
  if (reads > 0 && failed >= reads) return "failed";
  return failed > 0 ? "partial" : "complete";
}

/** A `running` tracking run older than this was killed by the platform. */
export const TRACKING_STALL_MS = 15 * 60 * 1000;
