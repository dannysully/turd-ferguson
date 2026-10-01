/**
 * The per-domain free-reading ceiling's decision, pure.
 *
 * Split out of `domain-ceiling.ts` on 1 Oct 2026 (R165) for the reason
 * `ceilings-decide.ts` was: that module is `server-only` and imports
 * `@/lib/supabase/admin`, so Node's runner cannot load it, and the exempt
 * list has to be executed by a test rather than read as text.
 * `domain-ceiling-decide.test.mts` runs it.
 */

/**
 * How long a domain's free reading lasts before another may be started.
 *
 * Seven days (Danny, 1 Oct 2026, danny.md line 170; was thirty, on the
 * argument that a campaign takes time to land and a second free reading a
 * week later measures the lag rather than the campaign - his call overrides
 * it). The IP ceiling is unchanged. Named here
 * rather than typed into the sentence that refuses, so the number the visitor
 * reads and the number enforced cannot come apart.
 *
 * Moved out of /api/coverage-check on 1 Oct 2026 (R140), because step 2's
 * draft route checks the same ceiling as soon as it knows the client domain,
 * and two copies of it would be two ceilings.
 */
export const FREE_RUN_DAYS = 7;

/**
 * The refusal sentence on its own, so the domain route's local fixture draws
 * the same words rather than a copy of them.
 */
export function recentReadingLine(domain: string): string {
  return (
    `We have already taken a free reading for ${domain} in the last ${FREE_RUN_DAYS} days. ` +
    "Open that reading's link to run it again, or get in touch and we will take another."
  );
}

/**
 * The refusal for `domain`, or null.
 *
 * A domain on `app_settings.coverage_ceiling_exempt_domains` (Danny, 1 Oct
 * 2026, danny.md line 174) is never refused here, and its recent-reading read
 * is not taken at all. This is the domain ceiling only: the IP ceiling is
 * `checkCeilings`, which never sees the list. `readRecent` answers whether
 * the domain had a reading inside FREE_RUN_DAYS; null means the read failed,
 * which lets the visitor through (see `recentReadingRefusal`).
 */
export async function decideRecentReading(
  domain: string,
  exempt: readonly string[],
  readRecent: () => Promise<boolean | null>,
): Promise<string | null> {
  if (exempt.includes(domain.trim().toLowerCase())) return null;
  return (await readRecent()) ? recentReadingLine(domain) : null;
}
