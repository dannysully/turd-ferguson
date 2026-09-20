/**
 * Shared closing CTA, used on the secondary pages.
 *
 * Critique 0.2: links are root-relative so they work off the homepage.
 * Critique 2.4: the previous copy described a consultative audit ("we will map
 * your category...") which contradicts the self-serve positioning. It now
 * points at the free scan first and pricing second.
 *
 * On the tokens as of 19 Sep 2026. It was the last public surface still on the
 * pre-redesign navy, and it sat on two pages that have no board - so this is a
 * restyle onto the token system rather than a redesign: same copy, same two
 * actions, the card idiom the homepage closing scan already uses. The gradient
 * orbs and the gradient-filled heading went with the palette; the rules are
 * near-monochrome, no box shadows, and one gradient per page at most.
 *
 * "See pricing" pointed at /#pricing, which is not an id on the homepage and
 * never has been - the packages section is #packages. It dropped the visitor at
 * the top of the homepage instead. Fixed here.
 */
import { CARD, GRID12, SHELL, T } from "@/config/tokens";
import { pricePublication } from "@/config/pricing";
import { TierText } from "@/components/TierName";
import Link from "next/link";

export default function CtaSection() {
  return (
    <section id="cta" style={{ ...SHELL, marginTop: "34px", marginBottom: "44px" }}>
      <div className="board-head closing-scan" style={{ ...CARD, ...GRID12, alignItems: "center", padding: "34px 40px" }}>
        <div style={{ gridColumn: "span 6" }}>
          <h2 style={{ margin: 0, fontSize: "25px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.22, color: T.ink }}>
            Prices are on the page. Start when you want.
          </h2>
          {/* Was "Placement counts, what each tier includes and what it costs
              are all published. If you want to buy, you do not need to speak to
              us first." Both halves were false. The placement count is
              published for one tier of four - pricing.ts's own header records
              the alwayscited figure as outstanding on D1 - and the tier whose
              price is a call is exactly the one you would have to speak to us
              about. The price half is derived now; see pricing.ts. */}
          <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.6, color: T.soft }}>
            <TierText>
              {pricePublication() +
                " What each tier includes is published either way, and buying a published price does not need a call."}
            </TierText>
          </p>
        </div>

        <div style={{ gridColumn: "span 6", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            href="/#scan"
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#ffffff",
              background: T.accent,
              borderRadius: "10px",
              padding: "13px 26px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Run a free scan
          </Link>
          <Link
            href="/#packages"
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: T.ink,
              background: T.surface,
              border: `1px solid ${T.line}`,
              borderRadius: "10px",
              padding: "12px 25px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
