import { buildUnlockPayload } from "@/lib/scan/unlock";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The full result for a scan that has already been unlocked.
 *
 * This is what makes the return visit work. The unlock response is sent once,
 * to the tab that asked for it, and nothing could rebuild it afterwards: coming
 * back to the link in the email landed on a page that gated the visitor all
 * over again.
 *
 * The public token is the credential here, exactly as it is for the teaser. A
 * scan that was never unlocked returns nothing, so this cannot be used to walk
 * around the gate.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const db = supabaseAdmin();

  const { data: scan } = await db
    .from("scans")
    .select("id, unlocked_at, gated_engines, gated_status")
    .eq("public_token", token)
    .maybeSingle();

  if (!scan) return Response.json({ error: "not_found" }, { status: 404 });
  if (!scan.unlocked_at) return Response.json({ error: "locked" }, { status: 403 });

  const payload = await buildUnlockPayload(scan.id as string);

  return Response.json(
    {
      unlocked: true,
      gated_engines: ((scan.gated_engines ?? []) as string[]).filter(Boolean),
      gated_status: scan.gated_status ?? "none",
      ...payload,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
