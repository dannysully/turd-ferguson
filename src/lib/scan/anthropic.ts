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

/**
 * One retry on an overloaded or rate limited model.
 *
 * A 529 is capacity, not a bad request, and it lands often enough to matter:
 * the question set is the one call a visitor is waiting on with nothing on
 * screen yet, so failing it outright costs the scan. Anything else - a bad
 * request, a bad key - is thrown at once, because a retry cannot fix it.
 */
async function withRetry<T>(fn: () => Promise<T>, waitMs = 1500): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const status = (err as { status?: number } | null)?.status;
    const retryable = status === 429 || (typeof status === "number" && status >= 500);
    if (!retryable) throw err;
    await new Promise((r) => setTimeout(r, waitMs));
    return fn();
  }
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
  // Retried for the same reason the question set is: this is the first thing a
  // visitor does, and a 529 here reads to them as "your site cannot be read".
  const res = await withRetry(() => anthropic().messages.parse({
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
  }));

  const out = res.parsed_output;
  if (!out) throw new Error("could not read the brand from that site");
  return out;
}

// ------------------------------------------------------------ question build

export const QUESTION_COUNT = 14;

const QuestionKind = z.enum(["category", "positioning", "sector", "outcome", "comparison"]);
/** The kinds a stored question may carry. Anything else came from a visitor. */
export const QUESTION_KINDS: readonly string[] = QuestionKind.options;

const QuestionSet = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        kind: QuestionKind,
        /**
         * Which phrase this question belongs to. The confirm screen groups on
         * it so a buyer can drop a whole cluster before anything is paid for,
         * and it is normalised back onto the phrases we supplied: a cluster
         * that is not in the chips is a cluster nobody can turn off.
         */
        cluster: z.string().describe("The broad topic or variant phrase this question is for, copied exactly"),
      }),
    )
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

  const res = await withRetry(() => anthropic().messages.parse({
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
      "Every question carries the cluster it belongs to. Copy the broad topic,",
      "or the variant phrase, exactly as it was given to you - do not invent a",
      "new phrase and do not reword one. The buyer is shown these as groups and",
      "drops the ones they do not sell into.",
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
  }));

  const out = res.parsed_output;
  if (!out?.questions?.length) throw new Error("could not build the question set");

  // Belt and braces: the instruction above is advisory, this is not. The
  // cluster is folded back onto a phrase we supplied, because the confirm
  // screen turns clusters into toggles - a cluster the model invented would
  // render as a chip that matches nothing the buyer recognises.
  const known = [input.topic, ...variants];
  const byKey = new Map(known.map((v) => [v.trim().toLowerCase(), v]));
  return out.questions.slice(0, QUESTION_COUNT).map((q) => ({
    ...q,
    question: freshenYears(q.question, year),
    cluster: byKey.get((q.cluster ?? "").trim().toLowerCase()) ?? input.topic,
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
export async function extractBrands(
  prose: string,
  context: { topic: string; brand: string } = { topic: "", brand: "" },
): Promise<{ brand: string; mentions: number }[]> {
  if (!prose.trim()) return [];

  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: EFFORT, format: zodOutputFormat(BrandList) },
    system: [
      "You are given what an AI search engine answered to several buyers'",
      `questions about ${context.topic || "a product category"}.`,
      "List every company or brand named as a supplier, with how many times it",
      "appears.",
      "",
      "Exclude: publications, newspapers, magazines, blogs, directories, review",
      "sites, industry bodies, and generic nouns. Those are sources, not suppliers.",
      "Exclude Google, ChatGPT and other engines.",
      "",
      "Normalise each name to how the company writes it: one spelling per company,",
      "no Ltd, Limited, Inc or trailing punctuation. Merge obvious variants.",
      "Return an empty list if no companies are named.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [context.brand ? `Subject brand: ${context.brand}` : "", prose.slice(0, 120_000)]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
  });

  return res.parsed_output?.brands ?? [];
}

// -------------------------------------------------------- brand judgement

const BrandJudgement = z.object({
  brands: z.array(
    z.object({
      name: z.string(),
      supplier: z
        .boolean()
        .describe(
          "True only when a buyer in this category could choose this company INSTEAD OF the subject brand.",
        ),
      note: z.string().describe("At most twelve words. Why it is, or is not, an alternative supplier."),
    }),
  ),
});

/**
 * Names per request. These are short strings with no page context, so the
 * batch can be larger than the source one and still sit well inside the
 * ceiling. The discipline is the same: the ceiling scales with the batch,
 * never with the scan.
 */
const BRAND_BATCH = 50;

/**
 * Decides which extracted names are actually alternative suppliers.
 *
 * extractBrands is deliberately broad - it reads prose and pulls out the
 * companies named in it. That is the right job for a reader, and the wrong
 * list for a leaderboard: on an analytics consultant's scan it returned
 * Shopify, Meta, Upwork, WordPress, LinkedIn, Screaming Frog and Tealium,
 * and the report then read "13th of 124 brands" - a count of proper nouns.
 *
 * This pass runs once over the deduplicated names for the whole scan rather
 * than per engine, so a name cannot be a competitor on ChatGPT and not on
 * Gemini, and so the same name is never paid for twice.
 */
export async function classifyBrands(input: {
  topic: string;
  brand: string;
  positioning: string | null;
  names: string[];
}): Promise<{ brands: z.infer<typeof BrandJudgement>["brands"]; calls: number; failedBatches: number }> {
  if (!input.names.length) return { brands: [], calls: 0, failedBatches: 0 };

  const batches: string[][] = [];
  for (let i = 0; i < input.names.length; i += BRAND_BATCH) {
    batches.push(input.names.slice(i, i + BRAND_BATCH));
  }

  const brands: z.infer<typeof BrandJudgement>["brands"] = [];
  let calls = 0;
  let failedBatches = 0;
  for (const batch of batches) {
    try {
      brands.push(...(await judgeBrandBatch(input, batch)));
    } catch (err) {
      // One bad batch must not cost the others their judgement. Counted and
      // returned, not just logged: the caller decides what an unjudged name
      // means, and a silent swallow here is how a half-built leaderboard
      // shipped last time.
      failedBatches += 1;
      console.warn("[scan] a brand batch failed to classify:", err instanceof Error ? err.message : err);
    }
    calls += 1;
  }
  return { brands, calls, failedBatches };
}

async function judgeBrandBatch(
  input: { topic: string; brand: string; positioning: string | null },
  names: string[],
): Promise<z.infer<typeof BrandJudgement>["brands"]> {
  const res = await anthropic().messages.parse({
    model: MODEL,
    // Headroom per row, so the ceiling is a function of the batch.
    max_tokens: Math.min(8000, 600 + names.length * 60),
    output_config: { effort: EFFORT, format: zodOutputFormat(BrandJudgement) },
    system: [
      "You are given company and brand names that AI search engines mentioned",
      `while answering buyers' questions about ${input.topic || "a product category"}.`,
      "",
      "For each name decide one thing: is it a plausible ALTERNATIVE SUPPLIER -",
      "a company a buyer could choose INSTEAD OF the subject brand, competing",
      "for the same budget?",
      "",
      "supplier true: it sells this category to these buyers. A rival much",
      "larger or much smaller than the subject still counts.",
      "",
      "supplier false: everything else, however often it is named. In particular",
      "these, which are the usual mistakes:",
      "- platforms and tools the work is done ON or WITH: a CMS, a store",
      "  builder, an ad platform, an analytics product, a crawler, a tag",
      "  manager. A consultant who reports on a platform does not compete",
      "  with it.",
      "- marketplaces, freelancer sites and job boards",
      "- social networks, search engines and the AI engines themselves",
      "- the buyer's own clients, customers or employers",
      "- publications, directories, review sites and industry bodies",
      "- generic nouns, product categories and job titles that are not companies",
      "",
      "The test is substitution, not adjacency. Being named in the same answer",
      "is not evidence. Being unsure is not a reason to say true.",
      "",
      "The note is one short line for a business reader: twelve words at most,",
      "no marketing language. Examples: 'Sells the same service to the same",
      "buyers', 'Ecommerce platform, not a consultancy', 'Freelancer",
      "marketplace, not a supplier in this category'.",
      "",
      "Return every name you were given, spelled exactly as given, once each.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          `Subject brand: ${input.brand}`,
          input.positioning ? `What the subject sells: ${input.positioning}` : "",
          "",
          "Names:",
          ...names.map((n) => `- ${n}`),
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
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
/**
 * Domains per request.
 *
 * This used to be one call for every source on the scan, which held until a
 * scan arrived with 223 of them: roughly 8,900 tokens of output against a
 * 6,000 ceiling. The response truncated mid-JSON, the schema parse threw, and
 * because classification is deliberately never fatal the scan completed with
 * no source kinds at all - a silently half-built report rather than an error.
 *
 * Batching makes the ceiling a function of the batch rather than the scan, so
 * a 400-source scan costs more calls instead of losing its classification.
 */
const CLASSIFY_BATCH = 50;

/** Query strings are most of the length of a cited URL and none of the meaning. */
function trimUrl(url: string | null): string {
  if (!url) return "";
  const cut = url.split("?")[0].split("#")[0];
  return cut.length > 120 ? `${cut.slice(0, 120)}...` : cut;
}

export async function classifySourceDomains(input: {
  topic: string;
  brand: string;
  competitors: string[];
  /** One entry per domain, carrying the pages the engines actually cited. */
  domains: { domain: string; pages: { url: string | null; title: string | null }[] }[];
}): Promise<{ sources: z.infer<typeof SourceJudgement>["sources"]; calls: number }> {
  if (!input.domains.length) return { sources: [], calls: 0 };

  const batches: (typeof input.domains)[] = [];
  for (let i = 0; i < input.domains.length; i += CLASSIFY_BATCH) {
    batches.push(input.domains.slice(i, i + CLASSIFY_BATCH));
  }

  const sources: z.infer<typeof SourceJudgement>["sources"] = [];
  let calls = 0;
  for (const batch of batches) {
    try {
      sources.push(...(await classifyBatch(input, batch)));
    } catch (err) {
      // One bad batch must not cost the other four their classification.
      console.warn("[scan] a source batch failed to classify:", err instanceof Error ? err.message : err);
    }
    calls += 1;
  }
  return { sources, calls };
}

async function classifyBatch(
  input: { topic: string; brand: string; competitors: string[] },
  domains: { domain: string; pages: { url: string | null; title: string | null }[] }[],
): Promise<z.infer<typeof SourceJudgement>["sources"]> {
  const res = await anthropic().messages.parse({
    model: MODEL,
    // Headroom per row, so the ceiling scales with the batch rather than
    // being a number somebody picked once.
    max_tokens: Math.min(8000, 600 + domains.length * 90),
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
          ...domains.flatMap((d) => [
            `- ${d.domain}`,
            ...d.pages.slice(0, 3).map((p) => `    ${p.title ?? "(no title)"}  ${trimUrl(p.url)}`),
          ]),
        ].join("\n"),
      },
    ],
  });

  return res.parsed_output?.sources ?? [];
}
