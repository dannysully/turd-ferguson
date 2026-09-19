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
export const CONTACT_LIMITS = { name: 120, email: 254, company: 200, message: 5000 };
