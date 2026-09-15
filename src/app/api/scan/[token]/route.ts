import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The free result, step 04.
 *
 * This is the teaser and nothing more. The full leaderboard and the complete
 * source list are not in this payload at all - they are not fetched and hidden,
 * they are never sent. The blur in the UI is decoration over absent data.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const { data, error } = await supabaseAdmin().rpc("scan_teaser", { p_token: token });

  if (error) {
    return Response.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json(data, { headers: { "cache-control": "no-store" } });
}
