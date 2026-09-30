import Link from "next/link";

import TierName from "@/components/TierName";
import { TIERS } from "@/config/pricing";
import { T } from "@/config/tokens";
import type { PromptCopy } from "@/lib/tracking/upgrade-prompts";

/**
 * One upgrade prompt, drawn inside the panel whose data triggers it
 * (BRIEF-2 T11 part 4, 30 Sep 2026; boards-3/CTAs.dc.html). Never a banner or
 * a modal. The words are upgrade-prompts.ts's; the button's label and page are
 * the tier's own in pricing.ts, with `?from=app`. In agency mode there is no
 * tier name and no button (the copy says so).
 *
 * Not yet: "Ask about these N" and "Hide for 30 days" wait on their routes
 * (/ask taking an upgrade cta, and a hide write); the dark alwayseverywhere
 * card waits on its panel.
 */
export default function UpgradePrompt({ copy }: { copy: PromptCopy }) {
  const tier = copy.tier ? TIERS.find((t) => t.key === copy.tier) : undefined;
  return (
    <div role="note" aria-label="Upgrade" style={{ margin: "14px 18px 18px", padding: "18px", borderRadius: "14px", background: T.wash, border: `1px solid ${T.washLine}`, display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span style={{ fontSize: "15px", fontWeight: 700, color: T.ink }}>{copy.title}</span>
        <span style={{ fontSize: "14px", lineHeight: 1.5, color: T.ink }}>
          {copy.lead}
          {copy.tier ? (
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              <TierName tier={copy.tier} />
            </span>
          ) : null}
          {copy.tail}
        </span>
      </div>
      {copy.button && tier ? (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link href={`${tier.href}?from=app`} style={{ display: "flex", alignItems: "center", height: "44px", padding: "0 16px", borderRadius: "12px", background: T.accent, color: T.surface, fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
            {tier.action}
          </Link>
        </div>
      ) : null}
      <span style={{ fontSize: "12px", color: T.soft }}>{copy.why}</span>
    </div>
  );
}
