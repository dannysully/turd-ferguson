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
 *
 * "was the only sender not using it" was wrong when it was written, and stayed
 * wrong for as long as it was only a sentence. The waitlist action builds a
 * subject from a domain an anonymous visitor typed and called none of this,
 * which no test could see, because the test over this species read the contact
 * action and nothing else. A sender census belongs in a test rather than in a
 * comment counting senders, and it is in `email-header.test.mts` now.
 */
export function headerSafe(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 120);
}
