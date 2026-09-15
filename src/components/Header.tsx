"use client";

import Link from "next/link";
import { useState } from "react";

import BrandMark from "./BrandMark";

const navLinks = [
  { href: "/#scan", label: "Free scan" },
  { href: "/example", label: "Example" },
  { href: "/#pricing", label: "Packages" },
  { href: "/#proof", label: "Proof" },
  { href: "/#faq", label: "FAQ" },
];

function Logo() {
  return (
    <Link href="/" className="brand-lockup" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
      <BrandMark id="hdr" size={32} />
      <span style={{ fontWeight: 700, fontSize: "1.0625rem", color: "#0B1220", letterSpacing: "-0.02em" }}>
        always<span style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>cited</span>
      </span>
    </Link>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", borderBottom: "1px solid #E5E7EB" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo />

        {/* Desktop nav */}
        <nav className="nav-links" style={{ display: "flex", alignItems: "center", gap: "2rem" }} aria-label="Main navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="nav-link">{link.label}</a>
          ))}
          <a href="/#scan" className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem", borderRadius: "10px" }}>
            Start free
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button className="md:hidden" onClick={() => setOpen((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.5rem" }}
          aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          <span style={{ display: "block", width: "20px", height: "2px", background: "#0B1220", marginBottom: "5px" }} />
          <span style={{ display: "block", width: "20px", height: "2px", background: "#0B1220", marginBottom: "5px" }} />
          <span style={{ display: "block", width: "20px", height: "2px", background: "#0B1220" }} />
        </button>
      </div>

      {open && (
        <nav style={{ background: "#fff", borderTop: "1px solid #E5E7EB", padding: "1rem 1.5rem 1.5rem" }} aria-label="Mobile navigation">
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} style={{ color: "#4B5563", fontWeight: 500, textDecoration: "none" }} onClick={() => setOpen(false)}>{link.label}</a>
              </li>
            ))}
            <li>
              <a href="/#scan" className="btn-primary" style={{ padding: "0.625rem 1.5rem" }} onClick={() => setOpen(false)}>Start free</a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
