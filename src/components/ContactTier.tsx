"use client";

import { useSearchParams } from "next/navigation";

import TierName, { TIER_PLAIN } from "@/components/TierName";
import { CONTACT_TIER_PARAM } from "@/config/pricing";
import { T } from "@/config/tokens";

/**
 * What /contact says when a tier's CTA sent the visitor here with
 * `?tier=` (contactUrlFor). Only alwaystracked is carried today: there is no
 * checkout, so it is set up by hand (Danny, 26 Sep 2026). Deliberately no
 * reply time - none is promised anywhere on the site.
 *
 * Rendered inside a Suspense boundary on the page, so the form around it
 * still prerenders; without JS the note is absent and the form works as ever.
 */
export default function ContactTier() {
  const tier = useSearchParams().get(CONTACT_TIER_PARAM);
  if (tier !== TIER_PLAIN.tracked) return null;
  return (
    <div style={{ background: T.wash, borderRadius: "12px", padding: "14px 16px", marginBottom: "20px" }}>
      <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: T.ink }}>
        Setting up <TierName tier="tracked" />
      </p>
      <p style={{ margin: "4px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
        It is set up by hand for now, with no checkout. Tell us the client and the topic below and we will set the
        tracking up with you.
      </p>
    </div>
  );
}
