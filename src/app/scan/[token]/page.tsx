import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ScanFlow from "@/components/scan/ScanFlow";
import { isMarket } from "@/lib/scan/domain";
import { buildUnlockPayload, opportunityShape, type UnlockPayload } from "@/lib/scan/unlock";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * A scan, by its link.
 *
 * The whole flow lives here now: confirm what we read off the site, the run,
 * the free result, and the report an address unlocks. The email link and the
 * magic link both land here too, so a visitor coming back on another device
 * gets their scan rather than an empty form.
 *
 * Not indexed. Every one of these is somebody's own result.
 */
export const metadata: Metadata = {
  title: "Your AI visibility report",
  robots: { index: false, follow: false },
};

export default async function ScanTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const db = supabaseAdmin();
  const { data: scan } = await db
    .from("scans")
    .select(
      "id, brand_name, domain, positioning, topic, topic_variants, market, status, engines, gated_engines, gated_status, unlocked_at",
    )
    .eq("public_token", token)
    .maybeSingle();

  if (!scan) notFound();

  /**
   * A finished scan arrives with its result already in the page.
   *
   * It used to render an empty shell and fetch the teaser from the browser,
   * which meant the person who followed a link from their inbox watched a
   * blank page decide what to show them. The same two calls the API routes
   * make, made here instead, and the client only polls for what is still
   * moving.
   */
  const complete = scan.status === "complete";
  const teaser = complete ? (await db.rpc("scan_teaser", { p_token: token })).data : null;
  const unlocked = complete && !!scan.unlocked_at;

  /**
   * A read that fails is not a report with nothing in it.
   *
   * /full wraps this same call for exactly that reason, so a database fault
   * reaches the screen as a failure rather than as an empty report. Rendering
   * it here bypassed the wrapper: an unlocked visitor following the link in
   * their email got a 500 instead of their report, on the one path that link
   * actually takes. It degrades to the client fetch now, which has the message
   * for it and a refresh behind it.
   */
  let full: UnlockPayload | null = null;
  if (unlocked) {
    try {
      full = await buildUnlockPayload(scan.id as string);
    } catch (err) {
      console.error(`[scan] could not render the report for ${scan.id}:`, err);
    }
  }

  /**
   * What the gate is holding, counted here rather than from the browser.
   *
   * The gate leads on this number, and a zero is as much a finding as a
   * fourteen: a scan with nothing to place into must not blur a table and ask
   * for an address for rows that are not there. Counting it on the client meant
   * the first paint always drew the blur and the promise, then corrected
   * itself - so the reader saw the wrong version first, and a reader who never
   * ran the script saw only the wrong version.
   *
   * Only for a finished scan that is still locked. Unlocked scans have the
   * rows themselves in `full`, and an unfinished one has nothing to count.
   *
   * Never fatal. The gate reads perfectly well without a number - it falls
   * back to the copy that does not name one - so a failure here degrades to
   * the client fetch rather than taking the page down.
   */
  let oppCount: number | null = null;
  if (complete && !unlocked) {
    try {
      oppCount = (await opportunityShape(scan.id as string)).count;
    } catch (err) {
      console.error(`[scan] could not count opportunities for ${scan.id}:`, err);
    }
  }

  const brand = (scan.brand_name as string | null) ?? null;
  const positioning = (scan.positioning as string | null) ?? null;
  const topic = (scan.topic as string | null) ?? "";
  const variants = (scan.topic_variants as string[] | null) ?? [];
  const engines = (scan.engines as string[] | null) ?? [];
  const gated = (scan.gated_engines as string[] | null) ?? [];
  /**
   * How far the gated pass has got, read here rather than defaulted in the
   * browser.
   *
   * The verify link calls completeUnlock, which stamps gated_status 'queued'
   * and starts the pass in after(), then redirects straight here - so this
   * page renders, every time, while that pass is queued or running. The client
   * assumed "none" and only learned otherwise from the /full fetch, which a
   * server-rendered report does not make. The banner therefore told the reader
   * the gated engines had not run, on the one screen the email exists to
   * deliver, and never took it back.
   */
  const gatedStatus = (scan.gated_status as string | null) ?? "none";
  const market = isMarket(scan.market) ? scan.market : "UK";

  return (
    <ScanFlow
      token={token}
      domain={scan.domain as string}
      brand={brand}
      positioning={positioning}
      topic={topic}
      market={market}
      variants={variants}
      status={scan.status as string}
      engines={engines}
      initialTeaser={teaser}
      initialFull={full}
      unlocked={unlocked}
      gatedEngines={gated}
      initialGatedStatus={gatedStatus}
      initialOppCount={oppCount}
    />
  );
}
