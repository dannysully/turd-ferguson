import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";

import TierName from "@/components/TierName";
import { CARD, GRID12, H2, MICRO, SHELL, T } from "@/config/tokens";

export const metadata: Metadata = {
  title: "White label for agencies",
  description:
    "Where the white-label line sits: which surfaces carry your branding, which carry ours, and the one place our name appears. Monthly, no minimum term, and we never contact your client.",
  openGraph: { url: "https://alwayscited.com/white-label", images: OG_IMAGE },
  alternates: { canonical: "https://alwayscited.com/white-label" },
};

/**
 * WhiteLabel.dc.html.
 *
 * The board's own framing is the point of the page: "the honest version,
 * including the one place our name can appear if you do nothing about it".
 * The table says "Ours" twice, and that is why it is worth reading - a
 * white-label page that claimed every surface was the agency's would be the
 * less useful page and the less true one.
 *
 * The contract-clause wording is marked rather than paraphrased. What a
 * non-contact clause actually says is a commitment, and inventing a plausible
 * version of it on a sales page is how you end up bound to words nobody
 * agreed.
 */

const ROWS: { surface: string; brand: string; note: string }[] = [
  { surface: "The visibility dashboard", brand: "Yours", note: "Your logo, your colours, on your subdomain if you want one" },
  { surface: "Monthly reporting", brand: "Yours", note: "Generated from the same data, none of our marks on it" },
  { surface: "Placement summaries", brand: "Yours", note: "What went live, where, and what it moved" },
  { surface: "Outreach to publishers", brand: "Ours", note: "We approach the title. Your client is never named to them unless you ask" },
  { surface: "The published article", brand: "The publisher's", note: "It is their editorial. Neither of us appears in the byline" },
  { surface: "Invoices and contracts", brand: "Ours, to you", note: "The one place our name appears, and your client never sees it" },
];

const TERMS: { label: string; value: string; note: React.ReactNode }[] = [
  { label: "Contract", value: "Monthly", note: "No minimum term. Thirty days to stop." },
  { label: "Invoicing", value: "One, to you", note: "Per client or consolidated. You bill your client however you like." },
  {
    label: "Contact with your client",
    value: "None",
    note: (
      <>
        Written into the agreement.{" "}
        <mark style={{ background: T.warnBg, color: T.warnFg, padding: "1px 6px", borderRadius: "6px", fontWeight: 600 }}>
          [TO CONFIRM: the clause wording]
        </mark>
      </>
    ),
  },
];

export default function WhiteLabelPage() {
  return (
    <main style={{ ...SHELL, paddingTop: "44px", paddingBottom: "44px", display: "flex", flexDirection: "column", gap: "30px" }}>
      <div className="board-head" style={{ ...GRID12, alignItems: "start" }}>
        <div style={{ gridColumn: "span 7" }}>
          <div style={MICRO}>White label</div>
          <h1 style={{ margin: "10px 0 0", fontSize: "36px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.18, color: T.ink }}>
            Your client never finds out we exist.
          </h1>
          <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.6, color: T.soft, maxWidth: "62ch" }}>
            Everything a client opens carries your name. Everything we send carries theirs. Here is exactly where the
            line sits, so you can check it against what you have promised.
          </p>
        </div>
      </div>

      <section>
        <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
          <h2 style={{ ...H2, gridColumn: "span 4" }}>Who sees what</h2>
          <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            The honest version, including the one place our name can appear if you do nothing about it.
          </p>
        </div>

        <div style={{ ...CARD, overflow: "hidden" }}>
          <div className="wl-row" style={{ padding: "11px 26px", background: "#fbfbfc", borderBottom: `1px solid ${T.line}` }}>
            <div style={MICRO}>Surface</div>
            <div style={MICRO}>Whose branding</div>
            <div style={MICRO}>Notes</div>
          </div>
          {ROWS.map((r) => (
            <div key={r.surface} className="wl-row" style={{ padding: "13px 26px", borderBottom: `1px solid ${T.hair}`, alignItems: "baseline" }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: T.ink }}>{r.surface}</div>
              <div style={{ fontSize: "14px", color: T.ink }}>{r.brand}</div>
              <div style={{ fontSize: "13.5px", lineHeight: 1.55, color: T.soft }}>{r.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
          <h2 style={{ ...H2, gridColumn: "span 4" }}>How the account runs</h2>
          <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Commercial terms, in the same place as the branding ones.
          </p>
        </div>

        <div className="wl-terms" style={{ ...CARD, overflow: "hidden" }}>
          {TERMS.map((t, i) => (
            <div key={t.label} className="wl-term" style={{ padding: "22px 26px", borderLeft: i ? `1px solid ${T.line}` : undefined }}>
              <div style={{ fontSize: "14px", color: T.soft }}>{t.label}</div>
              <div style={{ fontSize: "27px", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.15, marginTop: "2px", color: T.ink }}>
                {t.value}
              </div>
              <div style={{ fontSize: "13px", color: T.soft, marginTop: "6px", maxWidth: "34ch", lineHeight: 1.55 }}>{t.note}</div>
            </div>
          ))}
        </div>
      </section>

      <p style={{ margin: 0, fontSize: "13.5px", color: T.soft, lineHeight: 1.65 }}>
        <a href="/#packages" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
          See what it costs
        </a>{" "}
        - or run a scan on a client first. The <TierName tier="cited" /> plan is the one most agencies start on.
      </p>
    </main>
  );
}
