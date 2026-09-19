import TierName, { type TierKey } from "@/components/TierName";
import { TIERS } from "@/config/pricing";
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
 * The price, as its label rather than rebuilt from the number.
 *
 * This read `basePrice` and assembled `$99` + `/mo`, which dropped the "from"
 * that `TIERS[0].priceLabel` carries - so the homepage card said a flat
 * "$99/mo" while /alwaystracked, its JSON-LD and the basis sentence four
 * pixels below all said "from $99/mo". The card contradicted its own next
 * line: "20 questions, checked weekly. More questions or a tighter cadence
 * moves the price."
 *
 * It is the same bug `priceFor` in pricing.ts had already been fixed for, on
 * the surface with the most traffic, and it is the expensive direction to get
 * wrong - a floor shown as a flat price is a number an agency quotes their
 * client before finding out it moves. PackagePage renders `priceLabel`
 * straight for exactly this reason; the homepage does now too.
 */
const labelOf = (id: string) => TIERS.find((t) => t.id === id)?.priceLabel ?? "";

/**
 * The basis under the price, read from pricing.ts rather than typed here.
 *
 * It was typed here, as a near-copy of `TIERS[0].priceBasis` with a different
 * tail, which is the same duplication the price itself is deliberately not:
 * the comment on `priceBasis` says the basis travels with the number so an
 * agency cannot quote $99 and then find the price moves with prompt count.
 * A second copy is exactly how it stops travelling with it.
 */
const basisOf = (id: string) => TIERS.find((t) => t.id === id)?.priceBasis;

/**
 * The label, with its qualifiers set smaller than the number.
 *
 * The board's treatment is a 36px figure with a quiet "/mo" beside it, and
 * "from" is the same kind of word - a qualifier on the number, not part of
 * it. Both are de-emphasised and neither is dropped, so the card keeps the
 * board's typography and still says the whole of what pricing.ts says.
 *
 * Anything that is not a price - "Book a call" - has no number to size
 * against and is rendered as it is.
 */
function priceNode(label: string): React.ReactNode {
  if (!label.includes("$")) return label;
  const from = label.startsWith("from ");
  const rest = from ? label.slice("from ".length) : label;
  const perMoSuffix = rest.endsWith("/mo");
  const figure = perMoSuffix ? rest.slice(0, -"/mo".length) : rest;
  return (
    <>
      {from ? <span style={perMo}>from </span> : null}
      {figure}
      {perMoSuffix ? <span style={perMo}>/mo</span> : null}
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
        {flag ? <div style={{ ...MICRO, color: T.accent }}>{flag}</div> : null}
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

        <div className="package-grid">
          <Card
            tier="tracked"
            under="The map. You do the placing"
            price={priceNode(labelOf("tracked"))}
            basis={basisOf("tracked")}
            items={[
              "A locked question set across the clusters that matter to the account, so each reading is comparable with the last",
              "Every source behind every answer, and what kind of publication each one is",
              "So you know where you need placing, and on what sort of site",
              "You run the outreach",
            ]}
          />

          <Card
            tier="mentioned"
            under="We do the placing for you"
            price={priceNode(labelOf("mentioned"))}
            items={[
              <>
                Everything in <TierName tier="tracked" />, and we manage the outreach
              </>,
              "Editorial placements in the source pages, links included",
              "Citation reporting on every placement",
            ]}
          />

          <Card
            tier="cited"
            flag="Most taken"
            featured
            under="The full push on AI citations and Google rankings together"
            price={priceNode(labelOf("cited"))}
            items={[
              <>
                Everything in <TierName tier="mentioned" />, at a higher volume
              </>,
              "Placements chosen to move the Google position as well as the citation",
              "Rank tracking on the money keywords alongside the question set",
            ]}
          />

          <Card
            tier="everywhere"
            under="All of it, across a portfolio"
            price={priceNode(labelOf("everywhere"))}
            items={["Multiple clients under one agreement", "Priced on volume, not per seat", "Your dashboards, your branding"]}
          />
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
          <div>
            <div style={{ ...MICRO, color: T.faint }}>Your brand on everything the client sees</div>
            <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.65, color: "#e8e8ea" }}>
              Dashboards, reports and placement summaries carry your logo and your domain. Nothing a client opens says{" "}
              <TierName tier="cited" /> on it.
            </p>
          </div>
          <div>
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
