import { normalizeDomain } from "./domain";

export type Citation = {
  source_domain: string;
  url: string | null;
  title: string | null;
  position: number;
};

export type OverviewRead = {
  aio_shown: boolean;
  /** The Overview's own prose. Excludes reference snippets and link URLs. */
  prose: string;
  citations: Citation[];
  cost: number;
  raw: unknown;
};

/** The nested shape of an ai_overview item, as returned by live/advanced. */
type AioReference = { source?: string; domain?: string; url?: string; title?: string };
type AioElement = { text?: string; references?: AioReference[] };
type AioItem = {
  type: string;
  markdown?: string;
  items?: AioElement[];
  references?: AioReference[];
};

/**
 * Pure parse of one live/advanced result. Split out from the fetch so it can be
 * exercised against recorded responses without spending on the API.
 */
export function parseOverview(result: Record<string, unknown> | undefined | null): Omit<OverviewRead, "cost"> {
  if (!result) {
    return { aio_shown: false, prose: "", citations: [], raw: null };
  }

  const items = (result.items as AioItem[] | undefined) ?? [];
  const aio = items.find((i) => i.type === "ai_overview");

  if (!aio) {
    const claimed = ((result.item_types as string[] | undefined) ?? []).includes("ai_overview");
    // A claimed-but-absent Overview is the retryable case; the caller decides.
    return { aio_shown: false, prose: "", citations: [], raw: { claimed_but_absent: claimed } };
  }

  const prose = (aio.items ?? [])
    .map((el) => el.text ?? "")
    .filter(Boolean)
    .join("\n\n");

  // Prefer the item's deduplicated top-level reference list; fall back to the
  // per-element ones when it is missing.
  const refs = aio.references?.length
    ? aio.references
    : (aio.items ?? []).flatMap((el) => el.references ?? []);

  const seen = new Set<string>();
  const citations: Citation[] = [];
  refs.forEach((r, i) => {
    const domain = normalizeDomain(r.domain ?? r.url ?? "");
    if (!domain) return;
    const key = `${domain}|${r.url ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    citations.push({
      source_domain: domain,
      url: r.url ?? null,
      title: r.title ?? r.source ?? null,
      position: i + 1,
    });
  });

  return {
    aio_shown: true,
    prose,
    // Keep only what debugging needs. The organic results are thrown away.
    raw: { markdown: aio.markdown ?? null, reference_count: citations.length },
    citations,
  };
}

/**
 * Does the Overview name the brand?
 *
 * Word-boundary matched, case insensitive, with the common company-suffix and
 * punctuation variants folded away. Runs against prose only, so a brand that
 * appears solely inside a citation URL does not count.
 */
export function namesBrand(prose: string, brand: string): boolean {
  if (!prose || !brand) return false;

  const stripped = brand
    .toLowerCase()
    .replace(/\b(ltd|limited|inc|llc|plc|gmbh|co|company)\b\.?/g, " ")
    .replace(/[.,]/g, " ")
    .replace(/^the\s+/, "")
    .trim();
  if (stripped.length < 2) return false;

  // Hyphens, spaces and ampersands are interchangeable between how a company
  // writes its name and how an Overview renders it.
  const pattern = stripped
    .split(/[\s-]+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s\\-]*");

  return new RegExp(`(^|[^a-z0-9])${pattern}($|[^a-z0-9])`, "i").test(prose.toLowerCase());
}
