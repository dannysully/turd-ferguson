"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/what-is-aeo", label: "What is AEO?" },
  { href: "/case-studies/vibe-retail", label: "Case studies" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-navy border-b border-[#1a2d42]">
      <div className="mx-auto max-w-[1100px] px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-white font-heading text-lg tracking-tight hover:text-coral hover:no-underline transition-colors"
        >
          AlwaysCited
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[#b4c5d6] text-sm hover:text-white hover:no-underline transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="bg-coral text-white text-sm px-4 py-2 rounded-lg hover:bg-[#c24e26] hover:no-underline transition-colors"
          >
            Book a call
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-2 -mr-2"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="block w-5 h-0.5 bg-current mb-1.5 transition-transform" />
          <span className="block w-5 h-0.5 bg-current mb-1.5 transition-transform" />
          <span className="block w-5 h-0.5 bg-current transition-transform" />
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav
          className="md:hidden bg-navy border-t border-[#1a2d42] px-6 py-4"
          aria-label="Mobile navigation"
        >
          <ul className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[#b4c5d6] hover:text-white hover:no-underline transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/contact"
                className="inline-block bg-coral text-white text-sm px-4 py-2 rounded-lg hover:bg-[#c24e26] hover:no-underline transition-colors"
                onClick={() => setOpen(false)}
              >
                Book a call
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
