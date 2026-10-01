import { brandKey, subjectKeys } from "../scan/brand-name.ts";
import type { Day } from "./figures.ts";
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
 * R138 (30 Sep 2026): `TRACKING_FIXTURE_STATE=ungrouped` serves the same
 * client with no cluster rows and no prompt in a cluster - the Overview's
 * "Ungrouped prompts" state. Placements hang off clusters, so they go too.
 */
export function fixtureState(f: Fixture, env: Record<string, string | undefined> = process.env): Fixture {
  if (env.TRACKING_FIXTURE_STATE !== "ungrouped") return f;
  return { ...f, placements: [], data: { ...f.data, clusters: [], questions: f.data.questions.map((q) => ({ ...q, cluster_id: null })) } };
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
