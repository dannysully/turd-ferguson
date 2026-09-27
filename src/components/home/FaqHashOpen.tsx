"use client";

import { useEffect } from "react";

/**
 * Opens the FAQ row a link points at. Chrome scrolls to a `<details>` that is
 * the fragment target but leaves it shut - checked on /#faq-search-volume,
 * 27 Sep 2026 - so "here is why" on the confirm screen landed on a closed
 * question. Without JavaScript the link still scrolls to the row.
 */
export default function FaqHashOpen() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (el instanceof HTMLDetailsElement && !el.open) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return null;
}
