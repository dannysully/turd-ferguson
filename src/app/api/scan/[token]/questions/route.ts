import {
  describeAnthropicError,
  generateQuestions,
  type GeneratedQuestion,
  QUESTION_COUNT,
  TOPIC_VARIANT_COUNT,
} from "@/lib/scan/anthropic";
import { isMarket } from "@/lib/scan/domain";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The questions, written but not yet asked.
 *
 * The confirm screen shows what is about to run before a penny is spent, which
 * is the whole point of that screen: if the category is wrong then every
 * question built on it is wrong, and nobody says so unless they are shown.
 *
 * One language model call and nothing else. It touches no engine, so it costs
 * no DataForSEO spend, and it stores no questions - what gets asked is what
 * comes back through /confirm, after the visitor has pruned it.
 */

/**
 * How many model calls one scan may make before it has run anything.
 *
 * A scan starts at one (reading the site), so this allows the first set plus
 * four rewrites. The route is otherwise unbounded - nothing else stops the
 * same token asking for a new set forever - and an Anthropic call is not
 * covered by daily_cost_cap_usd, which sums DataForSEO spend only.
 */
const CALL_CEILING = 6;

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  let body: { topic?: string; market?: string; topic_variants?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: scan } = await db
    .from("scans")
    .select("id, status, domain, brand_name, positioning, topic, topic_variants, market, anthropic_calls")
    .eq("public_token", token)
    .maybeSingle();

  if (!scan) return Response.json({ error: "not_found" }, { status: 404 });

  // Only a scan that has not run yet. Rewriting the questions of one that is
  // running or complete would describe it wrongly on its own screen: the
  // answers on file were given to the questions it actually asked.
  if (scan.status !== "pending_topic" && scan.status !== "failed") {
    return Response.json({ error: "already_started", status: scan.status }, { status: 409 });
  }

  if ((scan.anthropic_calls ?? 0) >= CALL_CEILING) {
    return Response.json(
      {
        error: "rewrite_limit",
        message: "We have rewritten these a few times now. Run them, or start again with a different category.",
      },
      { status: 429 },
    );
  }

  const topic = (body.topic ?? scan.topic ?? "").trim();
  if (topic.length < 2 || topic.length > 120) {
    return Response.json({ error: "bad_topic", message: "Tell us the category in a few words." }, { status: 400 });
  }

  const market = isMarket(body.market) ? body.market : isMarket(scan.market) ? scan.market : "UK";

  const supplied: unknown[] = Array.isArray(body.topic_variants)
    ? body.topic_variants
    : ((scan.topic_variants as string[] | null) ?? []);
  const variants = supplied
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().toLowerCase())
    .filter((v) => v.length >= 2 && v.length <= 80)
    .slice(0, TOPIC_VARIANT_COUNT);

  // The attempts, billed as they go out.
  //
  // The comment that used to sit inside this try said the route had no scan
  // row to bill them onto. It has one, and updates it a few lines below. A
  // flat +1 let CALL_CEILING pass up to three times the calls it is written to
  // allow - on a public route with nothing else bounding it - and recorded
  // nothing at all when the last retry threw, which is the case it exists for.
  const billed = { calls: 0 };

  /** Puts what was billed on the row, through whichever exit this takes. */
  const recordSpend = async () => {
    if (!billed.calls) return;
    await db
      .from("scans")
      .update({ anthropic_calls: (scan.anthropic_calls ?? 0) + billed.calls })
      .eq("id", scan.id);
  };

  // Annotated rather than left to evolve, because the assignment below is a
  // destructuring one and an inferred `any` here would take the type off
  // everything the response is built from.
  let questions: GeneratedQuestion[];
  try {
    ({ questions } = await generateQuestions({
      topic,
      topicVariants: variants,
      market,
      brand: scan.brand_name ?? scan.domain,
      positioning: scan.positioning,
    }, billed));
  } catch (err) {
    // Logged rather than swallowed. This is the only step between a visitor
    // and their scan, and a silent 502 here looks identical to a slow network.
    console.warn("[scan] could not write the questions for " + scan.id + ": " + describeAnthropicError(err));
    await recordSpend();
    return Response.json(
      { error: "write_failed", message: "We could not write the questions just now. Try again." },
      { status: 502 },
    );
  }

  // Counted whether or not the visitor goes on to run them. The admin page and
  // the ceiling above both read this, and a call that happened is a cost that
  // happened.
  await recordSpend();

  return Response.json({
    topic,
    market,
    // The chips, in the order the questions group under them: the broad
    // category first, then the narrowing the site gave us.
    clusters: [topic, ...variants.filter((v) => v !== topic)],
    max: QUESTION_COUNT,
    questions,
  });
}
