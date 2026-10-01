import { fixtureMode, type Fixture } from "./fixture-mode.ts";
import { refuseCluster, refusePrompts } from "./limits.ts";
import { type StopKind, refuseRole, refuseStop, refuseUndo, stopDay } from "./stop.ts";

/**
 * R168 (Danny, 2 Oct 2026, danny.md lines 177-179): `TRACKING_FIXTURE_WRITE=1`
 * makes the /app fixture writable, so a journey sees its own change. Writes
 * are held in process memory over the fixture repo.ts serves, and are gone on
 * restart. Nothing reaches a database.
 *
 * Refused in production exactly as TRACKING_FIXTURE is: with
 * `VERCEL_ENV=production` the switch throws, whether or not TRACKING_FIXTURE
 * is also set, and it is on only when the fixture itself is.
 *
 * Each writer here is pure: the fixture in, the fixture after the write out,
 * under the same rules the database writers ask (stop.ts, limits.ts).
 */
export function fixtureWrites(env: Record<string, string | undefined> = process.env): boolean {
  if (env.TRACKING_FIXTURE_WRITE !== "1") return false;
  if (env.VERCEL_ENV === "production") {
    throw new Error("TRACKING_FIXTURE_WRITE=1 is set in production - /app refuses to write to the fixture");
  }
  return fixtureMode(env);
}

export type FixtureWritten = { ok: true; fixture: Fixture } | { ok: false; message: string };

type Day = Fixture["today"];

/** Stop.ts's stop and undoStop, on the fixture. A cluster takes its keyword and live prompts with it, and brings back only those stopped on its day. */
export function fixtureStop(f: Fixture, p: { kind: StopKind; id: string; today: Day; role: string; undo: boolean }): FixtureWritten {
  const role = refuseRole(p.role);
  if (role) return { ok: false, message: role };
  const { clusters, questions, keywords } = f.data;
  const row = p.kind === "prompt" ? questions.find((q) => q.id === p.id) : clusters.find((c) => c.id === p.id);
  if (!p.undo) {
    const refused = refuseStop(row ?? null);
    if (refused) return { ok: false, message: refused };
    const day = stopDay(p.today);
    const live = <T extends { stopped_on: Day | null }>(r: T, hit: boolean): T => (hit && r.stopped_on === null ? { ...r, stopped_on: day } : r);
    if (p.kind === "prompt") return written(f, { questions: questions.map((q) => live(q, q.id === p.id)) });
    const keywordId = (row as (typeof clusters)[number]).keyword_id;
    return written(f, {
      clusters: clusters.map((c) => live(c, c.id === p.id)),
      questions: questions.map((q) => live(q, q.cluster_id === p.id)),
      keywords: keywords.map((k) => live(k, k.id === keywordId)),
    });
  }
  const refused = refuseUndo(row ?? null, p.today) ?? refuseRoom(f, p.kind, row!);
  if (refused) return { ok: false, message: refused };
  const day = row!.stopped_on;
  const back = <T extends { stopped_on: Day | null }>(r: T, hit: boolean): T => (hit && r.stopped_on === day ? { ...r, stopped_on: null } : r);
  if (p.kind === "prompt") return written(f, { questions: questions.map((q) => back(q, q.id === p.id)) });
  const keywordId = (row as (typeof clusters)[number]).keyword_id;
  return written(f, {
    clusters: clusters.map((c) => back(c, c.id === p.id)),
    questions: questions.map((q) => back(q, q.cluster_id === p.id)),
    keywords: keywords.map((k) => back(k, k.id === keywordId)),
  });
}

/** stop.ts's refuseRoom, counted on the fixture: an undo takes a slot back only while one is free. */
function refuseRoom(f: Fixture, kind: StopKind, row: { stopped_on: Day | null; cluster_id?: string | null }): string | null {
  const { clusters, questions } = f.data;
  const clusterLimit = f.client.cluster_limit;
  if (kind === "cluster") return refuseCluster(clusters.filter((c) => c.stopped_on === null).length, clusterLimit);
  const clusterId = row.cluster_id ?? null;
  if (clusterId && clusters.find((c) => c.id === clusterId)?.stopped_on != null) return "Its cluster is stopped. Undo the cluster instead.";
  const live = questions.filter((q) => q.stopped_on === null);
  return refusePrompts({ clientLive: live.length, clusterLive: clusterId ? live.filter((q) => q.cluster_id === clusterId).length : null, clusterLimit });
}

function written(f: Fixture, data: Partial<Fixture["data"]>): FixtureWritten {
  return { ok: true, fixture: { ...f, data: { ...f.data, ...data } } };
}
