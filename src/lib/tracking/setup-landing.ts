/**
 * Where sign-in lands while a client's setup is unconfirmed (R166 part 3a,
 * Danny, danny.md line 175: "After auth, redirect to /setup until
 * confirmed"). Pure and unwired: /api/app/auth still makes the R163/R164
 * choice inline until /app/[client]/setup exists to land on.
 *
 * Setup is confirmed once the client has a dashboard_events row named
 * SETUP_CONFIRMED_EVENT. The column has no database whitelist, so the event
 * needs no migration.
 *
 * Until then setup wins over a safe next: "until confirmed" is Danny's word,
 * and a bookmark into a dashboard with nothing set up lands on empty panels.
 * A next that is already that client's setup page is kept as it is.
 */
export const SETUP_CONFIRMED_EVENT = "setup_confirmed";

export const setupPath = (slug: string) => `/app/${slug}/setup`;

export function setupConfirmed(events: readonly { event: string }[]): boolean {
  return events.some((e) => e.event === SETUP_CONFIRMED_EVENT);
}

export function landingAfterAuth(o: {
  next: string | null;
  /** The member's clients in the order /app lists them; null when the read failed. */
  clients: readonly { slug: string; confirmed: boolean }[] | null;
}): string {
  if (o.clients === null) return o.next ?? "/app";
  if (!o.clients.length) return "/app/login?access=none";
  const first = o.clients[0]!;
  if (!first.confirmed) return setupPath(first.slug);
  return o.next ?? `/app/${first.slug}`;
}
