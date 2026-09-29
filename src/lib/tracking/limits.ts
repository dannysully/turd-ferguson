import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * alwaystracked's limits, enforced on the server - C2 of
 * docs/tracked-dashboard-2026-09-29/BRIEF-3-clusters.md (Danny, 29 Sep 2026).
 *
 * A client has `cluster_limit` clusters (10, plus 5 per pack). A cluster is one
 * live keyword and at most 5 live prompts. Every insert into
 * `tracked_questions`, `tracked_keywords` and `tracked_clusters` goes through
 * this file - admin actions, dashboard actions and the webhook alike - and
 * `limits.test.mts` holds that as a census. The form is never the only guard.
 *
 * `client_domains.question_limit` and `keyword_limit` stay in the table
 * (dropping them is destructive) and are no longer read: the limits are
 * derived from `cluster_limit` here.
 *
 * Prompts and keywords with no cluster ("Ungrouped", admin only, still read
 * daily - R111) count against the client's whole allowance: 5 prompts and one
 * keyword per cluster it may have.
 *
 * The refusals are pure so the tests can run each one. The writers below are
 * the only network half; imports are type-only so Node's runner can load this.
 */

export const CLUSTER_BASE = 10;
export const CLUSTERS_PER_PACK = 5;
export const PROMPTS_PER_CLUSTER = 5;
export const KEYWORDS_PER_CLUSTER = 1;

/** The pack rule: 10 + 5 per pack. Set by the webhook on `customer.subscription.updated`; no other writer. */
export function clusterLimitFor(packs: number): number {
  const n = Number.isFinite(packs) && packs > 0 ? Math.floor(packs) : 0;
  return CLUSTER_BASE + CLUSTERS_PER_PACK * n;
}

/** A new cluster is refused when the live clusters already reach `cluster_limit`. */
export function refuseCluster(liveClusters: number, clusterLimit: number): string | null {
  return liveClusters >= clusterLimit ? `At the limit of ${clusterLimit} clusters.` : null;
}

/**
 * How many prompts may still be added. `clusterLive` is the target cluster's
 * live prompt count, or null for an ungrouped prompt.
 */
export function promptRoom(p: { clientLive: number; clusterLive: number | null; clusterLimit: number }): number {
  const client = p.clusterLimit * PROMPTS_PER_CLUSTER - p.clientLive;
  const cluster = p.clusterLive === null ? Infinity : PROMPTS_PER_CLUSTER - p.clusterLive;
  return Math.max(0, Math.min(client, cluster));
}

/** A prompt is refused when its cluster already has 5 live, or the client has no room left. */
export function refusePrompts(p: { clientLive: number; clusterLive: number | null; clusterLimit: number }, adding = 1): string | null {
  if (p.clusterLive !== null && p.clusterLive + adding > PROMPTS_PER_CLUSTER) {
    return `That cluster already has ${p.clusterLive} of ${PROMPTS_PER_CLUSTER} live prompts.`;
  }
  const total = p.clusterLimit * PROMPTS_PER_CLUSTER;
  if (p.clientLive + adding > total) return `At the limit of ${total} prompts (${p.clusterLimit} clusters).`;
  return null;
}

/** A keyword is refused when its cluster already has one live, or the client has one per cluster already. */
export function refuseKeyword(p: { clientLive: number; clusterHasLive: boolean | null; clusterLimit: number }): string | null {
  if (p.clusterHasLive) return "That cluster already has its keyword.";
  const total = p.clusterLimit * KEYWORDS_PER_CLUSTER;
  if (p.clientLive >= total) return `At the limit of ${total} keywords (${p.clusterLimit} clusters).`;
  return null;
}

/** Text is editable only until the first reading. After that it is "Stop and add a new one". */
export function refuseEdit(readings: number): string | null {
  return readings > 0 ? "It already has readings, so its text is fixed. Stop it and add a new one." : null;
}

// ---- The writers. Each reads the counts, asks the rule above, then writes. ----

export type Written = { ok: true; ids: string[] } | { ok: false; message: string };

async function clusterLimitOf(db: SupabaseClient, clientId: string): Promise<number | string> {
  const { data, error } = await db.from("client_domains").select("cluster_limit").eq("id", clientId).single();
  if (error) return `Could not read the client: ${error.message}`;
  return data.cluster_limit as number;
}

async function liveCount(db: SupabaseClient, table: string, column: string, value: string): Promise<number | string> {
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true }).eq(column, value).is("stopped_on", null);
  if (error) return `Could not count ${table}: ${error.message}`;
  return count ?? 0;
}

/** The room for prompts on a client, and in a cluster when one is named. */
export async function readPromptRoom(db: SupabaseClient, clientId: string, clusterId: string | null): Promise<{ room: number; limits: { clientLive: number; clusterLive: number | null; clusterLimit: number } } | string> {
  const clusterLimit = await clusterLimitOf(db, clientId);
  if (typeof clusterLimit === "string") return clusterLimit;
  const clientLive = await liveCount(db, "tracked_questions", "client_domain_id", clientId);
  if (typeof clientLive === "string") return clientLive;
  let clusterLive: number | null = null;
  if (clusterId) {
    const n = await liveCount(db, "tracked_questions", "cluster_id", clusterId);
    if (typeof n === "string") return n;
    clusterLive = n;
  }
  const limits = { clientLive, clusterLive, clusterLimit };
  return { room: promptRoom(limits), limits };
}

export type PromptRow = { text: string; source: string; added_on: string; added_by: string; angle?: string | null };

/** Insert prompts into a client (and a cluster, or ungrouped). The whole batch is refused if it does not fit. */
export async function insertPrompts(db: SupabaseClient, clientId: string, clusterId: string | null, rows: PromptRow[]): Promise<Written> {
  if (!rows.length) return { ok: true, ids: [] };
  const read = await readPromptRoom(db, clientId, clusterId);
  if (typeof read === "string") return { ok: false, message: read };
  const refused = refusePrompts(read.limits, rows.length);
  if (refused) return { ok: false, message: refused };
  const { data, error } = await db
    .from("tracked_questions")
    .insert(rows.map((r) => ({ ...r, client_domain_id: clientId, cluster_id: clusterId })))
    .select("id");
  if (error) return { ok: false, message: `Could not add the prompts: ${error.message}` };
  return { ok: true, ids: (data ?? []).map((r) => r.id as string) };
}

export type KeywordRow = { keyword: string; added_on: string; added_by: string; search_volume?: number | null; intent?: string | null };

/** Insert a keyword, ungrouped or as a cluster's one keyword (linked through `tracked_clusters.keyword_id`). */
export async function insertKeyword(db: SupabaseClient, clientId: string, clusterId: string | null, row: KeywordRow): Promise<Written> {
  const clusterLimit = await clusterLimitOf(db, clientId);
  if (typeof clusterLimit === "string") return { ok: false, message: clusterLimit };
  const clientLive = await liveCount(db, "tracked_keywords", "client_domain_id", clientId);
  if (typeof clientLive === "string") return { ok: false, message: clientLive };
  let clusterHasLive: boolean | null = null;
  if (clusterId) {
    const { data: c, error } = await db.from("tracked_clusters").select("keyword_id").eq("id", clusterId).eq("client_domain_id", clientId).single();
    if (error) return { ok: false, message: `Could not read the cluster: ${error.message}` };
    clusterHasLive = false;
    if (c.keyword_id) {
      const { data: k, error: kErr } = await db.from("tracked_keywords").select("stopped_on").eq("id", c.keyword_id as string).maybeSingle();
      if (kErr) return { ok: false, message: `Could not read the cluster's keyword: ${kErr.message}` };
      clusterHasLive = !!k && k.stopped_on === null;
    }
  }
  const refused = refuseKeyword({ clientLive, clusterHasLive, clusterLimit });
  if (refused) return { ok: false, message: refused };
  const { data, error } = await db.from("tracked_keywords").insert({ ...row, client_domain_id: clientId }).select("id").single();
  if (error) return { ok: false, message: `Could not add the keyword: ${error.message}` };
  if (clusterId) {
    const { error: lErr } = await db.from("tracked_clusters").update({ keyword_id: data.id }).eq("id", clusterId);
    if (lErr) return { ok: false, message: `Keyword added, but not linked to its cluster: ${lErr.message}` };
  }
  return { ok: true, ids: [data.id as string] };
}

export type ClusterRow = { name: string; tier: string; started_on: string; keyword_id?: string | null };

/** Insert a cluster, refused at `cluster_limit` live. */
export async function insertCluster(db: SupabaseClient, clientId: string, row: ClusterRow): Promise<Written> {
  const clusterLimit = await clusterLimitOf(db, clientId);
  if (typeof clusterLimit === "string") return { ok: false, message: clusterLimit };
  const live = await liveCount(db, "tracked_clusters", "client_domain_id", clientId);
  if (typeof live === "string") return { ok: false, message: live };
  const refused = refuseCluster(live, clusterLimit);
  if (refused) return { ok: false, message: refused };
  const { data, error } = await db.from("tracked_clusters").insert({ ...row, client_domain_id: clientId }).select("id").single();
  if (error) return { ok: false, message: `Could not add the cluster: ${error.message}` };
  return { ok: true, ids: [data.id as string] };
}

/** Readings a prompt or keyword has; any at all fixes its text (see `refuseEdit`). */
export async function readingsFor(db: SupabaseClient, kind: "prompt" | "keyword", id: string): Promise<number | string> {
  const [table, column] = kind === "prompt" ? ["tracking_answers", "question_id"] : ["tracking_serp", "keyword_id"];
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true }).eq(column, id);
  if (error) return `Could not count the readings: ${error.message}`;
  return count ?? 0;
}
