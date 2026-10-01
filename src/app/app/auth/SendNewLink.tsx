"use client";

import { useState } from "react";

import { T } from "@/config/tokens";

/**
 * R163: a spent or expired login link offers a new one in one click, to the
 * address the old one went to. Posts to /api/app/login as LoginForm does, so
 * the same hourly limit and the same one sentence back.
 */
export default function SendNewLink({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    if (busy) return;
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
    <div style={{ display: "grid", gap: "12px" }}>
      <button
        type="button"
        onClick={send}
        aria-disabled={busy || undefined}
        style={{ padding: "12px 16px", borderRadius: "10px", border: "none", background: T.accent, color: "#ffffff", fontWeight: 600, fontSize: "15px", cursor: busy ? "progress" : "pointer", overflowWrap: "anywhere" }}
      >
        {busy ? (
          <>
            <span className="btn-spin" aria-hidden="true" />
            Sending...
          </>
        ) : (
          `Send a new link to ${email}`
        )}
      </button>
      <p role="status" aria-live="polite" style={{ margin: 0, fontSize: "14px", color: T.soft, minHeight: "20px" }}>
        {message}
      </p>
    </div>
  );
}
