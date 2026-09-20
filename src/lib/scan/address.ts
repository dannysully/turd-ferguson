import "server-only";

import { lookup } from "node:dns/promises";

import { isPublicAddress } from "./ip-range";

/**
 * Where a visitor's address actually points.
 *
 * The arithmetic that decides whether one address literal is public moved to
 * `./ip-range`, which imports nothing and carries no `server-only`, so it can
 * be loaded by `node --test`. This file keeps the half that resolves a
 * hostname - the only part that needs the guard - and re-exports the other so
 * every caller and every import path is unchanged. See the header of
 * `ip-range.ts` for why any of this is checked at all.
 */

export { isPublicAddress };

export type HostCheck =
  /** Every address it resolves to is public. */
  | "public"
  /** At least one address it resolves to is not. */
  | "private"
  /** It resolved to nothing, or the budget ran out first. */
  | "unresolved";

/** Rejects once the read budget has fired, so a slow resolver cannot outlast it. */
function whenAborted(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("aborted"));
      return;
    }
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  });
}

/**
 * Resolve a hostname and judge every address it answers with.
 *
 * every rather than some, on purpose: a host with one public A record and one
 * private one is refused, because which of the two fetch connects to is not
 * ours to choose.
 *
 * What this does not close. The lookup here and the one fetch makes to open the
 * socket are two separate resolutions, so a record that changes between them -
 * DNS rebinding - still reaches the address we refused. Closing that needs the
 * connection pinned to the address we checked, which means a custom dispatcher
 * with its own lookup, and Node global fetch does not expose one. What is
 * closed is the case that costs an attacker nothing: a static record pointing
 * inside, and a redirect into it.
 */
export async function checkHost(hostname: string, signal: AbortSignal): Promise<HostCheck> {
  let addresses;
  try {
    addresses = await Promise.race([lookup(hostname, { all: true }), whenAborted(signal)]);
  } catch {
    return "unresolved";
  }
  if (addresses.length === 0) return "unresolved";
  return addresses.every((a) => isPublicAddress(a.address)) ? "public" : "private";
}
