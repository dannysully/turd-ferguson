"use client";

import { useState } from "react";

import { SCAN_LIMITS } from "@/config/contact";
import { T } from "@/config/tokens";
import { track } from "@/lib/analytics";

import { btn, field, label } from "./screens";

/**
 * The walkthrough ask, in its own file because two surfaces make it.
 *
 * It was declared inside `ResultView` and used once, which was right while the
 * scan report was the only page with a call to action. The campaign benchmark
 * is the second: a PR agency that has just read which of its placements the
 * engines cited is being asked the same question - do you want to see the
 * dashboards - and copying the form there would have been two forms posting to
 * one endpoint, drifting apart a field at a time.
 *
 * `token` is a **scans** token, not a campaign one. `/api/scan/[token]/walkthrough`
 * looks the row up by `scans.public_token`, and a campaign's own public token
 * will 404 against it. The benchmark reading passes its reading's scan token
 * for that reason - see `readCampaign`, which selects it.
 *
 * The ask itself, since 24 September 2026. Danny: the result should lead into
 * alwaystracked, and the CTA is purely a walkthrough - a Loom of the platform
 * or a demo call with him. alwaystracked is set up per client rather than
 * self-serve today, so "see it" means somebody shows you.
 *
 * What this must keep straight: alwaystracked reports, it does not place. The
 * placements are alwaysmentioned, which is a service.
 */
export default function WalkthroughForm(p: { token: string }) {
  const [kind, setKind] = useState<"video" | "demo">("video");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      const res = await fetch("/api/scan/" + p.token + "/walkthrough", {
        method: "POST",
        headers,
        body: JSON.stringify({ email, kind }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 429) {
        setErr(data.message ?? "That did not go through. Please try again.");
        return;
      }
      setDone(data.message ?? "Thanks. Danny will be in touch.");
      track("walkthrough_requested", { kind });
    } catch {
      setErr("We could not reach the checker. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p aria-live="polite" style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.ink }}>
        {done}
      </p>
    );
  }

  // ScanResult.dc.html's switch: two short labels on a grey track, and the
  // chosen one's note under it rather than inside each half.
  const options: { key: "video" | "demo"; title: string; note: string }[] = [
    { key: "video", title: "Loom walkthrough", note: "A Loom of the platform, recorded against this report." },
    { key: "demo", title: "Demo with Danny", note: "Danny takes you through it on a call." },
  ];
  const chosen = options.find((o) => o.key === kind) ?? options[0];

  return (
    <form onSubmit={submit} noValidate>
      <div role="radiogroup" aria-label="How would you like to see it" className="wt-toggle">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={kind === o.key}
            onClick={() => setKind(o.key)}
            className={"wt-option" + (kind === o.key ? " wt-option--on" : "")}
          >
            {o.title}
          </button>
        ))}
      </div>
      <p aria-live="polite" style={{ margin: "14px 0 0", fontSize: "13.5px", lineHeight: 1.5, color: T.soft, minHeight: "42px" }}>
        {chosen.note}
      </p>
      <label htmlFor="wt-email" style={{ ...label, marginTop: "14px", display: "block" }}>
        Work email
      </label>
      <input
        id="wt-email"
        type="email"
        name="email"
        autoComplete="email"
        maxLength={SCAN_LIMITS.email}
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={field}
        aria-invalid={Boolean(err)}
        aria-describedby={err ? "wt-error" : undefined}
      />
      {err ? (
        <p id="wt-error" role="alert" style={{ fontSize: "13px", color: T.badFg, marginTop: "8px" }}>
          {err}
        </p>
      ) : null}
      <button type="submit" className="btn-primary" style={{ ...btn, width: "100%", marginTop: "12px" }} disabled={busy}>
        {busy ? "Sending" : kind === "video" ? "Send me the walkthrough" : "Request a demo"}
      </button>
      <p style={{ fontSize: "12px", color: T.soft, marginTop: "10px", lineHeight: 1.5 }}>
        We use it to send you the walkthrough or arrange the call, and nothing else. <a href="/legal">What we collect</a>.
      </p>
    </form>
  );
}
