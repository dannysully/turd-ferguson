/**
 * Which address a request is attributed to - the per-caller identity the only
 * per-caller limit on this site is keyed on.
 *
 * Split out of `ip.ts` on 20 September 2026 for the reason `settings-merge.ts`
 * was split out of `settings.ts`: that module is `server-only`, so Node's
 * runner cannot load it, and the header order below had no executor. It is
 * pure string handling over a `Request` and protects nothing, so unlike
 * `hashIp` - which stays behind with `node:crypto` and the salt - there is
 * nothing here that wants the guard.
 *
 * `ceilings.test.mts` now proves `ip_scans_per_day` refuses at the right
 * number. This is the other half of that: the number is only a limit if the
 * key it counts under is the same one twice.
 *
 * ── Why this order, which is NOT a spoofability ranking ────────────────
 *
 * The comment that used to sit here said x-forwarded-for is "an ordinary
 * request header: a proxy appends to it rather than replacing it, so the
 * leftmost value on an inbound request is whatever the caller put there".
 * That is true of x-forwarded-for in general and **not true of it on Vercel**,
 * which is the platform this runs on. Vercel's request-headers reference, read
 * 20 September 2026 and last updated 13 December 2025, says of x-forwarded-for:
 * "we currently overwrite the X-Forwarded-For header and do not forward
 * external IPs. This restriction is in place to prevent IP spoofing." It says
 * x-real-ip "is identical to the x-forwarded-for header", and the same of
 * x-vercel-forwarded-for, adding that x-forwarded-for "could be overwritten if
 * you're using a proxy on top of Vercel".
 *
 * So all three are platform-set, none is caller-written, and the order is a
 * specificity one - the only thing the documentation distinguishes them by:
 *
 *  - x-vercel-forwarded-for first, because it is the one the docs say survives
 *    a proxy placed on top of Vercel;
 *  - x-real-ip next, single-valued and named as identical, and nothing in the
 *    reference says a proxy on top overwrites it;
 *  - x-forwarded-for last, read from the *last* hop rather than the first. On
 *    Vercel the overwrite leaves one entry and it is the client. If something
 *    upstream ever appends instead, the entry it added is the address it
 *    actually saw, so this is right under either behaviour and costs nothing
 *    to keep.
 *
 * **The first-versus-last asymmetry between the first header and the third is
 * deliberate and is the one thing here most likely to be "tidied" into
 * agreement.** A test holds both directions now; do not make them match.
 *
 * Behaviour is unchanged by that correction. It is written down because the old
 * comment justified the code with a claim about the platform that the platform
 * documents the opposite of, and a reader trusting it would go on to harden the
 * wrong thing - or, as happened, carry it to Danny twice as a live spend
 * exposure when the header chain was never the hole.
 */

/**
 * The bucket a request with no usable header falls into.
 *
 * A last resort rather than a throw: a missing header must not take the scan
 * form down, and one shared bucket is a limit rather than the absence of one -
 * everything landing here counts against the same allowance.
 */
export const UNKNOWN_IP = "0.0.0.0";

/**
 * Two of the three trims below are load-bearing and the third was dead. That
 * was not visible by reading; the injection harness found it, by removing it
 * and catching nothing - the same way `price-label.ts` lost an empty-figure
 * guard that could not fire.
 *
 * Measured on Node 24.21, 20 September 2026:
 *
 *     new Request(url, { headers: { "x-real-ip": "  4.4.4.4  " } })
 *       .headers.get("x-real-ip")            === "4.4.4.4"
 *     ...{ "x-forwarded-for": " 1.1.1.1 ,  9.9.9.9 " }
 *       .headers.get("x-forwarded-for")      === "1.1.1.1 ,  9.9.9.9"
 *
 * `Headers` strips whitespace around the whole VALUE and not around the commas
 * inside it. So a single-valued header arrives trimmed and a trim on it changes
 * nothing, while the two that split on a comma are trimming substrings the
 * platform never touched. **Do not add the third one back for symmetry, and do
 * not remove either of the other two for it** - they are not the same
 * operation, and a test cannot tell you so because the dead one passes either
 * way. That is why this is written here rather than asserted there.
 */
export function clientIp(req: Request): string {
  const platform = req.headers.get("x-vercel-forwarded-for");
  const first = platform?.split(",")[0].trim();
  if (first) return first;

  // No trim: Headers has already done it, and the value has no separator to
  // have left anything inside. See the note above.
  const real = req.headers.get("x-real-ip");
  if (real) return real;

  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const hops = fwd.split(",").map((h) => h.trim()).filter(Boolean);
  return hops[hops.length - 1] ?? UNKNOWN_IP;
}
