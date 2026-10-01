import { recentReadingLine, recentReadingRefusal } from "@/lib/coverage/domain-ceiling";
import { coverageFixture } from "@/lib/coverage/draft-fixture";
import { isPlausibleDomain, normalizeDomain } from "@/lib/scan/domain";

/**
 * Step 2's check on a client domain the visitor typed (R140 part 4, Danny,
 * 30 Sep 2026, danny.md lines 128-133: "check the per-domain 30-day ceiling as
 * soon as the client domain is known in step 2 and show the message there").
 * The window is FREE_RUN_DAYS, 7 days since 1 Oct 2026 (danny.md line 170).
 *
 * The draft route checks the domain it found. When none was found, or the
 * visitor corrects it, the field asks here on blur, so the refusal is under
 * the field before "Run the reading" rather than after it. The run route
 * still checks for itself; this is the same function and the same sentence,
 * said earlier.
 *
 * Spends nothing and starts nothing: one indexed read of `campaigns`, and the
 * answer is a sentence the run route already gives anyone who posts. No
 * Turnstile, because a widget per keystroke is no bound, and no IP is read.
 * Anything that does not look like a domain is answered null - the run route
 * names that error itself.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { domain?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request", message: "Send a JSON body with the domain." }, { status: 400 });
  }
  const domain = normalizeDomain(typeof body.domain === "string" ? body.domain : "");
  if (!isPlausibleDomain(domain)) return Response.json({ refusal: null });
  // Local parity only (draft-fixture.ts): no database, so the refusal state is
  // drawn for one made-up domain. Throws in production.
  if (coverageFixture()) {
    return Response.json({ refusal: domain === FIXTURE_READ_DOMAIN ? recentReadingLine(domain) : null });
  }
  return Response.json({ refusal: await recentReadingRefusal(domain) });
}

/** The one domain the fixture treats as read inside the window. */
const FIXTURE_READ_DOMAIN = "already-read.example";
