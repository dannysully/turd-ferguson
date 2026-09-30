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

/**
 * One client's line on /admin/tracking (R101): live prompts and keywords
 * against the limits `cluster_limit` gives, and how many prompts today's
 * check reads (a prompt stopped for tomorrow still counts today).
 */
export function trackingCounts(p: { clusterLimit: number; today: string; prompts: { added_on: string; stopped_on: string | null }[]; keywords: { stopped_on: string | null }[] }) {
  return {
    prompts: p.prompts.filter((q) => q.stopped_on === null).length,
    promptLimit: p.clusterLimit * PROMPTS_PER_CLUSTER,
    checkedToday: p.prompts.filter((q) => q.added_on <= p.today && (q.stopped_on === null || q.stopped_on > p.today)).length,
    keywords: p.keywords.filter((k) => k.stopped_on === null).length,
    keywordLimit: p.clusterLimit * KEYWORDS_PER_CLUSTER,
  };
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

/** Whether one more live cluster fits: refuseCluster()'s message, null when it does. Undoing a cluster stop asks this (stop.ts). */
export async function readClusterRefusal(db: SupabaseClient, clientId: string): Promise<string | null> {
  const clusterLimit = await clusterLimitOf(db, clientId);
  if (typeof clusterLimit === "string") return clusterLimit;
  const live = await liveCount(db, "tracked_clusters", "client_domain_id", clientId);
  if (typeof live === "string") return live;
  return refuseCluster(live, clusterLimit);
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

// ---- Grouping (BRIEF-3 C3). Prompts and keywords move into a cluster; nothing is re-created. ----

/** The five angles, one per scan question kind (`anthropic.ts` QuestionKind, migration 3's check). */
export const ANGLES = ["category", "positioning", "sector", "outcome", "comparison"] as const;
export type Angle = (typeof ANGLES)[number];

/** A scan question's kind is its angle; anything else is none. */
export function angleFor(kind: unknown): Angle | null {
  return (ANGLES as readonly string[]).includes(String(kind)) ? (kind as Angle) : null;
}

/**
 * Which of `ids` may be grouped into a cluster that already has `clusterLive`
 * live prompts: all of them, or a refusal. Each id must be a live, ungrouped
 * prompt of this client - a prompt is in one cluster, and moving it out of
 * another one is not grouping. Clusters of fewer than 5 are allowed (R111: 5,
 * 5 and 4), and what is not picked stays ungrouped and still read daily.
 */
export function refuseGrouping(p: { ids: string[]; ungrouped: ReadonlySet<string>; clusterLive: number }): string | null {
  if (!p.ids.length) return "Pick at least one prompt.";
  if (new Set(p.ids).size !== p.ids.length) return "A prompt was picked twice.";
  if (p.ids.some((id) => !p.ungrouped.has(id))) return "Only this client's live ungrouped prompts can be grouped.";
  if (p.clusterLive + p.ids.length > PROMPTS_PER_CLUSTER) {
    return `That cluster has ${p.clusterLive} live prompts; ${p.ids.length} more would pass ${PROMPTS_PER_CLUSTER}.`;
  }
  return null;
}

/** Move live ungrouped prompts into a cluster, setting an angle where one is known and none is set. */
export async function groupPrompts(db: SupabaseClient, clientId: string, clusterId: string, ids: string[], angles: ReadonlyMap<string, Angle | null> = new Map()): Promise<Written> {
  const { data: live, error } = await db.from("tracked_questions").select("id, angle").eq("client_domain_id", clientId).is("cluster_id", null).is("stopped_on", null);
  if (error) return { ok: false, message: `Could not read the ungrouped prompts: ${error.message}` };
  const clusterLive = await liveCount(db, "tracked_questions", "cluster_id", clusterId);
  if (typeof clusterLive === "string") return { ok: false, message: clusterLive };
  const refused = refuseGrouping({ ids, ungrouped: new Set((live ?? []).map((r) => r.id as string)), clusterLive });
  if (refused) return { ok: false, message: refused };
  for (const id of ids) {
    const had = (live ?? []).find((r) => r.id === id)?.angle ?? null;
    const angle = had ?? angles.get(id) ?? null;
    const { error: uErr } = await db.from("tracked_questions").update({ cluster_id: clusterId, angle }).eq("id", id).is("cluster_id", null);
    if (uErr) return { ok: false, message: `Could not group a prompt: ${uErr.message}` };
  }
  return { ok: true, ids };
}

/** Make a live ungrouped keyword a cluster's one keyword. Refused if the cluster has a live one already. */
export async function linkKeyword(db: SupabaseClient, clientId: string, clusterId: string, keywordId: string): Promise<Written> {
  const { data: c, error } = await db.from("tracked_clusters").select("keyword_id").eq("id", clusterId).eq("client_domain_id", clientId).single();
  if (error) return { ok: false, message: `Could not read the cluster: ${error.message}` };
  if (c.keyword_id) {
    const { data: k, error: kErr } = await db.from("tracked_keywords").select("stopped_on").eq("id", c.keyword_id as string).maybeSingle();
    if (kErr) return { ok: false, message: `Could not read the cluster's keyword: ${kErr.message}` };
    if (k && k.stopped_on === null) return { ok: false, message: "That cluster already has its keyword." };
  }
  const { data: taken, error: tErr } = await db.from("tracked_clusters").select("id").eq("keyword_id", keywordId).is("stopped_on", null);
  if (tErr) return { ok: false, message: `Could not check the keyword: ${tErr.message}` };
  if ((taken ?? []).length) return { ok: false, message: "That keyword is already another cluster's." };
  const { error: lErr } = await db.from("tracked_clusters").update({ keyword_id: keywordId }).eq("id", clusterId);
  if (lErr) return { ok: false, message: `Could not link the keyword: ${lErr.message}` };
  return { ok: true, ids: [keywordId] };
}

/** Readings a prompt or keyword has; any at all fixes its text (see `refuseEdit`). */
export async function readingsFor(db: SupabaseClient, kind: "prompt" | "keyword", id: string): Promise<number | string> {
  const [table, column] = kind === "prompt" ? ["tracking_answers", "question_id"] : ["tracking_serp", "keyword_id"];
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true }).eq(column, id);
  if (error) return `Could not count the readings: ${error.message}`;
  return count ?? 0;
}
