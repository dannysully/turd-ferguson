import TierName from "@/components/TierName";
import { CONTACT_URL, TIERS, type Tier } from "@/config/pricing";
import { ld, ORG_REF, SITE_REF, SITE_URL } from "@/config/schema";
import { CARD, MICRO, SHELL, T } from "@/config/tokens";

/**
 * A package page, from PackageDetail.dc.html.
 *
 * The four pages pass the same props they always did. What changed is the
 * page around them: the deliverables are a table rather than a run of
 * headings, because a buyer comparing tiers reads down a column, and the
 * ladder at the bottom says plainly that each tier contains the one below it.
 */

export type PackageSection = { heading: string; body: string };

const GLOSS: Record<string, string> = {
  tracked: "20 questions weekly. The map - you do the placing",
  mentioned: "We do the placing",
  cited: "Citations and rankings pushed together",
  everywhere: "All of it, across a portfolio",
};

/**
 * The four package pages were the only priced surfaces on the site with no
 * structured data at all - which is an odd gap for a company that sells being
 * readable to answer engines. "What does it cost" is the question a buyer
 * actually asks one.
 *
 * Built from `pricing.ts` rather than written per page, so a price cannot be
 * right in the card and stale in the markup. Three rules it follows:
 *
 * - **The name is `plainName`**, the TIER_PLAIN form, because JSON-LD is one
 *   of the contexts that strips colour.
 * - **The price is the one on the page.** `alwaystracked` reads "from $99/mo",
 *   so it gets an AggregateOffer with a lowPrice rather than an Offer with a
 *   flat price that the label itself contradicts.
 * - **`alwayseverywhere` gets no offer.** Its price is "Book a call". An offer
 *   node with no price says less than no offer node, and inventing one is the
 *   thing we do not do.
 *
 * `description` is the page's own standfirst. Nothing here is a new claim.
 */
function serviceSchema(tier: Tier, standfirst: string) {
  const url = SITE_URL + tier.href;
  const offers =
    tier.basePrice === null
      ? undefined
      : tier.priceLabel.startsWith("from")
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: tier.basePrice,
            url,
          }
        : {
            "@type": "Offer",
            priceCurrency: "USD",
            price: tier.basePrice,
            url,
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              priceCurrency: "USD",
              price: tier.basePrice,
              // Monthly, stated in a field rather than only in the /mo of
              // the label. MON is the UN/CEFACT code for a month.
              billingDuration: 1,
              billingIncrement: 1,
              unitCode: "MON",
            },
          };

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": url + "#service",
    name: tier.plainName,
    url,
    isPartOf: SITE_REF,
    description: standfirst,
    serviceType: "Answer engine optimisation",
    provider: ORG_REF,
    ...(offers ? { offers } : {}),
  };
}

export default function PackagePage({
  tier,
  standfirst,
  included,
  sections,
  notIncluded,
}: {
  tier: Tier;
  /** Kept in the signature: the four pages still pass them. */
  headline?: string;
  headlineAccent?: string;
  standfirst: string;
  included: string[];
  sections: PackageSection[];
  notIncluded?: { text: string; upgradeTo?: string; href?: string };
}) {
  return (
    <section style={{ ...SHELL, paddingTop: "40px", display: "flex", flexDirection: "column", gap: "28px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ld(serviceSchema(tier, standfirst)) }}
      />
      <div className="confirm-top">
        <div>
          <a href="/#packages" style={{ fontSize: "13px", fontWeight: 600, textDecoration: "none", color: T.accent }}>
            All packages
          </a>
          <div style={{ ...MICRO, marginTop: "18px" }}>Package</div>
          <h1
            style={{
              margin: "10px 0 0",
              fontSize: "36px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.16,
              color: T.ink,
            }}
          >
            <TierName tier={tier.key} qualifier={tier.qualifier} />
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: "15.5px", lineHeight: 1.65, color: T.soft, maxWidth: "60ch" }}>
            {standfirst}
          </p>
        </div>

        <div style={{ ...CARD, padding: "24px", alignSelf: "start" }}>
          <div style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1 }}>
            {tier.priceLabel}
          </div>
          <p style={{ margin: "8px 0 16px", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
            {tier.priceBasis ?? "Monthly, no minimum term, white-labelled. What you pay us, not what you charge on."}
          </p>
          <a
            href={CONTACT_URL}
            className="btn-primary"
            style={{
              display: "block",
              textAlign: "center",
              fontSize: "15px",
              fontWeight: 600,
              padding: "13px 20px",
              borderRadius: "10px",
              textDecoration: "none",
            }}
          >
            {tier.basePrice === null ? "Book a partner call" : "Start a client"}
          </a>
          <a
            href="/#scan"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: "8px",
              background: T.surface,
              border: "1px solid " + T.line,
              color: T.ink,
              fontSize: "15px",
              fontWeight: 600,
              padding: "12px 20px",
              borderRadius: "10px",
              textDecoration: "none",
            }}
          >
            Scan one first
          </a>
        </div>
      </div>

      <div>
        <div className="board-head confirm-head" style={{ marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
            What lands each month
          </h2>
          <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Stated as deliverables rather than adjectives, so you can hold us to it.
          </p>
        </div>

        <div style={{ ...CARD, overflow: "hidden" }}>
          {sections.map((s) => (
            <div key={s.heading} className="deliverable" style={{ borderBottom: "1px solid " + T.hair }}>
              <div style={{ fontSize: "14.5px", fontWeight: 600 }}>{s.heading}</div>
              <div style={{ fontSize: "14px", lineHeight: 1.6, color: T.soft }}>{s.body}</div>
            </div>
          ))}
          <div className="deliverable">
            <div style={{ fontSize: "14.5px", fontWeight: 600 }}>Also included</div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "7px" }}>
              {included.map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "9px" }}>
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden="true" style={{ marginTop: "6px", flexShrink: 0 }}>
                    <path d="M1 4.5l3.5 3.5L11 1" stroke={T.accent} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: "14px", lineHeight: 1.6, color: T.soft }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {notIncluded ? (
          <p style={{ margin: "14px 0 0", fontSize: "14px", lineHeight: 1.65, color: T.soft }}>
            {notIncluded.text}
            {notIncluded.upgradeTo && notIncluded.href ? (
              <>
                {" "}
                <a href={notIncluded.href} style={{ color: T.accent, fontWeight: 600, textDecoration: "none" }}>
                  {notIncluded.upgradeTo}
                </a>
                .
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <div>
        <div className="board-head confirm-head" style={{ marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
            Where it sits
          </h2>
          <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Each tier contains the one below it. Nothing here is a different product.
          </p>
        </div>

        <div style={{ ...CARD, display: "flex", overflow: "hidden", flexWrap: "wrap" }}>
          {TIERS.map((t, i) => {
            const here = t.key === tier.key;
            return (
              <a
                key={t.id}
                href={t.href}
                style={{
                  flexGrow: 1,
                  flexBasis: "220px",
                  padding: "20px 24px",
                  textDecoration: "none",
                  display: "block",
                  background: here ? T.wash : T.surface,
                  borderLeft: i ? "1px solid " + T.line : undefined,
                }}
              >
                <div style={{ fontSize: "14.5px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
                  <TierName tier={t.key} qualifier={t.qualifier} />
                </div>
                <div style={{ fontSize: "13px", color: T.soft, marginTop: "4px" }}>{t.priceLabel}</div>
                <div style={{ fontSize: "13px", color: T.soft, marginTop: "8px", lineHeight: 1.55 }}>
                  {here ? "You are here. " : ""}
                  {GLOSS[t.key]}
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: "13.5px", color: T.soft, lineHeight: 1.65 }}>
        Not sure which tier a client needs?{" "}
        <a href="/#scan" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
          Run the free scan
        </a>{" "}
        - the source table usually answers it.
      </p>
    </section>
  );
}
