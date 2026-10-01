import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { mailFrom } from "@/config/mail-from";
import { headerSafe } from "@/lib/email-header";
import { flagFor, flagOn, type LifecycleEmail, type Rendered } from "@/lib/email/lifecycle";

/**
 * The lifecycle emails' one sender (R159 part 3, 1 Oct 2026). Each call site
 * asks lifecycleOn first; every flag is false until Danny approves that
 * preview at /admin/emails, so nothing here sends until he does. sendLifecycle
 * is called only from the signed Stripe webhook: the welcome to the owner
 * signup.ts just stored, plan_ended to the client's live owners. The invite
 * asks lifecycleOn too, but goes through invite-mail.ts and its owner caps.
 *
 * Returns false rather than throwing, as the other senders do.
 */
export async function lifecycleOn(db: SupabaseClient, name: LifecycleEmail): Promise<boolean> {
  const { data, error } = await db.from("app_settings").select("value").eq("key", flagFor(name)).maybeSingle();
  if (error) {
    console.error(`[mail] ${flagFor(name)} not read, treated as off: ${error.message}`);
    return false;
  }
  return flagOn(data?.value);
}

export async function sendLifecycle(input: { memberEmail: string; mail: Rendered }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[mail] RESEND_API_KEY is not set, lifecycle email not sent");
    return false;
  }
  try {
    const { error } = await new Resend(key).emails.send({
      from: mailFrom(),
      to: input.memberEmail,
      subject: headerSafe(input.mail.subject),
      html: input.mail.html,
      text: input.mail.text,
    });
    if (error) {
      console.error("[mail] lifecycle email rejected", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[mail] lifecycle email failed", err);
    return false;
  }
}
