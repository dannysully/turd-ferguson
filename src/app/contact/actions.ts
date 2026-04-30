"use server";

// TODO: wire up email sending here — recommended: Resend (https://resend.com)
// Install: npm install resend
// Then replace the placeholder below with actual send logic
const CONTACT_EMAIL_DESTINATION = "hello@alwayscited.com"; // PLACEHOLDER: confirm actual email before launch

export type ContactFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const company = formData.get("company")?.toString().trim();
  const website = formData.get("website")?.toString().trim();
  const message = formData.get("message")?.toString().trim();

  if (!name || !email || !message) {
    return { status: "error", message: "Name, email, and message are required." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  // TODO: replace this log with actual email send via Resend or similar
  console.log("Contact form submission:", {
    to: CONTACT_EMAIL_DESTINATION,
    name,
    email,
    company,
    website,
    message,
  });

  // TODO: throw on send failure so the error branch below catches it
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from: "...", to: CONTACT_EMAIL_DESTINATION, ... });

  return { status: "success" };
}
