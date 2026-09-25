"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { track } from "@/lib/analytics";

import { DomainScreen } from "./screens";
import Turnstile from "./Turnstile";

/**
 * The domain field, and nothing else.
 *
 * Everything after it happens at /scan/[token]: confirming the category, the
 * run, the result and the report. That split is the flow boards - the confirm
 * step alone is a fourteen-row table, which was never going to live inside a
 * 400px column in the hero - and it means a reload, a second device or the
 * link in the email all land on the same scan rather than an empty form.
 *
 * A cached complete scan goes to the same place. The token is the scan.
 */
export default function LiveScanChecker({ initialDomain = "" }: { initialDomain?: string }) {
  const router = useRouter();
  const [domain, setDomain] = useState(initialDomain);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onDomain(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    track("scan_started", { domain });

    try {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      const res = await fetch("/api/scan/start", {
        method: "POST",
        headers,
        // No market: the start route picks it from the domain (market-pick.ts).
        // This used to send a hard-coded "UK", which meant every scan opened
        // on the UK whatever the domain said.
        body: JSON.stringify({ domain, turnstileToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }

      // Left busy on purpose: the navigation is the next thing that happens,
      // and a field that goes live again for half a second invites a second
      // submission of the same domain.
      router.push("/scan/" + data.token);
    } catch {
      setError("We could not reach the checker. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <DomainScreen
        value={domain}
        onChange={setDomain}
        onSubmit={onDomain}
        error={error}
        busy={busy}
      />
      <Turnstile onToken={setTurnstileToken} />
    </div>
  );
}
