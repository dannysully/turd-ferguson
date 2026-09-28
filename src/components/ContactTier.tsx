"use client";

import { useSearchParams } from "next/navigation";

import TierName, { TIER_PLAIN } from "@/components/TierName";
import { CONTACT_TIER_PARAM } from "@/config/pricing";
import { SELECTION_PARAMS, parseSelection, picksLine, tierFromPlain } from "@/config/sector-selection";
import { T } from "@/config/tokens";

/** The id ContactForm's `<form>` carries, so the hidden picks below post with it. */
export const CONTACT_FORM_ID = "contact-form";

/**
 * What /contact says when a tier's CTA sent the visitor here with
 * `?tier=` (contactUrlFor), and a sector tile's call CTA with its picks as
 * well (`&sector=&clusters=&market=`, R69). alwaystracked is set up by hand,
 * with no checkout (Danny, 26 Sep 2026). Deliberately no reply time - none is
 * promised anywhere on the site.
 *
 * The picks travel with the enquiry as hidden inputs bound to the form by
 * its id, so the form itself stays outside this Suspense boundary and still
 * prerenders. Every value is validated here and again in the action; a
 * hand-edited link is dropped, never shown. Without JS the note and the
 * inputs are absent and the form works as ever.
 */
export default function ContactTier() {
  const params = useSearchParams();
  const tier = tierFromPlain(params.get(CONTACT_TIER_PARAM));
  if (!tier) return null;
  const sel = parseSelection(params);
  const picks = tier === "mentioned" || tier === "cited" ? picksLine(sel) : null;
  return (
    <div style={{ background: T.wash, borderRadius: "12px", padding: "14px 16px", marginBottom: "20px" }}>
      <input type="hidden" id="c-tier" form={CONTACT_FORM_ID} name={CONTACT_TIER_PARAM} value={TIER_PLAIN[tier]} />
      {picks && (
        <>
          {sel.sector && (
            <input type="hidden" id="c-sector" form={CONTACT_FORM_ID} name={SELECTION_PARAMS.sector} value={sel.sector} />
          )}
          <input type="hidden" id="c-clusters" form={CONTACT_FORM_ID} name={SELECTION_PARAMS.clusters} value={String(sel.qty)} />
          <input type="hidden" id="c-market" form={CONTACT_FORM_ID} name={SELECTION_PARAMS.market} value={sel.market} />
        </>
      )}
      {tier === "tracked" ? (
        <>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: T.ink }}>
            Setting up <TierName tier="tracked" />
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
            It is set up by hand for now, with no checkout. Tell us the client and the topic below and we will set the
            tracking up with you.
          </p>
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: T.ink }}>
            About <TierName tier={tier} />
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
            {picks ? `${picks}. ` : ""}This goes with your message, so there is no need to repeat it.
          </p>
        </>
      )}
    </div>
  );
}
