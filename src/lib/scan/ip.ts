import "server-only";

import { createHash } from "node:crypto";

/**
 * Salted SHA-256 of the caller's IP. Raw IPs are never stored.
 * Without IP_HASH_SALT the hash would be a plain rainbow-table lookup, so the
 * absence of the salt is an error rather than a silent downgrade.
 */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) throw new Error("IP_HASH_SALT must be set so IP addresses are not stored in the clear.");
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * The client IP behind Vercel's proxy.
 *
 * This decides ip_scans_per_day, the only per-caller limit on an endpoint that
 * spends real money on every request, so what it is worth is exactly how hard
 * it is to get a different answer on purpose.
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
 * So all three are platform-set, none is caller-written, and the order below
 * is not a spoofability ranking - it is a specificity one, which is the only
 * thing the documentation distinguishes them by:
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
 * Behaviour is unchanged by that correction. It is written down because the old
 * comment justified the code with a claim about the platform that the platform
 * documents the opposite of, and a reader trusting it would go on to harden the
 * wrong thing - or, as happened, carry it to Danny twice as a live spend
 * exposure when the header chain was never the hole.
 *
 * A last resort of 0.0.0.0 rather than a throw: a missing header must not take
 * the scan form down, and one shared bucket is a limit rather than the absence
 * of one.
 */
export function clientIp(req: Request): string {
  const platform = req.headers.get("x-vercel-forwarded-for");
  const first = platform?.split(",")[0].trim();
  if (first) return first;

  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const hops = fwd.split(",").map((h) => h.trim()).filter(Boolean);
  return hops[hops.length - 1] ?? "0.0.0.0";
}
