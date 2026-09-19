import type { Metadata } from "next";

import HeroSection from "@/components/scan/HeroSection";

/**
 * The landing for a domain submitted from elsewhere on the site. It prefills
 * the field and nothing more. Not indexed - it is a state, not a page.
 *
 * It is also where a verification link lands when it cannot do its job, which
 * is why it reads `verify`. Both of those redirects existed and neither said
 * anything: somebody who clicked the link in their email arrived at a plain
 * scan form, with the report they had just proved an address for nowhere on
 * screen and no hint that anything had gone wrong. A dead end that looks like
 * a home page is worse than an error, because there is nothing to act on.
 */
export const metadata: Metadata = {
  title: "Checking your client's domain",
  robots: { index: false, follow: false },
};

/**
 * One sentence for what happened and one for what to do about it. `failed` is
 * retryable and says so - the same link works on the next click, because the
 * verify route recovers a lead whose unlock did not land. `invalid` is not, so
 * it points at the only thing that still works.
 */
const VERIFY_NOTICE: Record<string, string> = {
  failed:
    "We could not open your report just now. Click the link in your email again in a moment - it will still work.",
  invalid:
    "That link does not match a report we hold. It may have been truncated by an email client. Run a scan below and we will send you a fresh one.",
};

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; verify?: string }>;
}) {
  const { domain = "", verify } = await searchParams;
  return <HeroSection initialDomain={domain} notice={verify ? VERIFY_NOTICE[verify] ?? null : null} />;
}
