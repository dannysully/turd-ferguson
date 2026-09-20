/**
 * The cooldown in front of the one send endpoint on this site that mails an
 * address nobody confirmed.
 *
 * Danny, 20 September 2026 19:45, settling item 5: the report goes straight
 * out, no verify step. His first condition came with it - "rate limit the send,
 * on the same IP hash the scan already counts. Without it this is a form that
 * mails arbitrary people on request." This is that limit's decision half.
 *
 * ## Why this is a separate module from the route
 *
 * `route.ts` imports `@/lib/supabase/admin`, so Node's runner cannot load it,
 * and a limit whose only executor is production is not a limit anybody has
 * checked. The same split `ceilings-decide.ts` and `client-ip.ts` were made
 * for, and the same rule: no `server-only`, no `@/`, relative and extensionful
 * imports, nothing here that `node --test` cannot load. The route keeps the
 * read; this keeps the judgement.
 *
 * ## What the limit is actually holding, and what already held it
 *
 * `ip_scans_per_day` is 3, and a message needs a scan row, so the day's ceiling
 * on how many report mails one caller can cause was already low. What it did
 * not bound is **rate** - three scans can be started and three addresses posted
 * inside a minute - and it does not bound the caller working through tokens
 * they never created, because the 30-day domain cache hands out other people's
 * completed scans without inserting a row of their own. So the caller is
 * stamped on the row at the moment the address is taken
 * (`report_email_ip_hash`) and counted from there, which is the whole reason
 * that column exists.
 *
 * ## Fifteen minutes, and why not sixty seconds
 *
 * The verification resend next door uses 60s, and it is answering a different
 * question: a second click on a message the visitor asked for *themselves*, to
 * their own confirmed address. That is a double-click, and a minute is the
 * right shape for one.
 *
 * Here nobody confirmed anything, so a second send is not a double click - it
 * is a second stranger. One address per scan already stops a repeat to the
 * same row, so everything this window sees is a **different scan**, which
 * means a different domain or a different market. A person doing that twice
 * inside a quarter of an hour is rare; a script doing it is the case Danny
 * named. Fifteen minutes costs the rare real caller one wait and turns the
 * day's three into three spread across three quarters of an hour.
 */

/**
 * The window a caller must leave between report mails on two different scans.
 *
 * **Changing this to 0 turns the limit off and every rule below still passes**,
 * because they all derive their expectations from this constant rather than
 * pinning fifteen minutes - which is right, the number is a judgement and not a
 * property. So `report-mail-limit.test.mts` floors it instead: a window under a
 * minute is not a cooldown, and that is the assertion standing between this
 * line and a door with nothing in front of it.
 */
export const REPORT_MAIL_COOLDOWN_MS = 15 * 60_000;

/**
 * How much of the cooldown is left for a caller whose last request was
 * `lastAskedAt`, or 0 if they may send.
 *
 * `lastAskedAt` is the most recent `report_email_at` on any *other* scan
 * carrying this caller's hash. Null is the ordinary case - almost nobody has
 * asked for this before - and it is the only input that reads as "clear".
 *
 * **Everything that is not a timestamp in the past fails closed**, which is the
 * opposite of what a cooldown usually does and is deliberate here:
 *
 * - an unparseable stamp is a corrupt row, and the cost of refusing on one is a
 *   visitor waiting a quarter of an hour for a copy of a page already on their
 *   screen. The cost of the other direction is a message to somebody who never
 *   asked for one.
 * - a stamp in the future is clock skew between this process and the database,
 *   and "not yet reached" is not the same fact as "long ago". Subtracting would
 *   make it read as long ago, which is the flattering direction.
 *
 * The same argument `ceilings.ts` records against `?? 0` on a failed count: a
 * guard whose read did not answer used to be a guard that was simply off.
 */
export function reportMailWaitMs(lastAskedAt: string | null | undefined, now: number): number {
  if (!lastAskedAt) return 0;

  const at = Date.parse(lastAskedAt);
  if (!Number.isFinite(at)) return REPORT_MAIL_COOLDOWN_MS;

  const elapsed = now - at;
  if (elapsed < 0) return REPORT_MAIL_COOLDOWN_MS;

  /**
   * `>=` rather than `>` and **it makes no observable difference**, which is
   * worth a line so nobody spends a review on it. At `elapsed === COOLDOWN` the
   * else branch computes `COOLDOWN - elapsed`, which is 0, so the two
   * comparisons are the same function at every input. An injection flipping it
   * came back a no-op on 20 September 2026 - the fifth in this tree, and the
   * one to remember because a boundary usually IS where the difference lives.
   */
  return elapsed >= REPORT_MAIL_COOLDOWN_MS ? 0 : REPORT_MAIL_COOLDOWN_MS - elapsed;
}

/**
 * What the caller is told, with the wait rounded up to whole minutes.
 *
 * Rounded up rather than down because a message saying "a minute" on 90
 * seconds left is wrong in the direction that produces a second refused
 * request. Never says "0 minutes": a wait of a second still reads as one.
 *
 * It says nothing about the earlier send. The caller sharing this hash is not
 * necessarily the person reading the screen - a company behind one address is
 * the ordinary case - so "we already sent yours" would be a statement about a
 * stranger's mail, told to somebody who cannot check it. What it does say is
 * the thing that makes the refusal cheap: the result is on the page in front of
 * them either way.
 */
export function reportMailWaitMessage(waitMs: number): string {
  const minutes = Math.max(1, Math.ceil(waitMs / 60_000));
  return (
    `We can only email one report at a time from here. Try again in ` +
    `${minutes} minute${minutes === 1 ? "" : "s"} - or stay on this page, the result lands here as well.`
  );
}
