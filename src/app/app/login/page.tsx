import type { Metadata } from "next";
import BrandMark from "@/components/BrandMark";
import TierName from "@/components/TierName";
import { T } from "@/config/tokens";

import { safeNext } from "@/lib/tracking/next-path";

import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

/** Private - noindex here as well as in the layout, the header rule and robots.txt. */
export const metadata: Metadata = {
  title: "Log in - alwaystracked",
  robots: { index: false, follow: false },
};

/** Dashboard login (T3, 29 Sep 2026). The link lasts 15 minutes and works once. */
export default async function AppLogin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const note =
    q.link === "expired"
      ? "That link has expired or was already used. Ask for a new one below."
      : q.access === "none"
        ? "That address has no dashboard yet. If you think it should, reply to the email you got from us."
        : null;
  return (
    // No site header or footer here (R104), so the page carries its own lockup.
    <section style={{ maxWidth: "420px", margin: "0 auto", padding: "72px 24px 96px", color: T.ink }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "40px" }}>
        <BrandMark id="app-login" size={15} />
        <TierName tier="tracked" />
      </div>
      <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px" }}>Log in to your dashboard</h1>
      <p style={{ margin: "0 0 24px", color: T.soft, fontSize: "15px" }}>
        We&apos;ll email you a link. It works once, for 15 minutes.
      </p>
      {note ? <p style={{ margin: "0 0 16px", fontSize: "14px", color: T.ink }}>{note}</p> : null}
      {/* R164: where a signed-out visitor was going, carried through the email link. */}
      <LoginForm next={safeNext(q.next) ?? undefined} />
    </section>
  );
}
