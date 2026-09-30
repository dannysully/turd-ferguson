import type { Day } from "./figures.ts";
import type { ClusterNote, OverviewData } from "./overview-data.ts";

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
};

type RawAnswer = [Day, string, string, 0 | 1, string[], string[]];

/** The committed file stores answers as tuples to stay small; this restores the rows the overview reads. */
export function expandFixture(raw: {
  client: Omit<Fixture["client"], "id">;
  member: Fixture["member"];
  today: Day;
  data: Omit<OverviewData, "answers"> & { answers: RawAnswer[] };
  texts?: Record<string, string>;
  clusterNotes?: ClusterNote[];
}): Fixture {
  return {
    client: { ...raw.client, id: "fixture" },
    member: raw.member,
    today: raw.today,
    texts: raw.texts ?? {},
    clusterNotes: raw.clusterNotes ?? [],
    data: {
      ...raw.data,
      answers: raw.data.answers.map(([run_date, question_id, engine, named, brands, urls]) => ({
        run_date,
        question_id,
        engine,
        answered: true,
        named: named === 1,
        brands,
        citations: urls.map((url) => ({ source_domain: new URL(url).hostname, url })),
      })),
    },
  };
}
