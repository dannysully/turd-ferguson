"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { normalizeDomain } from "@/lib/scan/domain";

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
export default function LiveScanChecker({
  initialDomain = "",
  dark = false,
  onBusyChange,
}: {
  initialDomain?: string;
  dark?: boolean;
  /** Told every time busy flips, so a parent can hide its own lines (R49). */
  onBusyChange?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [domain, setDomain] = useState(initialDomain);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [busy, setBusyState] = useState(false);
  function setBusy(next: boolean) {
    setBusyState(next);
    onBusyChange?.(next);
  }
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /**
   * What the start route is doing while the button says Checking, in its own
   * order (R32, 27 Sep 2026): the domain and the ceilings, then the market,
   * then the site read that names the brand. It holds on the last rather than
   * looping. Danny's third step was "Writing your questions", but nothing in
   * /api/scan/start writes them - they are written after the confirm step, by
   * /questions - so the third says what this call actually does.
   */
  const shown = normalizeDomain(domain);
  const steps = [`Checking ${shown}`, "Working out your market", "Reading your site"];

  function stopSteps() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }
  useEffect(() => stopSteps, []);

  async function onDomain(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    setStep(0);
    stopSteps();
    timers.current = [setTimeout(() => setStep(1), 1500), setTimeout(() => setStep(2), 3500)];
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
        stopSteps();
        setError(data.message ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }

      // Left busy on purpose: the navigation is the next thing that happens,
      // and a field that goes live again for half a second invites a second
      // submission of the same domain. The steps stop where they are.
      stopSteps();
      router.push("/scan/" + data.token);
    } catch {
      stopSteps();
      setError("We could not reach the checker. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <DomainScreen
        value={busy ? shown : domain}
        onChange={setDomain}
        onSubmit={onDomain}
        error={error}
        status={busy ? steps[step] : ""}
        busy={busy}
        dark={dark}
      />
      <Turnstile onToken={setTurnstileToken} theme={dark ? "dark" : "light"} />
    </div>
  );
}
