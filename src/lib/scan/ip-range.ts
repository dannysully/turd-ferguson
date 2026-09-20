/**
 * Whether an IP address literal belongs to a public web server.
 *
 * Pure: no DNS, no network, no secret, nothing to guard. It is string in,
 * boolean out.
 *
 * It lives apart from `address.ts` for the reason `opportunities.ts` lives
 * apart from `unlock.ts`. That file opens with `import "server-only"`, which is
 * correct there - it resolves hostnames through `node:dns` - but it also makes
 * the module unloadable outside a server component, so `node --test` cannot
 * import it. The effect was that the arithmetic below, which is the security
 * boundary of the whole free scan and the purest code in the tree, was the one
 * thing in `src/lib/scan` with no check on it at all, while every smaller pure
 * function beside it has one. A previous session read it closely and recorded
 * that it had found nothing wrong; that is a claim about a reading, and this
 * file is what makes it a claim about the code.
 *
 * `address.ts` imports and re-exports `isPublicAddress`, so every caller and
 * every import path is unchanged. The `server-only` protection that matters is
 * unaffected: it sits on `checkHost`, which is what actually resolves a
 * hostname, and that stays where it was.
 *
 * ---
 *
 * Why this exists at all. The domain on the scan form is typed by whoever is
 * asking, `readSite` fetches it server side, and the prose that comes back is
 * summarised by the model into `brand_name` and `positioning` - both of which
 * are returned to the person who typed the address. That is a read of any URL
 * our function can reach, with the result handed back: an internal admin page,
 * a staging host, or a cloud metadata endpoint on 169.254.169.254.
 *
 * `isPlausibleDomain` already refuses a literal IP, because its TLD test wants
 * letters. It does nothing about a perfectly ordinary hostname whose A record
 * points at 10.0.0.1, which costs an attacker one DNS record and no cleverness
 * at all, nor about a public site that answers with a redirect into a private
 * range.
 *
 * So the ranges below are checked numerically rather than by string, and every
 * representation of an address is reduced to a number first. An IPv4-mapped
 * IPv6 literal and its dotted quad are the same host, and only one of them
 * looks like it.
 */

/** IPv4 ranges that are not a public web server. */
const V4_BLOCKS: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8], // this network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, and the cloud metadata endpoint with it
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay anycast, deprecated
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, and 255.255.255.255 inside it
];

/**
 * IPv6 is judged the other way round, by what is allowed.
 *
 * 2000::/3 is the only range IANA has assigned as global unicast, so everything
 * a public website can be reached on is inside it and everything outside it is
 * loopback, link-local, unique local, multicast or unallocated. Listing the
 * exclusions instead was how the first draft of this read, and it leaked: the
 * large reserved blocks - fbff::, fe00::, 100::/8 - are not private ranges
 * anybody names, so they were simply missing, and a block-list would need
 * editing by hand every time IANA reserves another one.
 *
 * The two /96s that carry an IPv4 address in their low 32 bits are handled
 * before this test, because what they reach is that IPv4 address and it is the
 * IPv4 table that should judge it.
 */
const V6_GLOBAL: readonly [string, number] = ["2000::", 3];

/** Inside global unicast, and still not a public website. */
const V6_BLOCKS: ReadonlyArray<readonly [string, number]> = [
  ["2001::", 32], // Teredo, which tunnels to an embedded IPv4 address
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4, which relays to an embedded IPv4 address
];

/** IPv4-mapped IPv6. */
const V4_MAPPED: readonly [string, number] = ["::ffff:0:0", 96];
/** NAT64, which reaches the embedded IPv4 address just the same. */
const NAT64: readonly [string, number] = ["64:ff9b::", 96];

/**
 * A dotted quad as a 32-bit number, or null if it is not one.
 *
 * Exported for the test, which needs to be able to say what a boundary address
 * actually is rather than trusting the same parser twice.
 */
export function v4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const v = Number(part);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

/**
 * An IPv6 literal as a 128-bit value, or null if it is not one.
 *
 * Handles the one compressed run, a trailing dotted quad and a zone id, because
 * those are the forms the same address can arrive in and a prefix compared as
 * text would miss most of them.
 */
export function v6ToBigInt(ip: string): bigint | null {
  const bare = ip.split("%")[0];
  if (!bare.includes(":")) return null;

  // A trailing dotted quad stands for the low two groups.
  let head = bare;
  const lastColon = bare.lastIndexOf(":");
  const tail = bare.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = v4ToInt(tail);
    if (v4 === null) return null;
    const hi = (v4 >>> 16).toString(16);
    const lo = (v4 & 0xffff).toString(16);
    head = bare.slice(0, lastColon + 1) + hi + ":" + lo;
  }

  const halves = head.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];

  let groups: string[];
  if (halves.length === 2) {
    const fill = 8 - left.length - right.length;
    if (fill < 1) return null;
    groups = [...left, ...Array<string>(fill).fill("0"), ...right];
  } else {
    groups = left;
  }
  if (groups.length !== 8) return null;

  let n = BigInt(0);
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    n = (n << BigInt(16)) | BigInt(parseInt(group, 16));
  }
  return n;
}

function inV4Block(n: number, block: readonly [string, number]): boolean {
  const b = v4ToInt(block[0]);
  if (b === null) return false;
  const mask = (0xffffffff << (32 - block[1])) >>> 0;
  return ((n & mask) >>> 0) === ((b & mask) >>> 0);
}

function inV6Block(n: bigint, block: readonly [string, number]): boolean {
  const b = v6ToBigInt(block[0]);
  if (b === null) return false;
  const shift = BigInt(128 - block[1]);
  return n >> shift === b >> shift;
}

function isPublicV4(n: number): boolean {
  return !V4_BLOCKS.some((block) => inV4Block(n, block));
}

/**
 * Whether an address literal is a public one.
 *
 * Anything that does not parse as either family is refused rather than allowed:
 * an address we cannot read is not one we can vouch for.
 */
export function isPublicAddress(ip: string): boolean {
  const v4 = v4ToInt(ip);
  if (v4 !== null) return isPublicV4(v4);

  const v6 = v6ToBigInt(ip);
  if (v6 === null) return false;

  if (inV6Block(v6, V4_MAPPED) || inV6Block(v6, NAT64)) {
    return isPublicV4(Number(v6 & BigInt(0xffffffff)));
  }
  if (!inV6Block(v6, V6_GLOBAL)) return false;
  return !V6_BLOCKS.some((block) => inV6Block(v6, block));
}
