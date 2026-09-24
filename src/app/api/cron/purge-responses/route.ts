import { NextResponse } from "next/server";

import { constantTimeEqual } from "@/lib/constant-time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The nightly purge, which no longer purges anything.
 *
 * **Danny's decision, 24 September 2026: transcripts are kept indefinitely.**
 * What each engine said is the evidence behind every figure a reading
 * publishes, and a report whose numbers can no longer be read back to the
 * words that produced them is a score nobody can audit - which is the thing
 * `/about` says this product exists not to be.
 *
 * This route used to clear `scan_answers.response_text` for every unclaimed
 * scan past `response_retention_days`. It does not clear anything now, and the
 * body it returns says so rather than reporting a zero that would read like a
 * quiet night.
 *
 * ## Why the route is still here
 *
 * Because the thing that calls it is not in this directory. The cron entry
 * lives in the project's deploy configuration, outside `src`, and a registered
 * cron whose route has been deleted is a nightly 404 in the logs and an alert
 * nobody can action. The route stays, answers, and states the retention
 * decision; removing the schedule is the separate change, and it belongs with
 * whoever can edit that file.
 *
 * ## What was deliberately not done
 *
 * The `response_retention_days` row in `app_settings` is untouched. It is
 * data, deleting live rows is not ours, and nothing reads it now - the same
 * standing the `require_email_verification` row got when the email gate went.
 * `/legal` carries the retention sentence and `reading-retention.test.mts`
 * holds the two in agreement, so the policy and the behaviour cannot drift
 * apart without something failing.
 *
 * Vercel Cron calls this with Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });

  /**
   * Still authenticated, even though it now does nothing.
   *
   * An endpoint that answers every caller with the shape of an internal job is
   * an endpoint somebody will point something at. Constant-time, because a
   * comparison that returns early leaks the prefix it matched.
   */
  // Compared against the whole `Bearer <secret>` header, which is what Vercel
  // sends - the same shape as the reaper next door. Splitting the prefix off
  // and comparing the bare secret is the quiet failure `cron-schedule.test.mts`
  // exists for: the schedule still fires and the work silently never runs.
  const offered = req.headers.get("authorization") ?? "";
  if (!constantTimeEqual(offered, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    purged: false,
    answers_cleared: 0,
    retention: "indefinite",
    note:
      "Transcripts are kept indefinitely (Danny, 24 September 2026). This job clears nothing. " +
      "The zero above is the decision, not an empty night.",
  });
}
