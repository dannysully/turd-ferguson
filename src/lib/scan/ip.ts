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

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "0.0.0.0";
}
