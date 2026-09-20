/**
 * The five questions the campaign benchmark asks.
 *
 * A fixed template, not a model call. Danny accepted that on 20 September 2026
 * and it is the right shape for what this measures: the benchmark's whole
 * value is that the same five questions can be asked again after the campaign
 * and the two readings compared. A generation call cannot promise that. Ask a
 * model for five questions about a brand twice and you get two similar sets,
 * and "similar" is precisely the thing a before-and-after comparison cannot
 * survive - a change in the answer would be indistinguishable from a change in
 * the question. It is also a model call per submission that we would be paying
 * for on a free tool, for a worse result.
 *
 * The scan's question set is generated, and that is not an inconsistency: a
 * scan is one reading of how a category is phrased, so the phrasing has to
 * come from the site. A benchmark is two readings of the same thing at
 * different times, so the phrasing has to be frozen.
 *
 * No `server-only` import. This is a pure function over two strings, the
 * marketing page renders from it, and `npm run check` loads it directly.
 *
 * ## Why this file exists rather than an array in the page
 *
 * The page listed these five as example copy and the backend would have listed
 * them again. Two lists of the same questions in two files is the exact shape
 * of the bug this repo has already been bitten by - the source classifier and
 * the brand extractor judging the same domain differently because each knew
 * something the other did not. Here it would be quieter and worse: the page
 * would advertise one set of questions and the benchmark would run another,
 * and nothing would ever fail. So there is one list, and the page renders it.
 */

/** Which axis a question measures. Rendered as the pill on the question list. */
export type PromptKind = "Identity" | "Capability" | "Category" | "Comparison" | "News";

export type CoveragePrompt = {
  kind: PromptKind;
  /** The question as asked, with the campaign's own words filled in. */
  question: string;
  /** Why it is on the list. Shown beside it on the page. */
  why: string;
  /**
   * True for the one question whose answer we do not fully trust. Not hidden,
   * because a benchmark that quietly drops its weakest reading is worth less
   * than one that labels it - but marked, so nobody reads a hedge as a finding.
   */
  weak?: boolean;
};

/**
 * What the benchmark is given. `segment` is the only optional one: without it
 * the category question asks the broader form, which is a worse question but
 * still a real one.
 */
export type CampaignInput = {
  brand: string;
  topic: string;
  segment?: string;
};

/**
 * The placeholders the marketing page shows when nobody has typed anything.
 *
 * Square brackets on purpose, and they stay square brackets. A worked example
 * on a marketing site must not read as a measurement of a real company, which
 * is the rule every board in this project carries.
 */
export const PLACEHOLDER: Required<CampaignInput> = {
  brand: "[Client brand]",
  topic: "[the thing you announced]",
  segment: "[segment]",
};

/**
 * Collapse whitespace and trim. Someone pasting a campaign line out of a brief
 * brings the newline with it, and a question with a newline in the middle is a
 * different string from the same question without one - which matters here
 * more than it usually would, because the re-run compares against what was
 * stored last time.
 */
function tidy(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * The five questions for a campaign.
 *
 * Deterministic: the same input gives the same five strings, in the same
 * order, for ever. That is the property the whole feature rests on, so it has
 * a test rather than a comment promising it.
 *
 * An empty field falls back to its placeholder rather than producing "what
 * does  do" with a hole in it. The caller is expected to validate first; this
 * is the belt, and it fails to something legible rather than to something
 * malformed.
 */
export function coveragePrompts(input: CampaignInput): CoveragePrompt[] {
  const brand = tidy(input.brand) || PLACEHOLDER.brand;
  const topic = tidy(input.topic) || PLACEHOLDER.topic;
  const segment = tidy(input.segment ?? "") || PLACEHOLDER.segment;

  return [
    {
      kind: "Identity",
      question: `what does ${brand} do`,
      why: "The description everything else is judged against.",
    },
    {
      kind: "Capability",
      question: `does ${brand} offer ${topic}`,
      why: "Whether the announcement has reached the answer at all.",
    },
    {
      kind: "Category",
      question: `who offers ${topic} for ${segment}`,
      why: "The buying question. Coverage that wins this one is worth repeating.",
    },
    {
      kind: "Comparison",
      question: `${brand} vs alternatives for ${topic}`,
      why: "Where a competitor comparison page usually speaks for you.",
    },
    {
      kind: "News",
      question: `what has ${brand} announced recently`,
      weak: true,
      why: "Weakest of the five. Engines hedge on recency and may answer from memory rather than a source.",
    },
  ];
}

/**
 * How many questions a benchmark asks. Read from the template rather than
 * typed, for the same reason the engine count is read from config: the docs
 * said three engines and two gated while the code said four and zero, for a
 * day, because both were typed.
 */
export const COVERAGE_PROMPT_COUNT = coveragePrompts(PLACEHOLDER).length;
