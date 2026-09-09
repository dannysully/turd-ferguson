"use server";

import { Resend } from "resend";
import { checkAiOverview, DataForSeoNotConfigured, normalizeDomain } from "@/lib/dataforseo";

/**
 * Scan request submission.
 *
 * Two things happen server-side. We run one AI Overview check for the topic
 * through DataForSEO, and we email the request plus whatever that check
 * returned. The visitor is not shown a figure - the report goes out by hand,
 * so nothing unverified reaches the page.
 *
 * Exactly one API call per submission, so the cost per scan is predictable,
 * and we log the cost DataForSEO returns rather than a price-list estimate.
 *
 * If DataForSEO is unconfigured or errors, the submission still goes through -
 * the lead matters more than the lookup. If RESEND_API_KEY is unset the action
 * returns an error the user can act on, and never reports a false success.
 */

const DESTINATION = process.env.CONTACT_EMAIL_DESTINATION ?? "hello@alwayscited.com";
const FROM = process.env.SCAN_FROM_EMAIL ?? "alwayscited <onboarding@resend.dev>";

export type ScanState =
  | { status: "idle" }
  | { status: "success"; email: string }
  | { status: "error"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitScanRequest(
  _prev: ScanState,
  formData: FormData
): Promise<ScanState> {
  const domain = formData.get("domain")?.toString().trim() ?? "";
  const topic = formData.get("topic")?.toString().trim() ?? "";
  const market = formData.get("market")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";

  if (!domain || !topic || !email) {
    return { status: "error", message: "We need the domain, the topic and your email." };
  }
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "That email address does not look right." };
  }

  /* One check, one call. Failure here must not lose the lead. */
  let findings = "AI Overview check: not run.";
  let costNote = "";
  try {
    const result = await checkAiOverview({ question: topic, market, brandDomain: domain });
    costNote = `DataForSEO cost: $${result.cost.toFixed(4)}`;
    if (!result.overviewPresent) {
      findings = "AI Overview check: no Overview appeared for this topic in this market.";
    } else {
      const top = result.sources.slice(0, 10).map((x, i) => `  ${i + 1}. ${x.domain}`).join("\n");
      findings = [
        `AI Overview check: Overview appeared.`,
        `${normalizeDomain(domain)} cited: ${result.brandCited ? "YES" : "no"}`,
        `Cited sources (${result.sources.length} distinct):`,
        top,
      ].join("\n");
    }
    console.log("[scan]", { domain, topic, market, cost: result.cost, brandCited: result.brandCited });
  } catch (err) {
    findings =
      err instanceof DataForSeoNotConfigured
        ? "AI Overview check: skipped, DataForSEO credentials not configured."
        : `AI Overview check: failed (${err instanceof Error ? err.message : "unknown"}).`;
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      status: "error",
      message:
        "We could not submit that just now. Email hello@alwayscited.com with the domain and topic and we will run it by hand.",
    };
  }

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: FROM,
      to: DESTINATION,
      replyTo: email,
      subject: `Scan request: ${domain}`,
      text: [
        `Domain: ${domain}`,
        `Topic:  ${topic}`,
        `Market: ${market || "not given"}`,
        `Email:  ${email}`,
        "",
        findings,
        costNote,
      ].join("\n"),
    });
    if (error) {
      return {
        status: "error",
        message:
          "We could not submit that just now. Email hello@alwayscited.com with the domain and topic and we will run it by hand.",
      };
    }
  } catch {
    return {
      status: "error",
      message:
        "We could not submit that just now. Email hello@alwayscited.com with the domain and topic and we will run it by hand.",
    };
  }

  return { status: "success", email };
}
