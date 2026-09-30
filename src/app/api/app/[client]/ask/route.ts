import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { askGate, askMail, askRecipient, readAskKeyword, recordAsk, upsellMode } from "@/lib/tracking/ask";
import { sendAsk } from "@/lib/tracking/ask-mail";
import { trackingDay } from "@/lib/tracking/decide";
import { fixtureMode } from "@/lib/tracking/fixture-mode";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A member's ask - BRIEF-2 T11 /ask, first used by Add a cluster's "Ask us to
 * pick one" (30 Sep 2026). Posted by a plain HTML form, the refused keyword in
 * the body. Rules, mail text and the cap are ask.ts; the send is ask-mail.ts.
 * Session and membership as the note route; the fixture sends nothing.
 * Returns to the Clusters page with `ask=sent|refused` and, on a send, the
 * toast's recipient word.
 */
export async function POST(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(slug)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const done = (r: "sent" | "refused", who?: "us" | "agency") =>
    NextResponse.redirect(new URL(`/app/${slug}/clusters?${new URLSearchParams({ ask: r, ...(who ? { to: who } : {}) })}`, req.url), 303);
  if (fixtureMode()) return done("refused");

  const email = await sessionEmail();
  if (!email) return NextResponse.redirect(new URL("/app/login", req.url), 303);
  const client = (await clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const keyword = readAskKeyword(form?.get("keyword"));
  if (!keyword) return done("refused");

  const db = supabaseAdmin();
  // The account is read here, server-side only; clientsFor keeps account_id out of what pages get.
  const { data: row, error: rowErr } = await db.from("client_domains").select("account_id").eq("id", client.id).maybeSingle();
  if (rowErr || !row) {
    console.warn(`[app] ask could not read the client's account: ${rowErr?.message ?? "none"}`);
    return done("refused");
  }
  const { data: account, error } = await db.from("accounts").select("upsell_mode, upsell_contact_email").eq("id", row.account_id as string).maybeSingle();
  if (error || !account) {
    console.warn(`[app] ask could not read the account: ${error?.message ?? "none"}`);
    return done("refused");
  }
  const mode = upsellMode(account.upsell_mode);
  const recipient = askRecipient(mode, (account.upsell_contact_email as string | null) ?? null);
  if (!recipient) return done("refused");
  const today = trackingDay();
  const gate = await askGate(db, { clientId: client.id, email, today });
  if (!gate.ok) {
    console.warn(`[app] ask refused: ${gate.reason}`);
    return done("refused");
  }

  const mail = askMail({ brand: client.brand ?? client.domain, domain: client.domain, member: email, keyword, mode });
  if (!(await sendAsk({ agencyContact: recipient.to, replyTo: email, ...mail }))) return done("refused");
  if (!(await recordAsk(db, { clientId: client.id, email, cta: "cluster", trigger: { keyword } }))) console.warn("[app] ask sent but not recorded");
  // The toast's words are rebuilt on the page (askToast) from this one word, never passed as text.
  return done("sent", recipient.to ? "agency" : "us");
}
