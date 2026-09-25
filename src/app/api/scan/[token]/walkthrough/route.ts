import { SCAN_LIMITS } from "@/config/contact";
import { isPlausibleEmail, normalizeEmail } from "@/lib/email-address";
import { clientIp, hashIp } from "@/lib/scan/ip";
import { markClaimed } from "@/lib/scan/unlock";
import { sendWalkthroughAlert } from "@/lib/scan/walkthrough-mail";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Requests one caller may make in a rolling day. Each one emails Danny. */
const PER_IP_PER_DAY = 5;

/**
 * A request for a walkthrough of alwaystracked - a Loom video or a demo call.
 *
 * The result page's only call to action since 24 September 2026, when the
 * email gate came off. What it does: stores the request, stamps the scan as
 * claimed (transcripts are kept indefinitely since 24 September, so the stamp
 * now marks a scan somebody asked about rather than saving its answers from a
 * purge), and emails Danny. It sends nothing to the
 * visitor - Danny replies himself, which is the point of asking for him.
 */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  let body: { email?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const kind = body.kind === "demo" ? "demo" : body.kind === "video" ? "video" : null;
  if (!kind) return Response.json({ error: "bad_kind", message: "Pick a video or a demo." }, { status: 400 });

  const email = normalizeEmail(body.email ?? "");
  if (email.length > SCAN_LIMITS.email || !isPlausibleEmail(email)) {
    return Response.json({ error: "bad_email", message: "That email does not look right." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: scan, error: readErr } = await db
    .from("scans")
    .select("id, domain, brand_name, topic, unlocked_at")
    .eq("public_token", token)
    .maybeSingle();
  if (readErr) {
    console.warn("[walkthrough] could not read the scan: " + readErr.message);
    return Response.json({ error: "read_failed", message: "We could not reach the checker. Please try again." }, { status: 502 });
  }
  if (!scan) return Response.json({ error: "not_found" }, { status: 404 });

  const ipHash = hashIp(clientIp(req));
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count, error: countErr } = await db
    .from("walkthrough_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (countErr) {
    console.warn("[walkthrough] could not count recent requests: " + countErr.message);
    return Response.json({ error: "read_failed", message: "We could not reach the checker. Please try again." }, { status: 502 });
  }
  if ((count ?? 0) >= PER_IP_PER_DAY) {
    return Response.json(
      { error: "rate_limited", message: "We have your requests - Danny will be in touch." },
      { status: 429 },
    );
  }

  // Same scan, same address, same kind: already asked. Say yes, alert nobody.
  const { data: inserted, error: insertErr } = await db
    .from("walkthrough_requests")
    .upsert({ scan_id: scan.id, email, kind, ip_hash: ipHash }, { onConflict: "scan_id,email,kind", ignoreDuplicates: true })
    .select("id");
  if (insertErr) {
    console.error("[walkthrough] could not store the request: " + insertErr.message);
    return Response.json({ error: "write_failed", message: "That did not go through. Please try again." }, { status: 502 });
  }
  const fresh = inserted?.[0]?.id as string | undefined;

  // Claimed, so the purge keeps the transcripts. Never fatal: the request is stored.
  if (!scan.unlocked_at) await markClaimed(scan.id as string);

  if (fresh) {
    const sent = await sendWalkthroughAlert({
      kind,
      email,
      domain: scan.domain as string,
      brand: (scan.brand_name as string | null) ?? null,
      topic: (scan.topic as string | null) ?? null,
      token,
    });
    if (sent) {
      const { error: notedErr } = await db
        .from("walkthrough_requests")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", fresh);
      if (notedErr) console.warn("[walkthrough] sent but could not stamp notified_at: " + notedErr.message);
    }
  }

  return Response.json({
    ok: true,
    message:
      kind === "video"
        ? "Thanks. Danny will record a walkthrough and send it to " + email + "."
        : "Thanks. Danny will email " + email + " to find a time.",
  });
}
