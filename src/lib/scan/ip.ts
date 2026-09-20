import "server-only";

import { createHash } from "node:crypto";

export { UNKNOWN_IP, clientIp } from "./client-ip.ts";

/**
 * Salted SHA-256 of the caller's IP. Raw IPs are never stored.
 * Without IP_HASH_SALT the hash would be a plain rainbow-table lookup, so the
 * absence of the salt is an error rather than a silent downgrade.
 *
 * Stays here, under `server-only`, while `clientIp` moved to `./client-ip.ts`.
 * The split was to give the header order an executor, and this half does not
 * want one at that price: it reaches `node:crypto` and reads the salt, and a
 * module doing that should not be one import away from a client component.
 * Same question `engine-costs.ts` was left alone over - ask what the file is
 * protecting before moving it. `clientIp` protects nothing; this does.
 */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) throw new Error("IP_HASH_SALT must be set so IP addresses are not stored in the clear.");
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
