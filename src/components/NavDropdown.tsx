"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { T } from "@/config/tokens";
import { LIFT_SOFT } from "./home/dark";

/**
 * One topbar dropdown (Danny, 28 Sep 2026, danny.md 64-65).
 *
 * Opens on hover, and on focus or click for keyboard and touch; closes on Esc
 * and about 150ms after the pointer leaves, so a diagonal move into the panel
 * does not drop it. The trigger carries aria-expanded.
 *
 * A click only ever opens: on touch the tap focuses first, so a toggle would
 * shut what focus had just opened. Tapping away blurs it shut.
 *
 * With JS off the panel is still in the markup and CSS opens it on hover and
 * focus-within (`.nav-dd:not([data-js])` in globals.css); once hydrated,
 * `data-js` hands the state to React so Esc can close it under a pointer.
 */

export type NavItem = { href: string; label: React.ReactNode; key: string };

const CLOSE_MS = 150;

export default function NavDropdown({
  label,
  items,
  style,
}: {
  label: string;
  items: NavItem[];
  style: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [js, setJs] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // Esc hands focus back to the trigger; that focus must not reopen it.
  const quiet = useRef(false);
  const id = useId();

  useEffect(() => setJs(true), []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const show = () => {
    cancel();
    setOpen(true);
  };
  const hideSoon = () => {
    cancel();
    timer.current = setTimeout(() => setOpen(false), CLOSE_MS);
  };

  return (
    <div
      className="nav-dd"
      data-js={js ? "" : undefined}
      data-open={open ? "" : undefined}
      style={{ position: "relative" }}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onFocus={() => {
        if (quiet.current) quiet.current = false;
        else show();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          cancel();
          setOpen(false);
          if (document.activeElement !== trigger.current) {
            quiet.current = true;
            trigger.current?.focus();
          }
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={show}
        style={{
          ...style,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          // Longhands, not `font: inherit` - the shorthand beside fontSize
          // painted the trigger a size up from the links next to it.
          fontFamily: "inherit",
          lineHeight: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
        }}
      >
        {label}
        <svg width="9" height="6" viewBox="0 0 9 6" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : undefined }}>
          <path d="M1 1l3.5 3.5L8 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {/* The padding-top is the hover bridge between trigger and card. */}
      <div id={id} className="nav-dd-panel" style={{ position: "absolute", top: "100%", left: "-14px", paddingTop: "10px", zIndex: 50 }}>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: "6px",
            minWidth: "190px",
            background: T.surface,
            border: `1px solid ${T.line}`,
            borderRadius: "12px",
            boxShadow: LIFT_SOFT,
          }}
        >
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="nav-dd-link"
                style={{ display: "block", padding: "9px 12px", borderRadius: "8px", fontSize: "14px", fontWeight: 500, color: T.ink, textDecoration: "none" }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
