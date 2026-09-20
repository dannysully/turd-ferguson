import TierName, { type TierKey } from "@/components/TierName";
import { TIERS } from "@/config/pricing";
import { splitPriceLabel } from "@/config/price-label";
import { CARD, GRID12, H2, MICRO, SHELL, T } from "@/config/tokens";

/**
 * Packages and white label - Packages.dc.html.
 *
 * The money comes from src/config/pricing.ts and the words come from the
 * board. Splitting it that way means the homepage cannot quote a price the
 * pricing table and the package pages disagree with, while the descriptive
 * copy still matches the design.
 *
 * Every lockup goes through TierName, including the ones inside list items
 * and inside the dark card, because AGENTS.md says that is the only thing
 * that colours a tier name.
 */

/**
 * The label, with its qualifiers set smaller than the number.
 *
 * The split is in `config/price-label.ts`, which has no JSX and therefore has
 * an executor. What it is protecting against is one bug made twice already -
 * `c2bf546` in copy and the deleted `priceFor` in config - a floor rendered as
 * a flat price, which is a number an agency quotes their client before finding
 * out it moves.
 */
function priceNode(label: string): React.ReactNode {
  const { prefix, figure, suffix } = splitPriceLabel(label);
  return (
    <>
      {prefix ? <span style={perMo}>{prefix}</span> : null}
      {figure}
      {suffix ? <span style={perMo}>{suffix}</span> : null}
    </>
  );
}

const li: React.CSSProperties = {
  fontSize: "13.5px",
  lineHeight: 1.55,
  paddingTop: "10px",
  borderTop: `1px solid ${T.hair}`,
};

const ul: React.CSSProperties = {
  margin: "18px 0 0",
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  flexGrow: 1,
};

const tierWord: React.CSSProperties = { fontSize: "15px", fontWeight: 700, letterSpacing: "-0.022em" };
const under: React.CSSProperties = { fontSize: "13px", color: T.soft, marginTop: "4px" };
const priceStyle: React.CSSProperties = {
  fontSize: "36px",
  fontWeight: 700,
  letterSpacing: "-0.035em",
  lineHeight: 1.1,
  marginTop: "18px",
  color: T.ink,
};
const perMo: React.CSSProperties = { fontSize: "15px", fontWeight: 600, color: T.soft, letterSpacing: 0 };

/**
 * What the homepage says about each tier that pricing.ts does not hold: the
 * one-line positioning under the lockup, the badge, and the feature list.
 *
 * `Record<TierKey, ...>` rather than four hand-written cards, because the four
 * cards were four fixed rungs picked by name off a list that can grow. A fifth
 * tier in `pricing.ts` used to reach /compare, its own package page, its
 * JSON-LD and the tier journey, and silently not appear on the homepage
 * packages grid - the one surface a buyer actually lands on. It is a missing
 * key and a compile error now.
 *
 * The prices, the basis lines and the emphasis are NOT here. They are read off
 * the tier, so the homepage cannot quote a number the package page disagrees
 * with - and the basis in particular travels with every price rather than with
 * the one card that happened to be given it by hand.
 */
const CARD_COPY: Record<TierKey, { under: string; flag?: string; items: React.ReactNode[] }> = {
  tracked: {
    under: "The map. You do the placing",
    items: [
      "A locked question set across the clusters that matter to the account, so each reading is comparable with the last",
      "Every source behind every answer, and what kind of publication each one is",
      "So you know where you need placing, and on what sort of site",
      "You run the outreach",
    ],
  },
  mentioned: {
    under: "We do the placing for you",
    items: [
      <>
        Everything in <TierName tier="tracked" />, and we manage the outreach
      </>,
      "Editorial placements in the source pages, links included",
      "Citation reporting on every placement",
    ],
  },
  cited: {
    under: "The full push on AI citations and Google rankings together",
    flag: "Most taken",
    items: [
      <>
        Everything in <TierName tier="mentioned" />, at a higher volume
      </>,
      "Placements chosen to move the Google position as well as the citation",
      "Rank tracking on the money keywords alongside the question set",
    ],
  },
  everywhere: {
    under: "All of it, across a portfolio",
    items: ["Multiple clients under one agreement", "Priced on volume, not per seat", "Your dashboards, your branding"],
  },
};

function Card({
  tier,
  under: sub,
  price,
  basis,
  items,
  featured,
  flag,
}: {
  tier: TierKey;
  under: string;
  price: React.ReactNode;
  basis?: string;
  items: React.ReactNode[];
  featured?: boolean;
  flag?: string;
}) {
  return (
    <div
      className="ac-row"
      style={{
        ...CARD,
        border: `1px solid ${featured ? T.accent : T.line}`,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
        <div style={tierWord}>
          <TierName tier={tier} />
        </div>
        {/* The badge belongs to its card, so it stamps .12s behind it rather
            than arriving as a second thing beside it. `--ac-i` inherits from
            the card, so it never needs to know which column it is in. */}
        {flag ? <div className="ac-stamp" style={{ ...MICRO, color: T.accent }}>{flag}</div> : null}
      </div>
      <div style={under}>{sub}</div>
      <div style={priceStyle}>{price}</div>
      {basis ? <div style={{ fontSize: "12.5px", lineHeight: 1.5, color: T.soft, marginTop: "6px" }}>{basis}</div> : null}
      <ul style={ul}>
        {items.map((item, i) => (
          <li key={i} style={{ ...li, color: featured ? T.ink : T.soft }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Packages() {

  return (
    <section style={{ ...SHELL, marginTop: "44px", display: "flex", flexDirection: "column", gap: "34px" }}>
      {/* Packages */}
      <div id="packages" style={{ scrollMarginTop: "5rem" }}>
        <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
          <h2 style={{ ...H2, gridColumn: "span 4" }}>Packages</h2>
          <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Monthly, white-labelled, no minimum term. The price is here because you should not have to sit through a
            call to find out what something costs.
          </p>
        </div>

        {/* In the order pricing.ts lists them, which is ascending intensity -
            so the grid cannot fall out of step with /compare or the tier
            journey, both of which read the same order off the same array. */}
        <div className="package-grid">
          {TIERS.map((t) => (
            <Card
              key={t.id}
              tier={t.key}
              under={CARD_COPY[t.key].under}
              flag={CARD_COPY[t.key].flag}
              featured={t.emphasis}
              price={priceNode(t.priceLabel)}
              basis={t.priceBasis}
              items={CARD_COPY[t.key].items}
            />
          ))}
        </div>
      </div>

      {/* White label */}
      <div id="white-label" style={{ scrollMarginTop: "5rem" }}>
        <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
          <h2 style={{ ...H2, gridColumn: "span 4" }}>White label</h2>
          <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            How the work reaches your client, and how the account runs.
          </p>
        </div>

        <div className="on-dark white-label" style={{ background: T.ink, borderRadius: "18px", padding: "32px" }}>
          <div className="ac-row">
            <div style={{ ...MICRO, color: T.faint }}>Your brand on everything the client sees</div>
            <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.65, color: "#e8e8ea" }}>
              Dashboards, reports and placement summaries carry your logo, and the dashboard can sit on your own
              subdomain. Nothing a client opens says <TierName tier="cited" /> on it.
            </p>
          </div>
          <div className="ac-row">
            <div style={{ ...MICRO, color: T.faint }}>How the account runs</div>
            <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.65, color: "#e8e8ea" }}>
              Monthly, no minimum term, one invoice to you. We work through you and never contact your client, which is
              in the agreement rather than just the sales call.
            </p>
          </div>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: "13.5px", color: T.soft, lineHeight: 1.65 }}>
        <TierName tier="cited" /> is built and run by the senior team at{" "}
        <a href="https://nomadadigital.co.uk" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
          Nomada Digital
        </a>
        .
      </p>
    </section>
  );
}
