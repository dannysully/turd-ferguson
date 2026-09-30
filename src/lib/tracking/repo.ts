import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { trackingDay } from "./decide.ts";
import type { Day, Range } from "./figures.ts";
import { expandFixture, fixtureMode, type Fixture } from "./fixture-mode.ts";
import { type MemberClient, clientsFor, sessionEmail } from "./member.ts";
import { type Compare, type OverviewData, loadOverview } from "./overview-data.ts";

/**
 * The dashboard's data layer (R93, 29 Sep 2026; BRIEF-2 T9): one interface,
 * two implementations. Supabase in production; the committed fixture when
 * `TRACKING_FIXTURE=1` (fixture-mode.ts), which production refuses. Every
 * /app page reads through `trackingRepo()`, never a table directly, so specs
 * run the real pages on the fixture.
 */
export interface TrackingRepo {
  /** The signed-in email, or null. */
  sessionEmail(): Promise<string | null>;
  /** Every client this email may see, oldest first, with the member's role. */
  clientsFor(email: string): Promise<(MemberClient & { role: string })[]>;
  /** Everything the overview reads for one client and range. */
  loadOverview(clientId: string, range: Range, compare: Compare): Promise<OverviewData>;
  /** The tracking day the dashboard treats as today. */
  today(): Day;
}

const supabaseRepo: TrackingRepo = { sessionEmail, clientsFor, loadOverview, today: () => trackingDay() };

let cached: Fixture | null = null;
function fixture(): Fixture {
  // A constant path, so the build traces this one file.
  cached ??= expandFixture(JSON.parse(readFileSync(join(process.cwd(), "src", "lib", "tracking", "fixture.json"), "utf8")));
  return cached;
}

const fixtureRepo: TrackingRepo = {
  async sessionEmail() {
    return fixture().member.email;
  },
  async clientsFor(email) {
    const f = fixture();
    return email === f.member.email ? [{ ...f.client, role: f.member.role }] : [];
  },
  async loadOverview(clientId) {
    // The fixture holds both periods whole; the figures cut the range.
    return clientId === fixture().client.id ? fixture().data : { clusters: [], questions: [], keywords: [], answers: [], serp: [], lastRun: null, notes: [] };
  },
  today() {
    return fixture().today;
  },
};

export function trackingRepo(): TrackingRepo {
  return fixtureMode() ? fixtureRepo : supabaseRepo;
}
