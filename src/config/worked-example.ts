import { FREE_ENGINES } from "@/lib/scan/engines";

/**
 * The homepage's worked example, named once.
 *
 * Two panels show it. `AnswerExplorer` is the scan result question by
 * question; `TierJourney` step 1 is the same questions as the alwaystracked
 * table. They share a placeholder world deliberately - the same
 * [Competitor A], the same blog.example/competitor-a-alternatives - so a
 * reader is meant to recognise one from the other.
 *
 * Both panels typed their own copy of it, and three of the four shared rows
 * disagreed. The same question was answered twice on one page:
 *
 *     alternatives to [Competitor A] for small teams
 *         AnswerExplorer  named by Perplexity          1 of 4
 *         TierJourney     Google AI Overviews, Gemini  2 of 4
 *     best crm for small b2b companies
 *         AnswerExplorer  ChatGPT                      1 of 4
 *         TierJourney     Perplexity                   1 of 4
 *     which invoicing tool integrates with xero
 *         AnswerExplorer  Google AI Overviews, Gemini  2 of 4
 *         TierJourney     + ChatGPT                    3 of 4
 *
 * Example data is still an argument: the panels say "Example data" out loud,
 * and every brand in them is a placeholder precisely so nothing reads as a
 * measurement of a real company. What it cannot be is self-contradicting. A
 * page selling "the engines disagree about you and here is the count" loses
 * the argument the moment its own two counts for one question disagree.
 *
 * So the questions, who named the brand and what the Overview did live here,
 * and the panels carry only what is theirs: the verbatim answer, the sources
 * and the plan on one, the table on the other.
 *
 * This is the same fix as config/scan-shape.ts one level up. That named the
 * engine list once so a row could not claim an engine the scan does not read.
 * This names the result once so two rows cannot claim different engines for
 * one question.
 */

export type WorkedQuestionId =
  | "pm-creative"
  | "crm-b2b"
  | "xero"
  | "helpdesk-saas"
  | "competitor-alternatives";

export type WorkedQuestion = {
  id: WorkedQuestionId;
  text: string;
  /**
   * Which of the free engines named the brand, by position in that set.
   * Position rather than name, for the reason written on pickEngines: a name
   * typed here is a second copy of the engine list that nothing reconciles
   * with the first.
   */
  engines: number[];
  /**
   * Whether Google showed an AI Overview at all.
   *
   * Only meaningful when the Overview did not name the brand - if it did,
   * it plainly showed. So the column reads off `engines` first and only falls
   * back to this, which is what stops the two from contradicting each other
   * the way they did before.
   */
  overviewShown: boolean;
};

/**
 * The order the questions appear in AnswerExplorer's list. TierJourney shows
 * a subset, by id.
 */
export const WORKED_QUESTIONS: WorkedQuestion[] = [
  { id: "pm-creative", text: "best project management software for creative teams", engines: [], overviewShown: true },
  { id: "crm-b2b", text: "best crm for small b2b companies", engines: [1], overviewShown: false },
  { id: "xero", text: "which invoicing tool integrates with xero", engines: [0, 2], overviewShown: true },
  { id: "helpdesk-saas", text: "best help desk software for saas", engines: [], overviewShown: false },
  {
    id: "competitor-alternatives",
    text: "alternatives to [Competitor A] for small teams",
    engines: [3],
    overviewShown: true,
  },
];

const BY_ID = new Map(WORKED_QUESTIONS.map((q) => [q.id, q]));

/**
 * The question, or a build that fails loudly - the same bargain requirePost
 * makes. A panel row whose id is not registered has lost its question text
 * and its engine set, and rendering it half-built is worse than not building.
 */
export function workedQuestion(id: WorkedQuestionId): WorkedQuestion {
  const q = BY_ID.get(id);
  if (!q) throw new Error("no worked-example question registered for " + id);
  return q;
}

/**
 * Where Google's AI Overview sits in the free set. Looked up rather than
 * assumed to be 0, so reordering FREE_ENGINES cannot silently make the
 * Overview column report a different engine.
 */
const AIO_POSITION = FREE_ENGINES.indexOf("google_aio");

/**
 * The AI Overview column on the alwaystracked table.
 *
 * Derived rather than stored beside `engines`, because the two were stored
 * separately and drifted into a contradiction a reader could see: one row
 * listed the engines that named the brand as "Google AI Overviews and
 * Gemini" and the Overview column beside it as "mentioned" - agreeing - while
 * another listed Perplexity alone and still said "mentioned". An Overview
 * that named the brand is an engine in `engines`; there is no third state for
 * the two fields to disagree about.
 */
export function overviewLabel(q: WorkedQuestion): string {
  if (AIO_POSITION >= 0 && q.engines.includes(AIO_POSITION)) return "mentioned";
  return q.overviewShown ? "shown, absent" : "none shown";
}
