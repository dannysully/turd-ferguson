"use client";

import Link from "next/link";
import { useState } from "react";

import BrandMark from "./BrandMark";
import TierName from "./TierName";
import { T } from "@/config/tokens";

/**
 * The topbar, from the boards.
 *
 * The board's nav is Packages, Compare, White label, Blog. Compare has a
 * board but no page - every competitor cell in it is unverified, so it is
 * not something to publish unreviewed - and it is not linked. Packages still
 * points at the homepage section; white label now has its own page.
 */

const navLinks = [
  { href: "/#packages", label: "Packages" },
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

function Logo() {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: "3px", textDecoration: "none" }}>
      <BrandMark id="hdr" size={15} />
      <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
        <TierName tier="cited" />
      </span>
    </Link>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header style={{ background: T.bg, borderBottom: `1px solid ${T.line}` }}>
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
        <Logo />
        <div style={{ flexGrow: 1 }} />

        <nav className="nav-links" style={{ display: "flex", alignItems: "center", gap: "20px" }} aria-label="Main navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} style={linkStyle}>
              {link.label}
            </a>
          ))}
          <a
            href="/#scan"
            style={{
              background: T.accent,
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              padding: "8px 16px",
              borderRadius: "10px",
              textDecoration: "none",
            }}
          >
            Free scan
          </a>
        </nav>

        <button
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.5rem" }}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <span style={{ display: "block", width: "20px", height: "2px", background: T.ink, marginBottom: "5px" }} />
          <span style={{ display: "block", width: "20px", height: "2px", background: T.ink, marginBottom: "5px" }} />
          <span style={{ display: "block", width: "20px", height: "2px", background: T.ink }} />
        </button>
      </div>

      {open && (
        <nav style={{ background: T.surface, borderTop: `1px solid ${T.line}`, padding: "1rem 1.5rem 1.5rem" }} aria-label="Mobile navigation">
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} style={linkStyle} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
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
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
