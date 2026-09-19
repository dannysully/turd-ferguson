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
