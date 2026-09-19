/**
 * Comparing secrets, and reading the one place a secret arrives base64-encoded.
 *
 * Shared rather than copied because the two callers had drifted: the admin
 * proxy compared in constant time and the cron route compared with !==, and
 * neither file said why they differed. They differed because one was written
 * after the other.
 *
 * No node:crypto here on purpose. The proxy runs before rendering, in a
 * runtime that does not give it server-only modules, so this has to be
 * standard-library JavaScript to be importable from both sides.
 */

/**
 * Compares two strings without an early exit on the first differing
 * character.
 *
 * Length is still compared first and so still leaks, which is the standard
 * trade and the right one: padding to a fixed length to hide it would mean
 * choosing a maximum secret length, and the length of a bearer token is not
 * the part worth protecting.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The user and password out of an HTTP Basic credential.
 *
 * atob does not return text. It returns one character per decoded byte - a
 * latin1 string - and the bytes a browser sends here are UTF-8, because that
 * is what the charset parameter on our own WWW-Authenticate header asks for.
 * So a password holding an accented letter arrived as two characters where
 * the environment variable holds one, the comparison could never match, and
 * the failure was a login that is simply impossible rather than an error
 * anybody could read. Nothing has hit it because the configured password
 * happens to be ASCII, which is exactly the kind of thing that changes on the
 * day somebody rotates it.
 *
 * Returns null for anything that is not a well-formed credential, which the
 * caller answers with a challenge rather than a distinct error - whether the
 * base64 was invalid or the colon was missing is not the caller business.
 */
export function decodeBasicAuth(header: string): { user: string; password: string } | null {
  if (!header.toLowerCase().startsWith("basic ")) return null;

  let bytes: Uint8Array;
  try {
    const binary = atob(header.slice(6).trim());
    bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }

  const decoded = new TextDecoder("utf-8").decode(bytes);

  // The first colon, not the last: a colon is legal in a password and illegal
  // in a user name, so everything after the first one belongs to the password.
  const sep = decoded.indexOf(":");
  if (sep === -1) return null;

  return { user: decoded.slice(0, sep), password: decoded.slice(sep + 1) };
}
