import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type { Market } from "./domain";

const MODEL = "claude-opus-5";

/**
 * These are short extraction and generation tasks with explicit rules, so low
 * effort is the right setting: it keeps the three calls inside the scan's 90
 * second budget without trading away accuracy.
 */
const EFFORT = "low" as const;

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY must be set. The scan cannot read a site without it.");
  }
  client = new Anthropic();
  return client;
}

/** Turns SDK errors into one readable message, keeping the retryable ones distinguishable. */
export function describeAnthropicError(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) return "the language model is rate limited";
  if (err instanceof Anthropic.AuthenticationError) return "the ANTHROPIC_API_KEY is not valid";
  if (err instanceof Anthropic.BadRequestError) return `bad request to the language model: ${err.message}`;
  if (err instanceof Anthropic.APIError) return `language model error ${err.status}: ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}

// ---------------------------------------------------------------- brand read

export const TOPIC_VARIANT_COUNT = 5;

const BrandRead = z.object({
  brand_name: z.string().describe("The company's own name, as it writes it"),
  positioning: z.string().describe("One paragraph on what it sells and who to"),
  suggested_topic: z.string().describe("The buyer's category phrase, two to four words"),
  topic_variants: z
    .array(z.string())
    .describe(
      `Up to ${TOPIC_VARIANT_COUNT} ways buyers phrase this category, narrowed by what makes this brand different`,
    ),
  confidence: z.enum(["high", "low"]),
});
export type BrandRead = z.infer<typeof BrandRead>;

export async function readBrand(siteText: string): Promise<BrandRead> {
  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: EFFORT, format: zodOutputFormat(BrandRead) },
    system: [
      "You read a company's own website and report what it sells.",
      "",
      "The topic is the hard part. It must be how a BUYER says it, not how the",
      "company pitches itself: a category noun phrase a buyer would type into a",
      "search box. Two to four words. No brand names. No adjectives the company",
      "invented for itself, no slogans, no words like bespoke, innovative,",
      "world-class, or award-winning.",
      "",
      'Good: "b2b seo agency", "commercial epoxy flooring", "invoice finance".',
      'Bad: "growth partner", "digital transformation experts", "the Acme method".',
      "",
      `Then give up to ${TOPIC_VARIANT_COUNT} topic variants. suggested_topic is the`,
      "broad category; the variants are how buyers phrase it when they want the",
      "particular kind of supplier this company is. Read the site for what",
      "narrows it: who they serve, how they deliver, the stage or size of client,",
      "the model they use.",
      "",
      "A fractional CFO firm that embeds operators into venture-backed startups",
      "should not return five rewordings of 'fractional cfo'. It should return",
      "phrases such as 'embedded fractional cfo', 'outsourced cfo for startups',",
      "'fractional cfo for vc backed companies', 'startup finance team',",
      "'part time cfo services'. Each variant is a real search a different buyer",
      "would type, and at least three should carry the narrowing the site gives you.",
      "",
      "Every variant is lower case, two to six words, no brand names, and must",
      "stand on its own as a search someone would actually run.",
      "",
      "Set confidence to low when the site does not make the category clear.",
    ].join("\n"),
    messages: [{ role: "user", content: `Website text:\n\n${siteText}` }],
  });

  const out = res.parsed_output;
  if (!out) throw new Error("could not read the brand from that site");
  return out;
}

// ------------------------------------------------------------ question build

export const QUESTION_COUNT = 14;

const QuestionKind = z.enum(["category", "positioning", "sector", "outcome", "comparison"]);

const QuestionSet = z.object({
  questions: z
    .array(z.object({ question: z.string(), kind: QuestionKind }))
    .describe(`Exactly ${QUESTION_COUNT} questions`),
});
export type GeneratedQuestion = z.infer<typeof QuestionSet>["questions"][number];

/**
 * The year a buyer would actually type.
 *
 * Read at call time rather than baked in as a constant: a hardcoded year is
 * wrong from the first of January and nobody notices until a client does.
 */
function currentYear(): number {
  return new Date().getFullYear();
}

/**
 * Rewrites a year that has already passed to the current one.
 *
 * The question set is asked to carry the year, and the model left to itself
 * reaches for whatever year its training data ended in - which is how "best
 * electrolyte hydration sachets uk 2025" reached a real report in September
 * 2026. Naming the year in the prompt helps; this is the part that cannot
 * drift, because it does not depend on the model reading the instruction.
 *
 * Deliberately narrow. Only 2015 up to last year are touched, so capacities
 * and model numbers ("best 2000w inverter", "1200 series") are left alone, and
 * a forward-looking year is somebody's real search rather than a mistake.
 */
export function freshenYears(text: string, year = currentYear()): string {
  return text.replace(/\b20\d{2}\b/g, (match) => {
    const n = Number(match);
    return n >= 2015 && n < year ? String(year) : match;
  });
}

export async function generateQuestions(input: {
  topic: string;
  topicVariants?: string[];
  market: Market;
  brand: string;
  positioning: string | null;
}): Promise<GeneratedQuestion[]> {
  const marketName = input.market === "UK" ? "the United Kingdom" : "the United States";
  const year = currentYear();

  // The variants are what stop fourteen questions being fourteen rewordings of
  // one phrase. Without them the set collapses onto the broad category and the
  // result says nothing about how this brand is actually positioned.
  const variants = (input.topicVariants ?? []).filter((v) => v.trim()).slice(0, TOPIC_VARIANT_COUNT);

  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: EFFORT, format: zodOutputFormat(QuestionSet) },
    system: [
      `You write the ${QUESTION_COUNT} commercial questions a buyer in ${marketName}`,
      "would actually type when they are close to choosing a supplier.",
      "",
      "You are given a broad topic and, usually, several narrower variants read",
      "from the company's own site. SPREAD THE QUESTIONS ACROSS THE VARIANTS.",
      "Roughly a fifth on the broad topic and the rest distributed over the",
      "narrower ones, so the set measures the category the brand actually",
      "competes in, not just the widest possible phrase.",
      "",
      "A firm embedding finance operators into venture-backed startups is not",
      "well measured by fourteen versions of 'best fractional cfo'. It is well",
      "measured by questions about embedded finance teams, outsourced CFOs for",
      "startups, and CFOs for VC-backed companies, because those are the",
      "searches its buyers run.",
      "",
      "The mix across the whole set is fixed:",
      `- 3 category: the term as the market says it, one plain, one carrying the`,
      `  year, one about cost or pricing. The current year is ${year}. If a question`,
      `  carries a year it must be ${year} - never an earlier one, however familiar`,
      `  an earlier one looks.`,
      "- 5 positioning: the category re-framed the way this brand argues for",
      "  itself, using its variants.",
      "- 3 sector: the category plus the brand's strongest declared sector.",
      "- 2 outcome: the category plus the result the buyer wants.",
      "- 1 comparison: an 'X vs Y' or 'alternatives to' question.",
      "",
      "Never write a definition question. Nothing starting 'what is', 'what are',",
      "'how does ... work', or 'why is ... important'. The engine answers those",
      "inside its own response, the click never happens, and they inflate the",
      "score while meaning nothing.",
      "",
      "No two questions may be the same question with a synonym swapped. If two",
      "would return the same answer, replace one.",
      "",
      "Write them lower case, as typed into a search box, no question marks.",
      "Use the spelling and vocabulary of the market, not American English for a",
      "United Kingdom scan.",
      "Do not name the subject brand in any question.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          `Broad topic: ${input.topic}`,
          variants.length
            ? `Narrower variants to spread across: ${variants.join("; ")}`
            : "Narrower variants: none were read from the site, so work from the positioning below.",
          `Market: ${marketName}`,
          `Brand (do not name it in the questions): ${input.brand}`,
          `How the brand positions itself: ${input.positioning ?? "not stated"}`,
        ].join("\n"),
      },
    ],
  });

  const out = res.parsed_output;
  if (!out?.questions?.length) throw new Error("could not build the question set");

  // Belt and braces: the instruction above is advisory, this is not.
  return out.questions.slice(0, QUESTION_COUNT).map((q) => ({
    ...q,
    question: freshenYears(q.question, year),
  }));
}

// ----------------------------------------------------------- brand extraction

const BrandList = z.object({
  brands: z.array(
    z.object({
      brand: z.string(),
      mentions: z.number().int().min(1),
    }),
  ),
});

/**
 * Pull the competitor set out of the Overview prose. Publications, directories
 * and generic nouns are excluded deliberately: the leaderboard is who the
 * engines recommend, which is a different list from who they cite.
 */
export async function extractBrands(overviewProse: string): Promise<{ brand: string; mentions: number }[]> {
  if (!overviewProse.trim()) return [];

  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: EFFORT, format: zodOutputFormat(BrandList) },
    system: [
      "You are given the text of several Google AI Overview answers.",
      "List every company or brand named as a supplier, with how many times it appears.",
      "",
      "Exclude: publications, newspapers, magazines, blogs, directories, review",
      "sites, industry bodies, and generic nouns. Those are sources, not suppliers.",
      "Exclude Google, ChatGPT and other engines.",
      "",
      "Normalise each name to how the company writes it: one spelling per company,",
      "no Ltd, Limited, Inc or trailing punctuation. Merge obvious variants.",
      "Return an empty list if no companies are named.",
    ].join("\n"),
    messages: [{ role: "user", content: overviewProse.slice(0, 120_000) }],
  });

  return res.parsed_output?.brands ?? [];
}

// ------------------------------------------------------------ source kinds

const SourceJudgement = z.object({
  sources: z.array(
    z.object({
      domain: z.string(),
      kind: z.enum(["competitor", "placement", "other"]),
      on_topic: z
        .boolean()
        .describe(
          "True when the cited pages are about this category. False when the site was cited for something unrelated.",
        ),
      note: z.string().describe("At most twelve words. Plain English for a business reader."),
    }),
  ),
});

/**
 * Sorts cited domains into competitors, places an article could be placed,
 * and everything else. The subject's own domain and the review sites never
 * reach here: sources.ts settles those without a call.
 */
export async function classifySourceDomains(input: {
  topic: string;
  brand: string;
  competitors: string[];
  /** One entry per domain, carrying the pages the engines actually cited. */
  domains: { domain: string; pages: { url: string | null; title: string | null }[] }[];
}): Promise<z.infer<typeof SourceJudgement>["sources"]> {
  if (!input.domains.length) return [];

  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 6000,
    output_config: { effort: EFFORT, format: zodOutputFormat(SourceJudgement) },
    system: [
      "You are given website domains that AI search engines cited when answering",
      `buyers' questions about ${input.topic || "a product category"}. Sort each one.`,
      "",
      "competitor: the domain belongs to a company that sells this to the same",
      "buyers. A domain that is plainly one of the named competitors is a",
      "competitor. So is a seller in this category you recognise even when it is",
      "not named.",
      "",
      "placement: a publication, magazine, newspaper, trade title, blog, industry",
      "body, comparison or listicle site, or any editorial site where an article",
      "about this category could be published, or a brand written into an",
      "existing one.",
      "",
      "other: anything else. A community or social site, an encyclopaedia, a",
      "government or academic site, a marketplace, a search engine's own",
      "property, a tool or product unrelated to the category.",
      "",
      "Then judge on_topic SEPARATELY from kind, using the page titles and URLs",
      "under each domain. kind is what the site is; on_topic is whether these",
      "particular pages are about this category. A national newspaper is a",
      "placement, but a page about horse racing owners or an unrelated company",
      "filing is not on topic, and neither is a fashion title cited for a shoe",
      "trends piece. Set on_topic false whenever the cited pages are about",
      "something else, however good the publication. Being unsure is not a",
      "reason to say true.",
      "",
      "The note is one short line a business reader takes in at a glance: what",
      "the site is and, for a placement, who reads it. Twelve words at most. No",
      "marketing language. Examples: 'UK trade title for finance teams',",
      "'Sells the same thing to the same buyers', 'Comparison site ranking",
      "suppliers in this category'.",
      "",
      "Return every domain you were given, spelled exactly as given, once each.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          `Subject brand: ${input.brand}`,
          `Named competitors: ${input.competitors.length ? input.competitors.join(", ") : "none identified"}`,
          "",
          "Domains, each with the pages the engines cited:",
          ...input.domains.flatMap((d) => [
            `- ${d.domain}`,
            ...d.pages.slice(0, 3).map((p) => `    ${p.title ?? "(no title)"}  ${p.url ?? ""}`),
          ]),
        ].join("\n"),
      },
    ],
  });

  return res.parsed_output?.sources ?? [];
}
