import { FREE_ENGINES, type Engine } from "../scan/engines.ts";
import { PLACEHOLDER, coveragePrompts } from "./prompts.ts";
import type { CampaignReading } from "./reading.ts";

/**
 * The reading fixture (R151, 1 Oct 2026). `COVERAGE_FIXTURE_STATE` set to
 * complete, running, failed or stalled makes `/coverage-check/fixture` render
 * that state from made-up rows, so the four states of the reading page can be
 * shot without a real campaign token or a database - none existed in the repo
 * when the page's one-primary-action fix shipped, and it went out unseen.
 *
 * Only the token `fixture` answers; every other token still reads the database.
 * Never in production: with `VERCEL_ENV=production` set alongside the switch it
 * throws, the same refusal as `TRACKING_FIXTURE` (tracking/fixture-mode.ts).
 *
 * The brand is the placeholder `[Client brand]`, so a shot of it can never be
 * read as a measurement of anyone real.
 */
export const READING_FIXTURE_TOKEN = "fixture";

const STATES = ["complete", "running", "failed", "stalled"] as const;

export function readingFixture(
  token: string,
  env: Record<string, string | undefined> = process.env,
): CampaignReading | null {
  const state = env.COVERAGE_FIXTURE_STATE;
  if (!state || token !== READING_FIXTURE_TOKEN) return null;
  if (env.VERCEL_ENV === "production") {
    throw new Error("COVERAGE_FIXTURE_STATE is set in production - the reading page refuses the fixture");
  }
  if (!(STATES as readonly string[]).includes(state)) return null;

  const engines: Engine[] = [...FREE_ENGINES];
  const complete = state === "complete";
  const status = state === "running" ? "running" : state === "stalled" ? "draft" : state;
  const prompts = coveragePrompts(PLACEHOLDER);

  // Named on every engine for the brand question, on some for the rest, on
  // none for the news one - the three pill tones the board draws.
  const questions = complete
    ? prompts.map((p, idx) => ({
        idx,
        kind: p.kind,
        question: p.question,
        answers: engines.map((engine, e) => {
          const answered = !(idx === 3 && e === engines.length - 1);
          return { engine, answered, brandNamed: answered && (idx === 0 || (!p.weak && e % 2 === 0)) };
        }),
      }))
    : [];
  const answers = questions.flatMap((q) => q.answers);
  const named = { count: answers.filter((a) => a.answered && a.brandNamed).length, of: answers.length };

  return {
    campaign: {
      brand: PLACEHOLDER.brand,
      domain: "example.com",
      topic: PLACEHOLDER.topic,
      segment: null,
      market: "UK",
      createdAt: "2026-09-30T09:00:00Z",
    },
    reading: {
      id: "fixture-reading",
      scanToken: complete ? "fixture-scan" : null,
      status,
      step: null,
      error: state === "failed" ? "fixture: the engines did not answer" : null,
      createdAt: "2026-09-30T09:00:00Z",
      completedAt: complete ? "2026-09-30T09:04:00Z" : null,
      engines,
      enginesAnswered: complete ? engines : [],
    },
    questions,
    sources: complete
      ? [
          { domain: "example-trade.com", citations: 6, placed: true },
          { domain: "example-review.com", citations: 4, placed: false },
          { domain: "example-news.co.uk", citations: 2, placed: false },
          { domain: "example-blog.com", citations: 1, placed: false },
        ]
      : [],
    coverage: complete
      ? { uploaded: 2, cited: 1, uncited: ["example-weekly.com"] }
      : { uploaded: 0, cited: 0, uncited: [] },
    pieces: complete
      ? [
          { url: "https://example-trade.com/news/launch", domain: "example-trade.com", pageEngines: [engines[0]], publicationEngines: [] },
          { url: "https://example-weekly.com/feature", domain: "example-weekly.com", pageEngines: [], publicationEngines: [] },
        ]
      : [],
    named,
    history: [
      {
        id: "fixture-reading",
        status,
        takenAt: complete ? "2026-09-30T09:04:00Z" : null,
        named: named.count,
        answers: named.of,
      },
    ],
  };
}
