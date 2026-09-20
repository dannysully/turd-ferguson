/**
 * Field bounds for the contact form, in one place because both sides need them.
 *
 * The server rejects anything over these - it has to, the form is a public
 * endpoint and nothing stops a post that never rendered the page. The inputs
 * carry them as maxLength too, so somebody pasting a long message is stopped
 * at the field rather than by an error after they press Send.
 *
 * They cannot live in contact/actions.ts: a "use server" module may only
 * export async functions, so a client component cannot read a constant from it.
 */
/**
 * email is 254 because that is the longest an address may be over SMTP
 * (RFC 5321). It was the one field with no bound on either side, while the
 * comment above and the one in contact/actions.ts both said every field had
 * one - and it is the field that goes into a header rather than a body, as
 * the reply-to on the message we send ourselves.
 */
/**
 * website is the honeypot. It is never sent in a message, so it looked like
 * the one field that did not need a bound - but a filled one is logged, and
 * an unbounded attacker-controlled string written to a function log is the
 * same exposure as one written to a header, just paid for by the megabyte
 * rather than delivered.
 *
 * This is the second time the comments here and in contact/actions.ts have
 * promised every field was bounded while one was not. It was email last time,
 * for the same reason: the field nobody pictured as a field.
 */
export const CONTACT_LIMITS = { name: 120, email: 254, company: 200, message: 5000, website: 200 };

/**
 * The same, for the other public form.
 *
 * `RequestScanForm` posts to a "use server" action that mails Danny, and it had
 * no bound on any of its three fields on either side - so the defect this file
 * exists for had a third instance, in a file neither the comments here nor
 * `contact.test.mts` could see. Both were scoped to the contact action, and the
 * species is not "the contact form" but "a public form whose values we put in a
 * message".
 *
 * They live beside CONTACT_LIMITS rather than in their own module so that there
 * is one place to look and one denominator to sweep. A fourth form with its own
 * table somewhere else is how this happens a fourth time.
 *
 * domain is 253, the longest a DNS name may be, and it is the bound the live
 * scan path already enforces in `isPlausibleDomain`. email is 254 for the same
 * RFC 5321 reason as above; it becomes the reply-to header on what we send
 * ourselves. topic is free text and matches `company`.
 */
export const WAITLIST_LIMITS = { domain: 253, topic: 200, email: 254 };

/**
 * The campaign benchmark form, which is the fourth table this file predicted.
 *
 * The comment above says in as many words that "a fourth form with its own
 * table somewhere else is how this happens a fourth time", and that is exactly
 * what `/api/coverage-check` had: `text(body.brand, 2, 80)`,
 * `text(body.topic, 2, 120)` and `text(body.segment, 2, 80)` typed into the
 * route, with no bound of any kind on the four inputs that feed them.
 *
 * The route was never wrong - it refuses an over-length value the way it always
 * did. What was wrong is what the visitor is told. `text()` returns null for
 * too-short and too-long alike, and the message only describes the short case,
 * so pasting a long brand name got back "Tell us the brand name." after a
 * Turnstile check and a round trip, on the one form on this site that spends
 * money. The bound on the input makes that branch unreachable from the form.
 *
 * min is here as well as max because the route checks both, and a table that
 * only carried the half the input uses is how the two drift apart again.
 */
export const COVERAGE_LIMITS = {
  brand: { min: 2, max: 80 },
  topic: { min: 2, max: 120 },
  segment: { min: 2, max: 80 },
};

/**
 * The scan flow's own two editable fields, which are a different pair of
 * numbers from the waitlist's and were reached by a different route.
 *
 * `ConfirmScreen` is where a question is edited before it is billed. Its
 * category field had no bound while the confirm and questions routes both
 * refuse a topic over 120; its question rows had `maxLength={200}`, a typed
 * literal that happens to match the routes' own 200 rather than reading it.
 * One of the two was a live gap and the other was a coincidence waiting to
 * stop being one, and neither is the waitlist's `topic: 200` - that bound
 * belongs to `TopicScreen`, which posts to the waitlist action and not to a
 * scan route, so it is correct where it is and must not be tidied into
 * agreement with these.
 */
export const SCAN_LIMITS = { topic: 120, question: 200, email: 254 };
