import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { trackingDay } from "./decide.ts";
import type { Day, Range } from "./figures.ts";
import { expandFixture, fixtureMode, fixtureState, type Fixture } from "./fixture-mode.ts";
import { type MemberClient, clientsFor, sessionEmail } from "./member.ts";
import type { LatestAnswers } from "./latest-answers.ts";
import type { PlacementRow } from "./placement-figures.ts";
import { urlKey } from "./placements.ts";
import { loadPlacements } from "./placements-data.ts";
import { type SettingsData, loadSettings } from "./settings-data.ts";
import { type UpgradeContext, loadUpgradeContext } from "./upgrade-context.ts";
import { type ClusterNote, type Compare, type OverviewData, loadClusterNotes, loadLatestAnswers, loadOverview } from "./overview-data.ts";

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
  /** One prompt's answers, with their words, at its latest check on or before `to` (T7 part 3b). */
  latestAnswers(clientId: string, questionId: string, to: Day): Promise<LatestAnswers>;
  /** Notes on these prompts, any date, newest first (T7 part 4a). */
  clusterNotes(clientId: string, questionIds: string[]): Promise<ClusterNote[]>;
  /** The upsell mode and this member's hidden prompts (T11 part 4). */
  upgradeContext(clientId: string, email: string, today: Day): Promise<UpgradeContext>;
  /** The client's placements, removed ones included (T13, R97 part 2). */
  placements(clientId: string): Promise<(PlacementRow & { cluster_id: string })[]>;
  /** Settings (R142, BRIEF-4 P2): the names we match and the account's live members. */
  settings(clientId: string): Promise<SettingsData>;
  /** The tracking day the dashboard treats as today. */
  today(): Day;
}

const supabaseRepo: TrackingRepo = { sessionEmail, clientsFor, loadOverview, latestAnswers: loadLatestAnswers, clusterNotes: loadClusterNotes, upgradeContext: loadUpgradeContext, placements: loadPlacements, settings: loadSettings, today: () => trackingDay() };

let cached: Fixture | null = null;
function fixture(): Fixture {
  // A constant path, so the build traces this one file.
  cached ??= fixtureState(expandFixture(JSON.parse(readFileSync(join(process.cwd(), "src", "lib", "tracking", "fixture.json"), "utf8"))));
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
  async latestAnswers(clientId, questionId, to) {
    const f = fixture();
    if (clientId !== f.client.id) return { day: null, rows: [] };
    const mine = f.data.answers.filter((a) => a.question_id === questionId && a.run_date <= to);
    const day = mine.reduce<Day | null>((d, a) => (d === null || a.run_date > d ? a.run_date : d), null);
    // The words exist for today's check only; an earlier day shows its verdicts without them.
    const at = ["05:10", "05:11", "05:12", "05:12"];
    return {
      day,
      rows: mine
        .filter((a) => a.run_date === day)
        .map((a, i) => ({ ...a, text: day === f.today ? (f.texts[`${questionId} ${a.engine}`] ?? null) : null, at: `${day}T${at[i % 4]}:00Z` })),
    };
  },
  async clusterNotes(clientId, questionIds) {
    const f = fixture();
    if (clientId !== f.client.id) return [];
    return f.clusterNotes.filter((n) => questionIds.includes(n.question_id)).sort((a, b) => b.note_date.localeCompare(a.note_date));
  },
  async upgradeContext() {
    // The fixture's account is ours, and nobody has hidden a prompt.
    return { mode: "nomada", hidden: new Set() };
  },
  async placements(clientId) {
    const f = fixture();
    return clientId === f.client.id ? f.placements.map((p) => ({ ...p, url_key: urlKey(p.url) ?? "" })) : [];
  },
  async settings(clientId) {
    const f = fixture();
    if (clientId !== f.client.id) return { aliases: [], members: [] };
    // Removed members stay in the file, as the table keeps them, and are skipped as every read skips them.
    return { aliases: f.aliases, members: f.members.filter((m) => !m.removed_at).map((m) => ({ email: m.email, name: m.name, role: m.role, last_login_at: m.last_login_at })) };
  },
  today() {
    return fixture().today;
  },
};

export function trackingRepo(): TrackingRepo {
  return fixtureMode() ? fixtureRepo : supabaseRepo;
}
