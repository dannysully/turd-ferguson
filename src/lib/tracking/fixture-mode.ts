import { brandKey, subjectKeys } from "../scan/brand-name.ts";
import { addDays, type Day } from "./figures.ts";
import { PROMPTS_PER_CLUSTER } from "./limits.ts";
import type { ClusterNote, OverviewData } from "./overview-data.ts";
import type { PlacementRow } from "./placement-figures.ts";

/**
 * The T9 fixture switch (R93, 29 Sep 2026; BRIEF-2 T9). `TRACKING_FIXTURE=1`
 * runs the whole of /app on `fixture.json` - made-up Tallyroo, built from
 * boards-3/dataset.py by docs/parity/T9/make-fixture.py - with a fixture
 * session, so specs and parity need no login and no database.
 *
 * Never in production: with `VERCEL_ENV=production` the switch throws instead
 * of answering, and the /app layout asks it on every request, so a production
 * deploy with the variable set serves an error rather than a made-up client.
 * Pure, so the refusal is tested without a server.
 */
export function fixtureMode(env: Record<string, string | undefined> = process.env): boolean {
  if (env.TRACKING_FIXTURE !== "1") return false;
  if (env.VERCEL_ENV === "production") {
    throw new Error("TRACKING_FIXTURE=1 is set in production - /app refuses to start on the fixture");
  }
  return true;
}

export type Fixture = {
  client: { id: string; slug: string; brand: string; domain: string; market: string; tier: string; started_on: string; question_limit: number; keyword_limit: number; cluster_limit: number };
  member: { email: string; role: string };
  today: Day;
  data: OverviewData;
  /** T7 part 3b: the answer text of each prompt on each engine at today's check, keyed "promptId engine" (docs/parity/T7/add-texts.py). */
  texts: Record<string, string>;
  /** T7 part 4a: notes on prompts, as the board's "Notes on this cluster" draws them. */
  clusterNotes: ClusterNote[];
  /** T13 (R97 part 3): placements on cluster c1, after boards-3/Placements.dc.html (docs/parity/T13/add-placements.py). */
  placements: FixturePlacement[];
  /** R142 (BRIEF-4 P2): the names we match, and the team - owner, editor, viewer and one removed. */
  aliases: string[];
  members: FixtureMember[];
};

export type FixtureMember = { email: string; name: string | null; role: string; last_login_at: string | null; removed_at?: string | null };

/** A placement as fixture.json stores it; url_key is computed on read, as the admin writer computes it. */
export type FixturePlacement = Omit<PlacementRow, "url_key"> & { cluster_id: string };

/**
 * R151 (1 Oct 2026): `TRACKING_FIXTURE_STATE=unreadable` makes the fixture's
 * overview read throw, as overview-data.ts throws when Supabase refuses a
 * read, so the /app error boundary can be swept without breaking a database.
 */
export function fixtureUnreadable(env: Record<string, string | undefined> = process.env): void {
  if (env.TRACKING_FIXTURE_STATE === "unreadable") throw new Error("could not read the runs: fixture state unreadable");
}

/**
 * R138 (30 Sep 2026): `TRACKING_FIXTURE_STATE=ungrouped` serves the same
 * client with no cluster rows and no prompt in a cluster - the Overview's
 * "Ungrouped prompts" state. Placements hang off clusters, so they go too.
 */
export function fixtureState(f: Fixture, env: Record<string, string | undefined> = process.env): Fixture {
  const as = fixtureAs(f, env);
  if (env.TRACKING_FIXTURE_STATE === "new") return dayZero(as);
  if (env.TRACKING_FIXTURE_STATE === "signup") return signupNoKeyword(dayZero(as));
  if (env.TRACKING_FIXTURE_STATE === "partial") return failedReads(as, "partial");
  if (env.TRACKING_FIXTURE_STATE === "failed") return failedReads(as, "failed");
  if (env.TRACKING_FIXTURE_STATE !== "ungrouped") return as;
  return { ...as, placements: [], data: { ...as.data, clusters: [], questions: as.data.questions.map((q) => ({ ...q, cluster_id: null })) } };
}

/**
 * R148 pass 7 (1 Oct 2026): `TRACKING_FIXTURE_STATE=new` is the first
 * dashboard view after checkout - the money path's last step. Signup starts
 * tracking tomorrow, so every live cluster, prompt and keyword begins then,
 * stopped rows are gone, and nothing has been read: no answers, no SERP, no
 * run, no notes, no placements.
 */
function dayZero(f: Fixture): Fixture {
  const tomorrow = addDays(f.today, 1);
  const live = <T extends { stopped_on: Day | null }>(rows: T[]) => rows.filter((r) => r.stopped_on === null);
  return {
    ...f,
    client: { ...f.client, started_on: tomorrow },
    texts: {},
    clusterNotes: [],
    placements: [],
    data: {
      clusters: live(f.data.clusters).map((c) => ({ ...c, started_on: tomorrow })),
      questions: live(f.data.questions).map((q) => ({ ...q, added_on: tomorrow })),
      keywords: live(f.data.keywords).map((k) => ({ ...k, added_on: tomorrow })),
      answers: [],
      serp: [],
      lastRun: null,
      notes: [],
    },
  };
}

/**
 * R148 pass 10 (1 Oct 2026): `TRACKING_FIXTURE_STATE=signup` is day zero as
 * the webhook really builds it from a scan that chose no keyword (signup.ts):
 * one cluster named "Needs a keyword" with no keyword and the scan's prompts
 * (PROMPTS_PER_CLUSTER), nothing else.
 */
function signupNoKeyword(f: Fixture): Fixture {
  const first = f.data.clusters[0]!;
  return {
    ...f,
    data: {
      ...f.data,
      // signup.ts's NEEDS_A_KEYWORD; a literal because that file resolves "@/" imports (the test holds them equal).
      clusters: [{ ...first, name: "Needs a keyword", keyword_id: null }],
      questions: f.data.questions.filter((q) => q.cluster_id === first.id).slice(0, PROMPTS_PER_CLUSTER),
      keywords: [],
    },
  };
}

/**
 * R151 (1 Oct 2026): the error states of a daily check, as the runner records
 * them (decide.ts runOutcome). `partial` is today's run with every Google AI
 * Overview read failed - how both pilots' first real runs came back on 30 Sep -
 * so those rows are answered=false with nothing named or cited, and the run is
 * `partial`. `failed` is a run where no read landed: every row today is
 * unanswered, and since overview-data.ts reads only complete or partial runs,
 * the last check shown is the day before's.
 */
const FAILED_ENGINE = "google_aio";

function failedReads(f: Fixture, outcome: "partial" | "failed"): Fixture {
  const hit = (a: OverviewData["answers"][number]) => a.run_date === f.today && (outcome === "failed" || a.engine === FAILED_ENGINE);
  const lastRun = outcome === "partial" ? { run_date: f.today, status: "partial", finished_at: `${f.today}T06:10:00Z` } : { run_date: addDays(f.today, -1), status: "complete", finished_at: `${addDays(f.today, -1)}T06:10:00Z` };
  const texts = Object.fromEntries(Object.entries(f.texts).filter(([k]) => outcome === "partial" && !k.endsWith(` ${FAILED_ENGINE}`)));
  return {
    ...f,
    texts,
    data: { ...f.data, lastRun, answers: f.data.answers.map((a) => (hit(a) ? { ...a, answered: false, named: false, brands: [], citations: [] } : a)) },
  };
}

/**
 * R146 (1 Oct 2026, BRIEF-4 P6): `TRACKING_FIXTURE_ROLE=editor|viewer|removed`
 * signs the fixture session in as that member of the team, so the role
 * journeys run on the real pages. `removed` is the removed member, whom
 * fixtureLive refuses, so every client page 404s for them. Unset is the
 * owner; anything else throws rather than silently running as the owner.
 */
function fixtureAs(f: Fixture, env: Record<string, string | undefined>): Fixture {
  const want = env.TRACKING_FIXTURE_ROLE;
  if (!want || want === "owner") return f;
  const m =
    want === "removed"
      ? f.members.find((x) => x.removed_at)
      : want === "editor" || want === "viewer"
        ? f.members.find((x) => x.role === want && !x.removed_at)
        : undefined;
  if (!m) throw new Error(`TRACKING_FIXTURE_ROLE=${want}: the fixture has no such member (owner, editor, viewer or removed)`);
  return { ...f, member: { email: m.email, role: m.role } };
}

/** Whether this email is a live member of the fixture's team. */
export function fixtureLive(f: Fixture, email: string): boolean {
  return email === f.member.email && f.members.some((m) => m.email === email && !m.removed_at);
}

type RawAnswer = [Day, string, string, 0 | 1, string[], string[]];

/** The committed file stores answers as tuples to stay small; this restores the rows the overview reads. */
export function expandFixture(raw: {
  client: Omit<Fixture["client"], "id">;
  member: Fixture["member"];
  today: Day;
  data: Omit<OverviewData, "answers"> & { answers: RawAnswer[] };
  texts?: Record<string, string>;
  clusterNotes?: ClusterNote[];
  placements?: FixturePlacement[];
  aliases?: string[];
  members?: FixtureMember[];
}): Fixture {
  const subject = subjectKeys(raw.client.brand, raw.client.domain);
  return {
    client: { ...raw.client, id: "fixture" },
    member: raw.member,
    today: raw.today,
    texts: raw.texts ?? {},
    clusterNotes: raw.clusterNotes ?? [],
    placements: raw.placements ?? [],
    aliases: raw.aliases ?? [],
    members: raw.members ?? [{ ...raw.member, name: null, last_login_at: null }],
    data: {
      ...raw.data,
      answers: raw.data.answers.map(([run_date, question_id, engine, named, brands, urls]) => ({
        run_date,
        question_id,
        engine,
        answered: true,
        named: named === 1,
        // R143 (1 Oct 2026): the runner never stores the client among the
        // other brands (runner.ts drops every subjectKeys spelling), but the
        // dataset lists Tallyroo there whenever it is named, which counted
        // the client twice on Who is named. Restored as the runner writes it.
        brands: brands.filter((b) => !subject.has(brandKey(b))),
        citations: urls.map((url) => ({ source_domain: new URL(url).hostname, url })),
      })),
    },
  };
}
