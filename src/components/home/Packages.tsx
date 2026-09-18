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

const priceOf = (id: string) => TIERS.find((t) => t.id === id)?.basePrice ?? null;

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

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
  const tracked = priceOf("tracked");
  const mentioned = priceOf("mentioned");
  const cited = priceOf("cited");

  return (
    <section style={{ ...SHELL, marginTop: "44px", display: "flex", flexDirection: "column", gap: "34px" }}>
      {/* Packages */}
      <div>
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
            price={tracked !== null ? <>{money(tracked)}<span style={perMo}>/mo</span></> : "Talk to us"}
            basis="20 questions, checked weekly. More questions or a tighter cadence moves the price - ask and we will quote it."
            items={[
              "As many buying questions as you want tracked, across as many clusters, refreshed monthly",
              "Every source behind every answer, and what kind of publication each one is",
              "So you know where you need placing, and on what sort of site",
              "You run the outreach",
            ]}
          />

          <Card
            tier="mentioned"
            under="We do the placing for you"
            price={mentioned !== null ? <>{money(mentioned)}<span style={perMo}>/mo</span></> : "Talk to us"}
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
            price={cited !== null ? <>{money(cited)}<span style={perMo}>/mo</span></> : "Talk to us"}
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
            price="Talk to us"
            items={["Multiple clients under one agreement", "Priced on volume, not per seat", "Your dashboards, your branding"]}
          />
        </div>
      </div>

      {/* White label */}
      <div>
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
