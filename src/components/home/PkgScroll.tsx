"use client";

import type { CSSProperties, FocusEvent, ReactNode } from "react";

/**
 * The tier table's sideways scroller (below 860px, globals.css .pkg-scroll),
 * R151 1 Oct 2026. Chrome scrolls a newly focused control only when none of it
 * is showing, so tabbing along the table at 390 left a half-clipped button under
 * the right-edge fade - the third tier's button sat 21px past the edge. On focus the control
 * is brought fully into view; the scroller's scroll-padding keeps it clear of
 * the fade. Without JS the browser's own focus scroll still applies.
 */
export default function PkgScroll(p: { style: CSSProperties; children: ReactNode }) {
  return (
    <div
      className="pkg-scroll"
      style={p.style}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) e.target.scrollIntoView({ block: "nearest", inline: "nearest" });
      }}
    >
      {p.children}
    </div>
  );
}
