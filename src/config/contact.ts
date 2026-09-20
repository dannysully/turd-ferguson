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
