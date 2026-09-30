/**
 * Placements (BRIEF-2 T12, R96, 30 Sep 2026): the url_key a placement and a
 * citation are matched on, and the Sunday link check's decision for one row.
 *
 * Pure. The fetch is passed in, so nothing here reaches the network until the
 * runner wires it (and registers it then). No price field exists anywhere in
 * this module, by the brief: costs stay on Danny's Mac.
 */

export const PLACEMENT_KINDS = ["guest_post", "link_insertion", "on_site", "coverage"] as const;
export type PlacementKind = (typeof PLACEMENT_KINDS)[number];
export const PLACEMENT_STATUSES = ["pitched", "writing", "scheduled", "live", "removed"] as const;
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];

/** Polite and named, like the scan's crawler. */
export const LINK_CHECK_UA = "alwayscited-linkcheck/1.0 (+https://alwayscited.com)";
export const LINK_CHECK_TIMEOUT_MS = 8000;

/**
 * Lowercase host with no `www.`, then the path, with no query, no fragment and
 * no trailing slash. A bare host is accepted as if it had `https://`. Null for
 * anything that is not a URL.
 */
export function urlKey(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // Another scheme (mailto:, tel:) is not a page; a host with a port is.
  if (/^[a-z][a-z0-9+.-]*:(?!\/\/|\d)/i.test(s)) return null;
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".")) return null;
  const path = u.pathname.replace(/\/+$/, "");
  return `${host}${path}`;
}

/** An answer cites a placement when one of its citation URLs has the placement's url_key. Computed on read. */
export function citesPlacement(citations: readonly { url: string | null }[], key: string): boolean {
  return citations.some((c) => c.url !== null && urlKey(c.url) === key);
}

/** Whether the page's HTML carries a link to the client's domain (or a subdomain of it). */
export function linksTo(html: string, domain: string): boolean {
  const own = domain.toLowerCase().replace(/^www\./, "");
  for (const m of html.matchAll(/href\s*=\s*["']?([^"'\s>]+)/gi)) {
    let host: string;
    try {
      host = new URL(m[1].replace(/&amp;/g, "&"), "https://placeholder.invalid/").hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      continue;
    }
    if (host === own || host.endsWith(`.${own}`)) return true;
  }
  return false;
}

export type LinkRow = { url: string; last_checked_on: string | null; link_present: boolean | null };
export type LinkRead = { kind: "page"; status: number; html: string } | { kind: "failed"; reason: string };

/**
 * One row's outcome. `write` is null when nothing should be recorded (the
 * fetch failed: a timeout is not evidence the link went). `alert` means email
 * Danny and flag the row. Status is never touched.
 *
 * 404 and 410 alert only on the second in a row: the first sets
 * link_present to null (unknown) with a date, and the second, seeing that
 * null after a check, sets false and alerts. A 200 without the link alerts at
 * once, the first time it is seen.
 */
export function decideLinkCheck(row: LinkRow, read: LinkRead, domain: string, today: string): { write: { last_checked_on: string; link_present: boolean | null } | null; alert: string | null } {
  if (read.kind === "failed") return { write: null, alert: null };
  if (read.status === 404 || read.status === 410) {
    const second = row.last_checked_on !== null && row.link_present === null;
    if (row.link_present === false) return { write: { last_checked_on: today, link_present: false }, alert: null };
    return second
      ? { write: { last_checked_on: today, link_present: false }, alert: `${row.url} answered ${read.status} twice in a row` }
      : { write: { last_checked_on: today, link_present: null }, alert: null };
  }
  if (read.status < 200 || read.status >= 300) return { write: null, alert: null };
  const present = linksTo(read.html, domain);
  const alert = !present && row.link_present !== false ? `${row.url} no longer links to ${domain}` : null;
  return { write: { last_checked_on: today, link_present: present }, alert };
}

type FetchLike = (url: string, init: { headers: Record<string, string>; signal: AbortSignal; redirect: "follow" }) => Promise<{ status: number; text(): Promise<string> }>;

/** Read one placement page: 8s, polite user agent, redirects followed. Never throws. */
export async function readPlacement(url: string, fetcher: FetchLike): Promise<LinkRead> {
  try {
    const res = await fetcher(url, { headers: { "user-agent": LINK_CHECK_UA }, signal: AbortSignal.timeout(LINK_CHECK_TIMEOUT_MS), redirect: "follow" });
    const html = res.status >= 200 && res.status < 300 ? await res.text() : "";
    return { kind: "page", status: res.status, html };
  } catch (e) {
    return { kind: "failed", reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Sunday, in UTC, the day the runner does the link check. */
export function isLinkCheckDay(day: string): boolean {
  return new Date(`${day}T00:00:00Z`).getUTCDay() === 0;
}

/** Bounds on the admin placement form (R96 part 3); the server refuses past the same. */
export const PLACEMENT_LIMITS = { url: 500, anchor: 200, note: 500, date: 10, id: 36 } as const;

export type PlacementInput = { kind: string; url: string; status: string; scheduled_on: string; live_on: string; anchor_text: string; internal_note: string };
export type PlacementFields = {
  kind: PlacementKind;
  url: string;
  url_key: string;
  domain: string;
  status: PlacementStatus;
  scheduled_on: string | null;
  live_on: string | null;
  anchor_text: string | null;
  internal_note: string | null;
};

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

/**
 * The row the admin placement form writes, or why not. Coverage is the
 * alwayseverywhere kind (BRIEF-2 T12), so other tiers are refused it; a live
 * placement needs its live date, because the placements screen draws its line
 * on that day. Still no price field.
 */
export function placementFields(input: PlacementInput, tier: string): { row: PlacementFields } | { error: string } {
  const kind = input.kind.trim();
  const status = input.status.trim() || "pitched";
  if (!(PLACEMENT_KINDS as readonly string[]).includes(kind)) return { error: "Unknown kind." };
  if (kind === "coverage" && tier !== "everywhere") return { error: "Coverage is an alwayseverywhere placement." };
  if (!(PLACEMENT_STATUSES as readonly string[]).includes(status)) return { error: "Unknown status." };
  const url = input.url.trim();
  if (url.length > PLACEMENT_LIMITS.url) return { error: `A URL is at most ${PLACEMENT_LIMITS.url} characters.` };
  const key = urlKey(url);
  if (!key) return { error: "That is not a page URL." };
  const dates: Record<"scheduled_on" | "live_on", string | null> = { scheduled_on: null, live_on: null };
  for (const f of ["scheduled_on", "live_on"] as const) {
    const d = input[f].trim();
    if (d && !isDay(d)) return { error: `${f === "live_on" ? "Live" : "Scheduled"} date is not a date.` };
    dates[f] = d || null;
  }
  if (status === "live" && !dates.live_on) return { error: "A live placement needs its live date." };
  const anchor = input.anchor_text.trim();
  if (anchor.length > PLACEMENT_LIMITS.anchor) return { error: `Anchor text is at most ${PLACEMENT_LIMITS.anchor} characters.` };
  const note = input.internal_note.trim();
  if (note.length > PLACEMENT_LIMITS.note) return { error: `A note is at most ${PLACEMENT_LIMITS.note} characters.` };
  return {
    row: {
      kind: kind as PlacementKind,
      url: /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`,
      url_key: key,
      domain: key.split("/")[0]!,
      status: status as PlacementStatus,
      ...dates,
      anchor_text: anchor || null,
      internal_note: note || null,
    },
  };
}

/**
 * What the admin list says about a row's last link check. `flagged` is a row
 * the Sunday check alerted on (link gone, or 404/410 twice): link_present false.
 */
export function linkCheckState(row: { status: string; last_checked_on: string | null; link_present: boolean | null }): { flagged: boolean; text: string } {
  if (row.link_present === false) return { flagged: true, text: `link gone, checked ${row.last_checked_on ?? "-"}` };
  if (row.link_present === true) return { flagged: false, text: `link present, checked ${row.last_checked_on}` };
  if (row.last_checked_on) return { flagged: false, text: `page missing once, checked ${row.last_checked_on}; again next Sunday` };
  return { flagged: false, text: row.status === "live" ? "not checked yet; next Sunday" : "checked once it is live" };
}
