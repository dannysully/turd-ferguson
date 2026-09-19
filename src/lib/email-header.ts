/**
 * Collapse anything that could break a mail header, and bound it.
 *
 * A subject line is assembled from values a stranger typed. Newlines in a
 * header are the injection vector, and an unbounded one is a subject line as
 * long as the form field allows. Collapsing all whitespace to single spaces
 * handles both CR and LF without caring which arrived.
 *
 * Lived in verify-email.ts and was private to it, so the contact form - the
 * one subject line actually built from a stranger name - was the only sender
 * not using it. Shared rather than copied, because two of these that drift
 * apart is worse than one in an awkward place.
 */
export function headerSafe(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 120);
}
