"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Turnstile from "@/components/scan/Turnstile";
import { T } from "@/config/tokens";

/**
 * Take another reading of the same campaign.
 *
 * The reading page says the same five questions will be asked again after the
 * campaign, and this is the thing that makes that true rather than a promise.
 * It posts to the campaign's own token, so nothing here identifies the caller
 * beyond already holding the link.
 *
 * On success it refreshes the page rather than navigating: the route is the
 * same one, the new reading is now the newest, and the server re-renders it as
 * queued with the poll already attached.
 */
export default function RerunButton({ token }: { token: string }) {
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/coverage-check/${token}/rerun`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ turnstileToken }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) {
        // The server's own sentence. It knows whether this is a ceiling, a pass
        // already running, or a link that matches nothing, and none of those
        // survives being replaced with "something went wrong".
        setError(json.message ?? "We could not start that reading. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("We could not reach the benchmark. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        style={{
          fontSize: "14px",
          fontWeight: 600,
          fontFamily: "inherit",
          color: "#ffffff",
          background: T.accent,
          border: "none",
          borderRadius: "10px",
          padding: "11px 18px",
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "Starting" : "Take another reading"}
      </button>
      <Turnstile onToken={setTurnstileToken} />
      {/* Announced. This button says "Starting", goes back to "Take another
          reading", and the reason it did not start is the only new thing on
          the page - so without a live region the whole outcome of pressing it
          is invisible to a screen reader. */}
      {error && (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: "13px", color: T.badFg, lineHeight: 1.55 }}>
          {error}
        </p>
      )}
    </div>
  );
}
