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
 * The client IP behind Vercel's proxy, preferring the headers a caller cannot
 * write over the one they can.
 *
 * This decides ip_scans_per_day, the only per-caller limit on an endpoint that
 * spends real money on every request. It read the *first* entry of
 * x-forwarded-for, and x-forwarded-for is an ordinary request header: a proxy
 * appends to it rather than replacing it, so the leftmost value on an inbound
 * request is whatever the caller put there. A different one on each request
 * gave a different hash each time, and three scans a day became as many as
 * somebody cared to ask for.
 *
 * x-vercel-forwarded-for is set by the platform on the way in and is the answer
 * where there is one. Reading x-forwarded-for from the *last* hop rather than
 * the first is the fallback, and it is right under either behaviour: if the
 * proxy replaced the header there is one entry and it is the client, and if it
 * appended, the entry it added is the address it actually saw.
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
