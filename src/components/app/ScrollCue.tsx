"use client";

import { type ReactNode, useEffect, useState } from "react";

import { T } from "@/config/tokens";

/**
 * The "Swipe for the later days" line under a sideways scroller (R151, 3 Oct
 * 2026). The server can only guess the width, so with JS off the line shows on
 * a phone (.app-show-sm) as before. With JS it shows whenever the scroller with
 * id `target` actually overflows - a 1024 window cut the Placements chart and a
 * 900 one the day grid with nothing to say so - and the scroller is a tab stop
 * only then, so a chart that fits is not a stop with nothing to do.
 */
export default function ScrollCue({ target, children }: { target: string; children: ReactNode }) {
  const [over, setOver] = useState<boolean | null>(null);

  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    const read = () => {
      const o = el.scrollWidth > el.clientWidth + 1;
      if (o) el.setAttribute("tabindex", "0");
      else el.removeAttribute("tabindex");
      setOver(o);
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [target]);

  return (
    <p className={over === null ? "app-show-sm" : undefined} style={{ margin: 0, fontSize: "13px", color: T.soft, ...(over === null ? {} : { display: over ? "block" : "none" }) }}>
      {children}
    </p>
  );
}
