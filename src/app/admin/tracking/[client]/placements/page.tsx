import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { T } from "@/config/tokens";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { linkCheckState, PLACEMENT_KINDS, PLACEMENT_LIMITS, PLACEMENT_STATUSES } from "@/lib/tracking/placements";

import { ActionForm } from "../../ActionForm";
import { logPlacement, updatePlacement } from "../../actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Placements",
  robots: { index: false, follow: false },
};

/**
 * /admin/tracking/[client]/placements - R96 part 3, BRIEF-2 T12 (Danny, 29 Sep
 * 2026, danny.md line 88). Behind the /admin Basic auth. Nomada logs each
 * placement on a cluster here: kind, URL, status, scheduled and live dates,
 * anchor. url_key is derived (placements.ts); there is no price field. A row
 * the Sunday link check alerted on (link_present false) is flagged at the top.
 *
 * Clusters are made on /admin/tracking itself (BRIEF-3 C3), so the brief's
 * separate clusters page would be a second copy of that form.
 */

const input = {
  padding: "6px 8px",
  border: `1px solid ${T.line}`,
  borderRadius: "6px",
  fontSize: "13px",
  color: T.ink,
  background: T.surface,
} as const;

const KIND_LABEL: Record<string, string> = { guest_post: "guest post", link_insertion: "link insertion", on_site: "on-site", coverage: "coverage" };

type Row = Record<string, unknown>;

export default async function PlacementsAdmin({ params }: { params: Promise<{ client: string }> }) {
  if (!supabaseConfigured()) return <main style={{ padding: "40px" }}>Database not configured.</main>;
  const { client: slug } = await params;
  const db = supabaseAdmin();
  const { data: client, error: cErr } = await db.from("client_domains").select("id, domain, tier, slug").eq("slug", slug).maybeSingle();
  if (cErr) throw new Error(`could not read the client: ${cErr.message}`);
  if (!client) notFound();
  const id = client.id as string;

  const [{ data: clusters, error: clErr }, { data: rows, error: pErr }] = await Promise.all([
    db.from("tracked_clusters").select("id, name, stopped_on").eq("client_domain_id", id).order("created_at", { ascending: true }),
    db
      .from("placements")
      .select("id, cluster_id, kind, url, url_key, status, scheduled_on, live_on, anchor_text, internal_note, last_checked_on, link_present")
      .eq("client_domain_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (clErr) throw new Error(`could not read clusters: ${clErr.message}`);
  if (pErr) throw new Error(`could not read placements: ${pErr.message}`);

  const kinds = PLACEMENT_KINDS.filter((k) => k !== "coverage" || client.tier === "everywhere");
  const liveClusters = (clusters ?? []).filter((c) => c.stopped_on === null);
  const nameOf = (cid: unknown) => ((clusters ?? []).find((c) => c.id === cid)?.name as string | undefined) ?? "-";
  const list = (rows ?? []).map((r) => ({ r, check: linkCheckState(r as { status: string; last_checked_on: string | null; link_present: boolean | null }) }));
  const flagged = list.filter((x) => x.check.flagged);

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px", color: T.ink, fontSize: "14px" }}>
      <p style={{ margin: "0 0 4px", fontSize: "13px" }}>
        <a href="/admin/tracking" style={{ color: T.soft }}>
          Tracking
        </a>
      </p>
      <h1 style={{ fontSize: "24px", margin: "0 0 4px" }}>
        Placements <span style={{ color: T.soft, fontWeight: 400 }}>- {client.domain as string} - {client.tier as string}</span>
      </h1>
      <p style={{ color: T.soft, margin: "0 0 24px" }}>
        Live placements are link-checked on Sundays. The check never changes a status; a row it alerted on is flagged here until you mark it removed.
      </p>

      {client.tier === "tracked" ? (
        <p style={{ color: T.soft }}>alwaystracked is reporting only: no placements.</p>
      ) : (
        <section style={{ border: `1px solid ${T.line}`, borderRadius: "10px", padding: "16px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "16px", margin: "0 0 8px" }}>Log a placement</h2>
          {liveClusters.length === 0 ? (
            <p style={{ color: T.soft, margin: 0 }}>This client has no cluster yet. Make one on the tracking page first.</p>
          ) : (
            <ActionForm action={logPlacement} submit="Log placement">
              <input type="hidden" name="client" value={id} maxLength={PLACEMENT_LIMITS.id} />
              <select name="cluster" style={input} aria-label="Cluster">
                {liveClusters.map((c) => (
                  <option key={c.id as string} value={c.id as string}>
                    {c.name as string}
                  </option>
                ))}
              </select>
              <select name="kind" style={input} aria-label="Kind">
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              <input name="url" maxLength={PLACEMENT_LIMITS.url} placeholder="Page URL" style={{ ...input, width: "360px" }} aria-label="Page URL" />
              <StatusFields status="pitched" scheduled="" live="" />
              <input name="anchor_text" maxLength={PLACEMENT_LIMITS.anchor} placeholder="Anchor text" style={{ ...input, width: "220px" }} aria-label="Anchor text" />
              <input name="internal_note" maxLength={PLACEMENT_LIMITS.note} placeholder="Internal note" style={{ ...input, width: "260px" }} aria-label="Internal note" />
            </ActionForm>
          )}
        </section>
      )}

      {flagged.length ? (
        <p role="alert" style={{ fontWeight: 700, margin: "0 0 12px" }}>
          {flagged.length} placement{flagged.length === 1 ? "" : "s"} flagged by the link check: {flagged.map((x) => x.r.url_key as string).join(", ")}
        </p>
      ) : null}

      {list.length === 0 ? <p style={{ color: T.soft }}>No placements logged.</p> : null}
      {list.map(({ r, check }) => (
        <PlacementRow key={r.id as string} client={id} row={r} cluster={nameOf(r.cluster_id)} check={check} />
      ))}
    </main>
  );
}

function StatusFields({ status, scheduled, live }: { status: string; scheduled: string; live: string }) {
  return (
    <>
      <select name="status" defaultValue={status} style={input} aria-label="Status">
        {PLACEMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <label style={{ fontSize: "12.5px", color: T.soft }}>
        scheduled <input type="date" name="scheduled_on" defaultValue={scheduled} maxLength={PLACEMENT_LIMITS.date} style={input} />
      </label>
      <label style={{ fontSize: "12.5px", color: T.soft }}>
        live <input type="date" name="live_on" defaultValue={live} maxLength={PLACEMENT_LIMITS.date} style={input} />
      </label>
    </>
  );
}

function PlacementRow({ client, row, cluster, check }: { client: string; row: Row; cluster: string; check: { flagged: boolean; text: string } }) {
  return (
    <div style={{ borderTop: `1px solid ${T.hair}`, borderLeft: check.flagged ? `3px solid ${T.badFg}` : "3px solid transparent", padding: "8px 0 8px 10px" }}>
      <div>
        <a href={row.url as string} rel="noopener noreferrer nofollow" target="_blank" style={{ color: T.ink }}>
          {row.url_key as string}
        </a>{" "}
        <span style={{ color: T.soft }}>
          - {KIND_LABEL[row.kind as string] ?? String(row.kind)} - {cluster}
        </span>{" "}
        <span style={{ color: check.flagged ? T.badFg : T.soft, fontWeight: check.flagged ? 700 : 400 }}>- {check.flagged ? `flagged: ${check.text}` : check.text}</span>
      </div>
      <ActionForm action={updatePlacement} submit="Save">
        <input type="hidden" name="client" value={client} maxLength={PLACEMENT_LIMITS.id} />
        <input type="hidden" name="id" value={row.id as string} maxLength={PLACEMENT_LIMITS.id} />
        <StatusFields status={row.status as string} scheduled={(row.scheduled_on as string | null) ?? ""} live={(row.live_on as string | null) ?? ""} />
        <input name="anchor_text" defaultValue={(row.anchor_text as string | null) ?? ""} maxLength={PLACEMENT_LIMITS.anchor} placeholder="Anchor text" style={{ ...input, width: "200px" }} aria-label={`Anchor text for ${row.url_key as string}`} />
        <input name="internal_note" defaultValue={(row.internal_note as string | null) ?? ""} maxLength={PLACEMENT_LIMITS.note} placeholder="Internal note" style={{ ...input, width: "220px" }} aria-label={`Note for ${row.url_key as string}`} />
      </ActionForm>
    </div>
  );
}
