"use client";

import { useEffect } from "react";

export default function TrackExampleView() {
  useEffect(() => {
    const fromHero = new URLSearchParams(window.location.search).get("from") === "hero";
    const w = window as unknown as { dataLayer?: unknown[] };
    if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: "example_viewed", from_hero: fromHero });
  }, []);
  return null;
}
