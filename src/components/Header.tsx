"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import BrandMark from "./BrandMark";
import TierName from "./TierName";
import { T } from "@/config/tokens";
import { D, HEADER_H, WASH, WASH_SIZE } from "./home/dark";

/**
 * The topbar, from the boards.
 *
 * The board's nav, complete: Packages, Compare, White label, Blog. Compare
 * ships without its competitor columns - see that page for why - so it is
 * linked now. Packages still points at the homepage section.
 *
 * On `/` only it sits on the hero's dark ground, as Main.dc.html draws it:
 * no hairline, links in D.muted, the lockup lifted with `.on-dark`. The wash
 * is painted here as well as on the hero, sized to the same box, so the two
 * read as one surface. Every other route keeps the light bar.
 */

const navLinks = [
  { href: "/#packages", label: "Packages" },
  { href: "/compare", label: "Compare" },
  { href: "/white-label", label: "White label" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/blog", label: "Blog" },
];

const linkStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: T.soft,
  textDecoration: "none",
};

function Logo({ dark }: { dark: boolean }) {
  return (
    <Link href="/" className={dark ? "on-dark" : undefined} style={{ display: "flex", alignItems: "center", gap: dark ? "4px" : "3px", textDecoration: "none" }}>
      <BrandMark id="hdr" size={15} colour={dark ? D.accent : undefined} />
      <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.022em", color: dark ? T.surface : T.ink }}>
        <TierName tier="cited" />
      </span>
    </Link>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const dark = usePathname() === "/";
  const links = dark ? { ...linkStyle, color: D.muted } : linkStyle;
  const bar = dark ? T.surface : T.ink;

  return (
    <header
      style={
        dark
          ? {
              backgroundColor: D.ground,
              backgroundImage: WASH,
              backgroundSize: WASH_SIZE,
              backgroundRepeat: "no-repeat",
              minHeight: `${HEADER_H}px`,
              boxSizing: "border-box",
            }
          : { background: T.bg, borderBottom: `1px solid ${T.line}` }
      }
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <Logo dark={dark} />
        <div style={{ flexGrow: 1 }} />

        <nav className="nav-links" style={{ display: "flex", alignItems: "center", gap: "20px" }} aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} style={links}>
              {link.label}
            </Link>
          ))}
          <Link
            href="/#scan"
            style={{
              background: T.accent,
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              padding: dark ? "9px 16px" : "8px 16px",
              borderRadius: dark ? "9px" : "10px",
              textDecoration: "none",
            }}
          >
            Free scan
          </Link>
        </nav>

        <button
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.5rem" }}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <span style={{ display: "block", width: "20px", height: "2px", background: bar, marginBottom: "5px" }} />
          <span style={{ display: "block", width: "20px", height: "2px", background: bar, marginBottom: "5px" }} />
          <span style={{ display: "block", width: "20px", height: "2px", background: bar }} />
        </button>
      </div>

      {open && (
        <nav style={{ background: T.surface, borderTop: `1px solid ${T.line}`, padding: "1rem 1.5rem 1.5rem" }} aria-label="Mobile navigation">
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} style={linkStyle} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/#scan"
                style={{
                  display: "inline-block",
                  background: T.accent,
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "10px 20px",
                  borderRadius: "10px",
                  textDecoration: "none",
                }}
                onClick={() => setOpen(false)}
              >
                Free scan
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
