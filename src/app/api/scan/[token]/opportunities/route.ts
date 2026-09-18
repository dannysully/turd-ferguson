import { opportunityShape } from "@/lib/scan/unlock";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The shape of the gated finding, for the locked screen.
 *
 * The gate only works if it says what is behind it. A blurred table with no
 * number is a blurred table; "eleven pages, ranked" is a reason to type an
 * address. So this returns the count and the kinds and nothing else - never a
 * domain, never a question, never a row.
 *
 * That split is the point. The teaser RPC is deliberately built so the gated
 * data is absent from the payload rather than hidden in it, and this keeps
 * that property: a locked visitor who reads the network tab learns how many
 * opportunities they have, which is exactly what the screen already tells
 * them.
 *
 * Unlocked scans are served too, so the screen has one source for the count
 * whichever side of the gate it is on.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const { data: scan } = await supabaseAdmin()
    .from("scans")
    .select("id, status")
    .eq("public_token", token)
    .maybeSingle();

  if (!scan) return Response.json({ error: "not_found" }, { status: 404 });

  // Before the scan finishes there is nothing to count, and counting it early
  // would report a number that then grows as the last engines land.
  if (scan.status !== "complete") {
    return Response.json(
      { count: 0, answers: 0, kinds: {}, ready: false },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const shape = await opportunityShape(scan.id as string);
  return Response.json({ ...shape, ready: true }, { headers: { "cache-control": "no-store" } });
}
