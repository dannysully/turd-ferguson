import TierName, { TierText, type TierKey } from "@/components/TierName";
import { CONTACT_URL, TIERS, TRACKED_QUESTIONS, type Tier } from "@/config/pricing";
import { splitPriceLabel } from "@/config/price-label";
import { ld } from "@/config/schema";
import { serviceSchema } from "@/config/service-schema";
import { CARD, MICRO, SHELL, T } from "@/config/tokens";
import Link from "next/link";

/**
 * A package page, from PackageDetail.dc.html.
 *
 * The four pages pass the same props they always did. What changed is the
 * page around them: the deliverables are a table rather than a run of
 * headings, because a buyer comparing tiers reads down a column, and the
 * ladder at the bottom says plainly that each tier contains the one below it.
 */

export type PackageSection = { heading: string; body: string };

/** The board's "/mo per client" treatment: a qualifier beside the figure, small and soft. */
const PRICE_UNIT: React.CSSProperties = { fontSize: "15px", fontWeight: 600, color: T.soft, letterSpacing: 0 };

const GLOSS: Record<string, string> = {
  // The count comes from pricing.ts. It was typed here, which made this the
  // third of four surfaces carrying its own copy of what $99 buys.
  tracked: `${TRACKED_QUESTIONS} questions weekly. The map - you do the placing`,
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
 * `serviceSchema` used to live here and now lives in
 * `src/config/service-schema.ts`, because nothing could execute it where it
 * was - Node's runner cannot parse JSX. Its rules and the reason the split
 * happened are in that file's header; `price-schema.test.mts` runs it and
 * reads the offer nodes back off the built pages.
 */

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
  /**
   * `upgradeTo` is a tier key rather than the written name: the page names a
   * tier here, so the lockup is not something a page should be able to spell
   * for itself.
   */
  notIncluded?: { text: string; upgradeTo?: TierKey; href?: string };
}) {
  const price = splitPriceLabel(tier.priceLabel);
  return (
    <section style={{ ...SHELL, paddingTop: "40px", display: "flex", flexDirection: "column", gap: "28px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ld(serviceSchema(tier, standfirst)) }}
      />
      {/* The beat, from globals.css, on the groups that were already siblings.
          These four pages shipped with no motion at all - `fa251a1` extended
          coverage to "the sections that had none" and meant the homepage's, so
          19 of the 22 prerendered pages had none of their own. Nothing here is
          a new rule or a new class: `.ac-row` is the site's one entrance and the
          index comes from the document's own structure, so the only decision
          taken per group is which elements are the beat. Leaf content rather
          than the wrappers around it, deliberately - a row inside a row animates
          twice and reads as mush. */}
      <div className="confirm-top">
        <div>
          <Link
            className="ac-row"
            href="/#packages"
            style={{ display: "block", fontSize: "13px", fontWeight: 600, textDecoration: "none", color: T.accent }}
          >
            All packages
          </Link>
          <div className="ac-row" style={{ ...MICRO, marginTop: "18px" }}>Package</div>
          <h1
            className="ac-row"
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
          <p
            className="ac-row"
            style={{ margin: "12px 0 0", fontSize: "15.5px", lineHeight: 1.65, color: T.soft, maxWidth: "60ch" }}
          >
            <TierText>{standfirst}</TierText>
          </p>
        </div>

        <div className="ac-row" style={{ ...CARD, padding: "24px", alignSelf: "start" }}>
          {/* The board sets the qualifiers small and soft beside the figure.
              Split by the site's one price-label reader, which returns a label
              it cannot parse whole, at figure size. */}
          <div style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1 }}>
            {price.prefix ? <span style={PRICE_UNIT}>{price.prefix}</span> : null}
            {price.figure}
            {price.suffix ? <span style={PRICE_UNIT}>{price.suffix}</span> : null}
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
          <Link
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
          </Link>
        </div>
      </div>

      <div>
        <div className="board-head confirm-head" style={{ marginBottom: "14px" }}>
          <h2 className="ac-row" style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
            What lands each month
          </h2>
          <p className="ac-row" style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Stated as deliverables rather than adjectives, so you can hold us to it.
          </p>
        </div>

        <div style={{ ...CARD, overflow: "hidden" }}>
          {/* Through TierText like every other prose prop on this component.
              `sections` was the one that was not, which is the only reason it
              is worth a comment: standfirst, `included` and `notIncluded.text`
              all went through it and these two did not, so a tier name written
              into a deliverable would have shipped as an uncoloured word with
              nothing to catch it. No section body names a tier today - this
              closes the gap rather than fixing a live defect. TierText is a
              no-op on a string with no tier name in it. */}
          {sections.map((s) => (
            <div key={s.heading} className="deliverable ac-row" style={{ borderBottom: "1px solid " + T.hair }}>
              <div style={{ fontSize: "14.5px", fontWeight: 600 }}>
                <TierText>{s.heading}</TierText>
              </div>
              <div style={{ fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
                <TierText>{s.body}</TierText>
              </div>
            </div>
          ))}
          <div className="deliverable ac-row">
            <div style={{ fontSize: "14.5px", fontWeight: 600 }}>Also included</div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "7px" }}>
              {included.map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "9px" }}>
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden="true" style={{ marginTop: "6px", flexShrink: 0 }}>
                    <path d="M1 4.5l3.5 3.5L11 1" stroke={T.accent} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
                    <TierText>{item}</TierText>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {notIncluded ? (
          <p style={{ margin: "14px 0 0", fontSize: "14px", lineHeight: 1.65, color: T.soft }}>
            <TierText>{notIncluded.text}</TierText>
            {notIncluded.upgradeTo && notIncluded.href ? (
              <>
                {" "}
                {/* The lockup in the sentence and plain words in the link (QF1,
                    Danny, 25 Sep 2026): no tier name inside a link anywhere. */}
                <TierName tier={notIncluded.upgradeTo} />.{" "}
                <Link
                  href={notIncluded.href}
                  style={{ color: T.ink, textDecoration: "underline", textUnderlineOffset: "2px" }}
                >
                  See how it works
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <div>
        <div className="board-head confirm-head" style={{ marginBottom: "14px" }}>
          <h2 className="ac-row" style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
            Where it sits
          </h2>
          <p className="ac-row" style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Each tier contains the one below it. Nothing here is a different product.
          </p>
        </div>

        <div style={{ ...CARD, display: "flex", overflow: "hidden", flexWrap: "wrap" }}>
          {TIERS.map((t, i) => {
            const here = t.key === tier.key;
            return (
              // A card, not a link: the lockup and the gloss are text, and the
              // link is plain words at the foot (QF1, Danny, 25 Sep 2026).
              <div
                key={t.id}
                className="ac-row"
                style={{
                  flexGrow: 1,
                  flexBasis: "220px",
                  padding: "20px 24px",
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
                  <TierText>{GLOSS[t.key]}</TierText>
                </div>
                {here ? null : (
                  <Link
                    href={t.href}
                    style={{ display: "inline-block", marginTop: "10px", fontSize: "13px", fontWeight: 600, color: T.ink, textDecoration: "underline", textUnderlineOffset: "2px" }}
                  >
                    See the plan
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="ac-row" style={{ margin: 0, fontSize: "13.5px", color: T.soft, lineHeight: 1.65 }}>
        Not sure which tier a client needs?{" "}
        <Link href="/#scan" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
          Run the free scan
        </Link>{" "}
        - the source table usually answers it.
      </p>
    </section>
  );
}
