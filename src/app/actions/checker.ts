"use server";

import { redirect } from "next/navigation";
import { Resend } from "resend";
import { runScan, signUp, startScan, ScanError } from "@/lib/scan";
import type { Market, RunScanResponse, StartScanResponse } from "@/lib/scan";

/**
 * The checker's server actions. Thin wrappers over the scan adapter so the
 * client component never knows whether it is talking to fixtures or the live
 * API. Errors come back as a discriminated kind the UI renders, never a stack.
 */

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "unreachable" | "rate_limited" | "api_down" | "invalid"; message: string };

function fail(e: unknown): ActionResult<never> {
  if (e instanceof ScanError) return { ok: false, kind: e.kind, message: e.message };
  console.error("[checker]", e);
  return { ok: false, kind: "api_down", message: "Something broke at our end, not yours." };
}

export async function startScanAction(domain: string): Promise<ActionResult<StartScanResponse>> {
  const value = domain.trim();
  if (!/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(value)) {
    return { ok: false, kind: "invalid", message: "Enter a domain, like client-domain.com" };
  }
  try {
    return { ok: true, data: await startScan({ domain: value }) };
  } catch (e) {
    return fail(e);
  }
}

export async function runScanAction(input: {
  scan_id: string;
  topic: string;
  market: Market;
}): Promise<ActionResult<RunScanResponse>> {
  if (!input.topic.trim()) return { ok: false, kind: "invalid", message: "Tell us the topic first." };
  try {
    return { ok: true, data: await runScan(input) };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Sign-up: hand the scan to the product API, and also tell us. The second
 * part is the lead capture that matters until the product is live.
 */
export async function signUpAction(input: {
  scan_id: string;
  email: string;
  domain: string;
  topic: string;
  market: string;
}): Promise<ActionResult<{ ok: true }>> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return { ok: false, kind: "invalid", message: "That email address does not look right." };
  }
  try {
    await signUp({ scan_id: input.scan_id, email: input.email });
  } catch (e) {
    return fail(e);
  }

  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      await new Resend(key).emails.send({
        from: process.env.SCAN_FROM_EMAIL ?? "alwayscited <onboarding@resend.dev>",
        to: process.env.CONTACT_EMAIL_DESTINATION ?? "hello@alwayscited.com",
        replyTo: input.email,
        subject: `Scan sign-up: ${input.domain}`,
        text: [`Domain: ${input.domain}`, `Topic:  ${input.topic}`, `Market: ${input.market}`, `Email:  ${input.email}`, `Scan:   ${input.scan_id}`].join("\n"),
      });
    } catch (e) {
      console.error("[checker] notify failed", e);
    }
  }
  return { ok: true, data: { ok: true } };
}

/**
 * No-JS path. The domain form posts here when JavaScript is off; we send the
 * visitor to /scan, which runs startScan on the server and renders state 2.
 * With JS the form's onSubmit prevents default and this never fires.
 */
export async function submitDomainForm(formData: FormData) {
  const domain = (formData.get("domain") ?? "").toString().trim();
  redirect(`/scan?${new URLSearchParams({ domain })}#scan`);
}
