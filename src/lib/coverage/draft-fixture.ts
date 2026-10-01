import { draftMarketLine, REPORT_LIMIT_LINE, tickedRows, type DraftRow } from "./draft.ts";

/**
 * The draft route's fixture (R140 part 3, 1 Oct 2026): `COVERAGE_FIXTURE=1`
 * answers the draft route with made-up Tallyroo fields built around the rows
 * actually pasted, so step 2 renders on a local `npm run start` - where
 * Turnstile refuses, and there is no database or model key - for parity shots
 * against the confirm screen. It reads no page, makes no call and writes nothing.
 *
 * Never in production, as TRACKING_FIXTURE: with `VERCEL_ENV=production` the
 * switch throws instead of answering, so a deploy with it set errors rather
 * than skipping Turnstile. Pure, so the refusal is tested without a server.
 */
export function coverageFixture(env: Record<string, string | undefined> = process.env): boolean {
  if (env.COVERAGE_FIXTURE !== "1") return false;
  if (env.VERCEL_ENV === "production") {
    throw new Error("COVERAGE_FIXTURE=1 is set in production - the draft route refuses to answer from the fixture");
  }
  return true;
}

/** The draft route's answer shape, on made-up fields; the last ticked row is named as unread so that state shows too. */
export function fixtureDraft(rows: DraftRow[]) {
  const ticked = tickedRows(rows);
  return {
    brand: "Tallyroo",
    clientDomain: "tallyroo.com",
    topic: "invoicing software that chases late payments for you",
    segment: "small agencies and freelancers",
    prompts: [
      "What is the best invoicing software for a small agency?",
      "Which invoicing tool chases late payments automatically?",
      "What invoicing software do creative agencies recommend?",
      "Which invoicing app gets freelancers paid fastest?",
      "Which invoicing software is better than the big accounting suites for agencies?",
    ],
    market: "US" as const,
    marketLine: draftMarketLine({ market: "US", reason: "publications" }, "tallyroo.com"),
    rows,
    reportLimit: rows.length > ticked.length ? REPORT_LIMIT_LINE : null,
    unread: ticked.length > 1 ? [ticked[ticked.length - 1]!.url] : [],
    domainRefusal: null,
  };
}
