import { sendVerificationEmail } from "@/lib/scan/verify-email";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A second send inside this window is treated as a double click, not a retry. */
const COOLDOWN_MS = 60_000;

/**
 * Sends the verification email again.
 *
 * With verification in front of the report, a message that does not arrive is
 * the whole funnel lost, so the pending screen needs a way out that does not
 * involve starting the scan again.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const db = supabaseAdmin();

  const { data: scan } = await db
    .from("scans")
    .select("id, domain, brand_name")
    .eq("public_token", token)
    .maybeSingle();

  if (!scan) return Response.json({ error: "not_found" }, { status: 404 });

  // The most recent address to ask for this scan, and only if it is still
  // waiting: a verified lead has nothing to resend.
  const { data: lead } = await db
    .from("leads")
    .select("id, email, verify_token, verify_sent_at, verified_at")
    .eq("scan_id", scan.id)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lead) return Response.json({ error: "nothing_pending" }, { status: 409 });

  const sentAt = lead.verify_sent_at ? Date.parse(lead.verify_sent_at as string) : 0;
  if (sentAt && Date.now() - sentAt < COOLDOWN_MS) {
    return Response.json(
      { ok: true, throttled: true, message: "That one is already on its way." },
      { status: 200 },
    );
  }

  const sent = await sendVerificationEmail({
    email: lead.email as string,
    brand: (scan.brand_name as string | null) ?? (scan.domain as string),
    verifyToken: lead.verify_token as string,
    leadId: lead.id as string,
  });

  if (!sent) {
    return Response.json(
      { error: "email_failed", message: "Still no luck. Try again in a minute." },
      { status: 502 },
    );
  }

  // The address is deliberately not returned.
  //
  // The public token is the credential for this route, and a token reaches
  // people who never typed the address: it is in a shared link, and the domain
  // cache hands a completed scan's token to the next visitor who scans the same
  // site. A pending lead belongs to whoever submitted it, so echoing it here
  // discloses one stranger's email address to another through the ordinary
  // funnel. The screen never used this field - it renders the address the
  // visitor typed, and reads only "message" off this response.
  return Response.json({ ok: true });
}
