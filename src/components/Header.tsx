"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#why-it-matters", label: "Why it matters" },
  { href: "#results", label: "Results" },
  { href: "#faq", label: "FAQ" },
];

function GetcitedLogo() {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
      {/* Speech bubble with sparkle — matches brand mark */}
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <path
          d="M4 6C4 3.79 5.79 2 8 2H28C30.21 2 32 3.79 32 6V22C32 24.21 30.21 26 28 26H20L14 33V26H8C5.79 26 4 24.21 4 22V6Z"
          fill="url(#logoGrad)"
        />
        {/* 4-pointed sparkle */}
        <path
          d="M18 8L19.5 13.5L25 15L19.5 16.5L18 22L16.5 16.5L11 15L16.5 13.5L18 8Z"
          fill="white"
        />
      </svg>
      <span
        style={{
          fontWeight: 700,
          fontSize: "1.2rem",
          color: "#0B1220",
          letterSpacing: "-0.02em",
        }}
      >
        getcited<span style={{ color: "#A855F7" }}>.com</span>
      </span>
    </Link>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  if (typeof window !== "undefined") {
    // Attach scroll listener only once on client
  }

  return (
    <header
      className="nav"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: scrolled ? "1px solid #E5E7EB" : "1px solid transparent",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: scrolled ? "0 1px 12px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <div
        className="nav-container"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <GetcitedLogo />

        {/* Desktop nav */}
        <nav
          className="nav-links"
          style={{ display: "flex", alignItems: "center", gap: "2rem" }}
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                color: "#4B5563",
                fontSize: "0.9375rem",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "#7C3AED")}
              onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "#4B5563")}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#cta"
            className="nav-cta"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
              color: "#ffffff",
              padding: "0.5rem 1.25rem",
              borderRadius: "10px",
              fontSize: "0.9375rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "opacity 0.15s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.opacity = "0.9")}
            onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.opacity = "1")}
          >
            Book a strategy call
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.5rem" }}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span style={{ display: "block", width: "20px", height: "2px", background: "#0B1220", marginBottom: "5px" }} />
          <span style={{ display: "block", width: "20px", height: "2px", background: "#0B1220", marginBottom: "5px" }} />
          <span style={{ display: "block", width: "20px", height: "2px", background: "#0B1220" }} />
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav
          style={{
            background: "#ffffff",
            borderTop: "1px solid #E5E7EB",
            padding: "1rem 1.5rem 1.5rem",
          }}
          aria-label="Mobile navigation"
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  style={{ color: "#4B5563", fontWeight: 500, textDecoration: "none", fontSize: "1rem" }}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#cta"
                style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
                  color: "#ffffff",
                  padding: "0.625rem 1.5rem",
                  borderRadius: "10px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
                onClick={() => setOpen(false)}
              >
                Book a strategy call
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
