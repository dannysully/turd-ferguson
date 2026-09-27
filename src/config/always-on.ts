/**
 * The always-on lines (pricing spec, Danny, 27 Sep 2026, section 8), word for
 * word. Used on the packages section, the tier pages and the FAQ - never the
 * homepage hero. The theme is that the work is regular, not that coverage
 * decays at some rate: no decay rate, peak or displacement timing goes next
 * to these.
 */
export const ALWAYS_ON = {
  packages: "Always on, so you don't have to be.",
  tierPage: "Set it up once. We keep it running.",
  faq: "AI visibility, handled every month.",
} as const;

export const ALWAYS_ON_SUPPORT =
  "AI answers change every week. The work to stay in them has to be just as regular, so we do it every month, in the background.";
