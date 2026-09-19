import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Polled by the browser during step 03. Status and step only, never results.
 *
 * What it deliberately no longer carries is `error` and `gated_error`.
 *
 * Those columns hold whatever the pass threw, truncated to 500 characters, and
 * most of what can land there is written for whoever is fixing it rather than
 * for the person who typed a domain into a marketing site. "could not store the
 * answers: duplicate key value violates unique constraint ...", a Postgres
 * message naming our tables, or a vendor error naming the vendor and the state
 * of our account with them - all of those reached the screen verbatim, because
 * the flow printed `data.error` as the failure message.
 *
 * The detail is not lost and was never only here: it stays in the column for
 * the admin page, which is where it belongs, and in the log. What changes is
 * that the public poll stops handing it out. Nothing a visitor can do about a
 * failed scan depends on knowing which insert failed - the one action is to run
 * it again, and the screen offers that on its own.
 *
 * gated_error goes for the same reason and was read by nobody: the flow tracks
 * the gated pass on gated_status alone.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  // A read that failed is not a token that does not exist. The poll treats any
  // answer without a status as "try the next tick", so this changes nothing the
  // visitor sees - but a database fault was being recorded as a 404, which is
  // the signal somebody debugging this route would read first and the one that
  // would send them looking for a bad token.
  const { data, error: readErr } = await supabaseAdmin()
    .from("scans")
    .select("status, step, gated_status")
    .eq("public_token", token)
    .maybeSingle();

  if (readErr) {
    console.warn("[scan] could not read the scan status: " + readErr.message);
    return Response.json(
      { error: "read_failed" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });

  return Response.json(
    {
      status: data.status,
      step: data.step,
      // Polled again after unlock, while the email-gated engines run.
      gated_status: data.gated_status,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
