"use client";

import { useEffect, useState } from "react";

import { SCAN_LIMITS } from "@/config/contact";
import { CONTACT_URL } from "@/config/pricing";
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
 *
 * The third surface, 28 September 2026 (pricing spec section 6, Danny,
 * danny.md line 55): every tier page, where there is no scan. Pass `from` (the
 * tier page's path) instead of `token` and it posts to `/api/walkthrough`,
 * which stores the ask with no scan. Without JS that version renders nothing -
 * the page's own "Book a call" link stands in, since a form that cannot post
 * would only lose the address.
 *
 * The third option, "Book a call" (R54, Danny, danny.md line 55), is a link to
 * /contact, not a stored ask: `walkthrough_requests.kind` allows only video and
 * demo, and widening that check is a drop-and-recreate outside the additive
 * authorisation (blocked.md, default (b)). Once the constraint allows 'call',
 * this option can post like the other two.
 */
export default function WalkthroughForm(p: { token: string } | { from: string }) {
  const token = "token" in p ? p.token : null;
  const [mounted, setMounted] = useState(token !== null);
  useEffect(() => setMounted(true), []);
  const [kind, setKind] = useState<"video" | "demo" | "call">("video");
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
      // Two literal calls, not one with a computed path: route-callers reads
      // each fetch's own first argument to join it to the route that answers.
      const res = token
        ? await fetch("/api/scan/" + token + "/walkthrough", {
            method: "POST",
            headers,
            body: JSON.stringify({ email, kind }),
          })
        : await fetch("/api/walkthrough", {
            method: "POST",
            headers,
            body: JSON.stringify({ email, kind, from: "from" in p ? p.from : "" }),
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

  if (!mounted) return null;

  if (done) {
    return (
      <p aria-live="polite" style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.ink }}>
        {done}
      </p>
    );
  }

  // ScanResult.dc.html's switch: short labels on a grey track, and the chosen
  // one's note under it rather than inside each option.
  const options: { key: "video" | "demo" | "call"; title: string; note: string }[] = [
    {
      key: "video",
      title: "Loom walkthrough",
      note: token ? "A Loom of the platform, recorded against this report." : "A Loom of the platform, recorded for you.",
    },
    { key: "demo", title: "Demo with Danny", note: "Danny takes you through it on a call." },
    { key: "call", title: "Book a call", note: "Pick a time with Danny on the contact page, and bring your questions." },
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
      {kind === "call" ? (
        <a
          href={CONTACT_URL}
          className="btn-primary"
          style={{ ...btn, width: "100%", marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", boxSizing: "border-box" }}
        >
          Book a call
        </a>
      ) : (
      <>
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
      </>
      )}
    </form>
  );
}
