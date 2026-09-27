import EngineLogo from "@/components/EngineLogo";
import type { TierKey } from "@/components/TierName";
import { enginesFor } from "@/config/pricing";
import { listOf } from "@/config/scan-shape";
import { ENGINE_SPECS } from "@/lib/scan/engines";

/**
 * The engines a tier reads, as their own marks (pricing spec, Danny, 27 Sep
 * 2026, section 4): four on alwaystracked, five with Claude on every tier
 * above it, and "Includes Claude" beside the five. Stated as a fact about the
 * plan and nothing more - no claim that Claude matters more than the others.
 *
 * The list comes from `enginesFor` in pricing.ts, so the staircase, the table
 * and the tier pages cannot disagree about which tier reads what. The marks
 * are decorative to a screen reader; the sentence carries the names.
 */
export default function TierEngines({
  tier,
  size = 16,
  colour,
  style,
}: {
  tier: TierKey;
  size?: number;
  /** Text colour for the line, and for the single-colour ChatGPT mark. */
  colour?: string;
  style?: React.CSSProperties;
}) {
  const engines = enginesFor(tier);
  const claude = engines.includes("claude");
  const names = listOf(engines.map((e) => ENGINE_SPECS[e].label));
  return (
    <div
      className="tier-engines"
      style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", color: colour, ...style }}
    >
      <span className="sr-only">Reads {names}.</span>
      <span aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {engines.map((e) => (
          <EngineLogo key={e} engine={e} size={size} />
        ))}
      </span>
      {claude ? (
        <span style={{ fontSize: "12.5px", fontWeight: 600 }}>Includes Claude</span>
      ) : null}
    </div>
  );
}
