import Link from "next/link";

import BrandMark from "./BrandMark";
import TierName, { type TierKey } from "./TierName";
import { GRID12, MICRO, T } from "@/config/tokens";

/**
 * The footer pattern every page uses, from HomeFaq.dc.html.
 *
 * Light now, not navy - the boards put it on the page ground with a hairline
 * above it, and it was the last large navy surface on the site.
 *
 * The board's middle column is "For: SEO agencies, PR agencies". Both have
 * boards but neither has a page yet, so that column carries the four tier
 * pages instead, which exist and are worth linking.
 *
 * Privacy now points at /legal. Terms still does not: terms of service are
 * not drafted, and a link labelled Terms that opens a privacy policy is
 * worse than no link.
 */

const PRODUCT: [string, string][] = [
  ["Free scan", "/#scan"],
  ["Packages", "/#packages"],
  ["White label", "/#white-label"],
  ["Worked example", "/example"],
];

const TIER_PAGES: TierKey[] = ["tracked", "mentioned", "cited", "everywhere"];

const COMPANY: [string, string][] = [
  ["About", "/about"],
  ["Evidence", "/case-studies/vibe-retail"],
  ["Blog", "/blog"],
  ["Contact", "/contact"],
];

const link: React.CSSProperties = { fontSize: "13.5px", color: T.soft, textDecoration: "none" };
const listStyle: React.CSSProperties = {
  margin: "12px 0 0",
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "9px",
};

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="footer-col">
      <div style={MICRO}>{title}</div>
      <ul style={listStyle}>{children}</ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer style={{ marginTop: "44px", borderTop: `1px solid ${T.line}` }}>
      <div
        className="board-head footer-grid"
        style={{
          ...GRID12,
          alignItems: "start",
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "32px 24px 28px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ gridColumn: "span 4" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <BrandMark id="ftr" size={15} />
            <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
              <TierName tier="cited" />
            </span>
          </div>
          <p style={{ margin: "12px 0 0", fontSize: "13px", lineHeight: 1.65, color: T.soft, maxWidth: "34ch" }}>
            Built and run by the senior team at{" "}
            <a href="https://nomadadigital.co.uk" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
              Nomada Digital
            </a>
            . Be the brand AI recommends.
          </p>
        </div>

        <Column title="Product">
          {PRODUCT.map(([label, href]) => (
            <li key={label}>
              <a href={href} style={link}>
                {label}
              </a>
            </li>
          ))}
        </Column>

        <Column title="Plans">
          {TIER_PAGES.map((tier) => (
            <li key={tier}>
              <Link href={`/always${tier}`} style={link}>
                <TierName tier={tier} />
              </Link>
            </li>
          ))}
        </Column>

        <Column title="Company">
          {COMPANY.map(([label, href]) => (
            <li key={label}>
              <Link href={href} style={link}>
                {label}
              </Link>
            </li>
          ))}
        </Column>
      </div>

      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "0 24px 26px", boxSizing: "border-box" }}>
        <div
          style={{
            borderTop: `1px solid ${T.line}`,
            paddingTop: "16px",
            display: "flex",
            alignItems: "baseline",
            gap: "18px",
            flexWrap: "wrap",
            fontSize: "12.5px",
            color: T.faint,
          }}
        >
          <span>&copy; {new Date().getFullYear()} Nomada Digital Ltd</span>
          {/* The board's bottom bar has Privacy and Terms. Privacy exists now;
              terms of service are not drafted, so that link waits rather than
              pointing at a page with no terms on it. */}
          <Link href="/legal" style={{ color: T.faint, textDecoration: "none" }}>
            Privacy
          </Link>
          <div style={{ flexGrow: 1 }} />
          <span>hello@alwayscited.com</span>
        </div>
      </div>
    </footer>
  );
}
