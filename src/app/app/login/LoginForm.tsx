"use client";

import { useState } from "react";

import { SCAN_LIMITS } from "@/config/contact";
import { T } from "@/config/tokens";

/** The email box on /app/login. Posts to /api/app/login and shows its one sentence. */
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/app/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setMessage(body.message ?? "Something went wrong. Please try again.");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "12px" }}>
      <label htmlFor="app-login-email" style={{ fontSize: "14px", fontWeight: 600 }}>
        Work email
      </label>
      <input
        id="app-login-email"
        type="email"
        required
        autoComplete="email"
        maxLength={SCAN_LIMITS.email}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: "12px 14px", border: `1px solid ${T.line}`, borderRadius: "10px", fontSize: "15px", color: T.ink }}
      />
      <button
        type="submit"
        disabled={busy}
        style={{ padding: "12px 16px", borderRadius: "10px", border: "none", background: T.accent, color: "#ffffff", fontWeight: 600, fontSize: "15px" }}
      >
        {busy ? "Sending..." : "Email me a link"}
      </button>
      <p role="status" aria-live="polite" style={{ margin: 0, fontSize: "14px", color: T.soft, minHeight: "20px" }}>
        {message}
      </p>
    </form>
  );
}
