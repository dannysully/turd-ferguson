import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { clientsFor, sessionEmail } from "@/lib/tracking/member";

export const dynamic = "force-dynamic";

/** Private - noindex here as well as in the layout, the header rule and robots.txt. */
export const metadata: Metadata = {
  title: "alwaystracked dashboard",
  robots: { index: false, follow: false },
};
export const runtime = "nodejs";

/** /app sends a member to their first client, and anyone else to the login page. */
export default async function AppHome() {
  const email = await sessionEmail();
  if (!email) redirect("/app/login");
  const clients = await clientsFor(email);
  if (!clients.length) redirect("/app/login?access=none");
  redirect(`/app/${clients[0]!.slug}`);
}
