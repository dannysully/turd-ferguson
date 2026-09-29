import type { Metadata } from "next";
import { T } from "@/config/tokens";
import { TOKEN_CHARS, isTokenShape } from "@/lib/tracking/session";

export const dynamic = "force-dynamic";

/** Private - noindex here as well as in the layout, the header rule and robots.txt. */
export const metadata: Metadata = {
  title: "Log in - alwaystracked",
  robots: { index: false, follow: false },
};

/**
 * Where the login link lands (T3). It does not log anybody in on its own: mail
 * scanners open links on delivery, so the single-use token is spent by the
 * button below, a POST, and never by this GET.
 */
export default async function AppAuth({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await searchParams;
  const ok = isTokenShape(token);
  return (
    <section style={{ maxWidth: "420px", margin: "0 auto", padding: "72px 24px 96px", color: T.ink }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 16px" }}>{ok ? "Log in" : "That link is not valid"}</h1>
      {ok ? (
        <form method="post" action="/api/app/auth">
          <input type="hidden" name="token" value={token} maxLength={TOKEN_CHARS} />
          <button
            type="submit"
            style={{ padding: "12px 16px", borderRadius: "10px", border: "none", background: T.accent, color: "#ffffff", fontWeight: 600, fontSize: "15px" }}
          >
            Open my dashboard
          </button>
        </form>
      ) : (
        <p style={{ color: T.soft }}>
          <a href="/app/login" style={{ color: T.accent }}>Ask for a new link</a>.
        </p>
      )}
    </section>
  );
}
