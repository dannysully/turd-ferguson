import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { describeAnthropicError, extractBrands, generateQuestions, QUESTION_COUNT } from "./anthropic";
import { readOverview, readSearchVolumes } from "./dataforseo";
import type { Market } from "./domain";
import { namesBrand } from "./overview";

/** Whole-run ceiling. Past this the scan is marked failed rather than left hanging. */
const RUN_TIMEOUT_MS = 5 * 60 * 1000;

/** AI Overview loading is the slow part, so questions run five at a time. */
const CONCURRENCY = 5;

export type ScanRow = {
  id: string;
  domain: string;
  brand_name: string | null;
  positioning: string | null;
  topic: string | null;
  market: Market | null;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return typeof status === "number" && status >= 500;
}

/**
 * Stage C. Runs the three named steps the UI shows, then marks the scan
 * complete. Every exit path leaves the row in a terminal state, so a browser
 * polling status never waits forever.
 */
export async function runScan(scanId: string): Promise<void> {
  const db = supabaseAdmin();
  const deadline = Date.now() + RUN_TIMEOUT_MS;
  const checkDeadline = () => {
    if (Date.now() > deadline) throw new Error("the scan took too long and was stopped");
  };

  let dfsCalls = 0;
  let dfsCost = 0;
  let anthropicCalls = 0;

  try {
    const { data: scan, error } = await db
      .from("scans")
      .select("id, domain, brand_name, positioning, topic, market")
      .eq("id", scanId)
      .single<ScanRow>();
    if (error || !scan) throw new Error(`scan ${scanId} not found`);
    if (!scan.topic || !scan.market) throw new Error("the topic was never confirmed");

    const brand = scan.brand_name ?? scan.domain;
    const market = scan.market;

    await db
      .from("scans")
      .update({ status: "running", step: "questions", started_at: new Date().toISOString() })
      .eq("id", scanId);

    // --- Step 1: "Building the questions buyers ask" ---
    const generated = await generateQuestions({
      topic: scan.topic,
      market,
      brand,
      positioning: scan.positioning,
    });
    anthropicCalls += 1;
    checkDeadline();

    const { data: questionRows, error: qErr } = await db
      .from("scan_questions")
      .insert(
        generated.map((q, i) => ({
          scan_id: scanId,
          idx: i,
          question: q.question,
          kind: q.kind,
        })),
      )
      .select("id, idx, question");
    if (qErr || !questionRows?.length) throw new Error(`could not store the questions: ${qErr?.message}`);

    const ordered = [...questionRows].sort((a, b) => a.idx - b.idx);

    // --- Step 2: "Reading what the engines answered" ---
    await db.from("scans").update({ step: "reading" }).eq("id", scanId);

    const reads = await mapWithConcurrency(ordered, CONCURRENCY, async (q) => {
      checkDeadline();
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const read = await readOverview(q.question, market);
          dfsCalls += 1;
          dfsCost += read.cost;

          // Retry once when item_types promised an Overview that did not arrive.
          const claimedButAbsent =
            !read.aio_shown && (read.raw as { claimed_but_absent?: boolean } | null)?.claimed_but_absent;
          if (claimedButAbsent && attempt === 0) continue;

          return { q, read };
        } catch (err) {
          if (attempt === 0 && isRetryable(err)) continue;
          throw err;
        }
      }
      throw new Error(`could not read the answer for "${q.question}"`);
    });

    // One call for the whole set. A missing volume stays null, never zero.
    let volumes = new Map<string, number | null>();
    try {
      const sv = await readSearchVolumes(ordered.map((q) => q.question), market);
      volumes = sv.volumes;
      dfsCalls += 1;
      dfsCost += sv.cost;
    } catch {
      // Search volume is a nice-to-have column, not a reason to fail the scan.
    }
    checkDeadline();

    for (const { q, read } of reads) {
      await db
        .from("scan_questions")
        .update({
          aio_shown: read.aio_shown,
          brand_named: read.aio_shown ? namesBrand(read.prose, brand) : false,
          search_volume: volumes.get(q.question) ?? null,
          raw: read.raw,
        })
        .eq("id", q.id);
    }

    const citations = reads.flatMap(({ q, read }) =>
      read.citations.map((c) => ({
        scan_id: scanId,
        question_id: q.id,
        source_domain: c.source_domain,
        url: c.url,
        title: c.title,
        position: c.position,
      })),
    );
    if (citations.length) {
      const { error: cErr } = await db.from("scan_citations").insert(citations);
      if (cErr) throw new Error(`could not store the sources: ${cErr.message}`);
    }

    // --- Step 3: "Finding the sources they cited" ---
    await db.from("scans").update({ step: "sources" }).eq("id", scanId);

    const prose = reads
      .map(({ read }) => read.prose)
      .filter(Boolean)
      .join("\n\n---\n\n");

    let brands: { brand: string; mentions: number }[] = [];
    if (prose.trim()) {
      brands = await extractBrands(prose);
      anthropicCalls += 1;
    }
    checkDeadline();

    // The subject brand always appears, at zero when the engines never named it.
    // A zero here is a measured zero, which is the strongest finding on the page.
    const subjectKey = brand.trim().toLowerCase();
    const rows = brands
      .filter((b) => b.brand.trim().toLowerCase() !== subjectKey)
      .map((b) => ({ scan_id: scanId, brand: b.brand.trim(), mentions: b.mentions, is_subject: false }));

    const subjectMentions =
      brands.find((b) => b.brand.trim().toLowerCase() === subjectKey)?.mentions ??
      reads.filter(({ read }) => read.aio_shown && namesBrand(read.prose, brand)).length;

    rows.push({ scan_id: scanId, brand, mentions: subjectMentions, is_subject: true });

    const { error: bErr } = await db.from("scan_brands").upsert(rows, { onConflict: "scan_id,brand" });
    if (bErr) throw new Error(`could not store the leaderboard: ${bErr.message}`);

    await db
      .from("scans")
      .update({
        status: "complete",
        step: null,
        completed_at: new Date().toISOString(),
        dfs_calls: dfsCalls,
        dfs_cost: dfsCost,
        anthropic_calls: anthropicCalls,
      })
      .eq("id", scanId);
  } catch (err) {
    const message = describeAnthropicError(err);
    await supabaseAdmin()
      .from("scans")
      .update({
        status: "failed",
        step: null,
        error: message.slice(0, 500),
        dfs_calls: dfsCalls,
        dfs_cost: dfsCost,
        anthropic_calls: anthropicCalls,
      })
      .eq("id", scanId);
  }
}

export { QUESTION_COUNT };
