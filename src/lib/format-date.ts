/**
 * "2026-04-30" -> "30 Apr 2026", once, for the whole site.
 *
 * This existed twice and the two copies had drifted. `fmtDate` in
 * `result-figures.ts` was swept on 20 Sep and gained a guard on the month;
 * `formatPostDate` in `config/posts.ts` is its untested twin and did not, so
 * the same input rendered two different ways:
 *
 *     "2026-13-30"   result view -> "2026-13-30"
 *                    blog        -> "30 undefined 2026"
 *
 * That is this repo's "two judges of one fact" species, and the reason the
 * unguarded one was the blog is the whole argument for the executed-file
 * census: `result-figures.ts` had a test pointed at it and `posts.ts` did not.
 *
 * A fixed month table rather than `toLocaleDateString`, so the server and the
 * browser cannot render a date two ways and React cannot report a hydration
 * mismatch on a page whose only dynamic value is the date.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The raw string back for anything that is not a date this can render.
 *
 * Falling back is the right direction here and it is worth saying why: a
 * visitor seeing `2026-13-30` has seen something obviously wrong and can say
 * so, where `30 undefined 2026` is the kind of output that ships and sits
 * there. Neither is correct - the point is which failure is legible.
 *
 * The day is bounded as well as the month. They are the same defect one field
 * over: `MONTHS[m - 1]` for a month past twelve is `undefined`, and a day past
 * thirty-one is simply printed. The month half was already held by
 * `result-figures.test.mts`; the day half was in neither copy.
 */
export function formatDate(iso: string): string {
  const parts = iso.slice(0, 10).split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return iso;
  if (m > 12 || d > 31) return iso;
  return d + " " + MONTHS[m - 1] + " " + y;
}
