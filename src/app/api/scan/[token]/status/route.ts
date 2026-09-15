import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Polled by the browser during step 03. Status and step only, never results. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const { data } = await supabaseAdmin()
    .from("scans")
    .select("status, step, error, gated_status, gated_error")
    .eq("public_token", token)
    .maybeSingle();

  if (!data) return Response.json({ error: "not_found" }, { status: 404 });

  return Response.json(
    {
      status: data.status,
      step: data.step,
      error: data.error,
      // Polled again after unlock, while the email-gated engines run.
      gated_status: data.gated_status,
      gated_error: data.gated_error,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
