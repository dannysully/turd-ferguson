"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Cloudflare Turnstile, rendered explicitly so the token lands in React state
 * rather than a hidden form field. Renders nothing when no site key is set, so
 * local development works without a Cloudflare account; the server still
 * refuses unverified requests in production.
 */
export default function Turnstile({ onToken, theme = "light" }: { onToken: (token: string | null) => void; theme?: "light" | "dark" }) {
  const holder = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const cb = useRef(onToken);

  // Kept in a ref so a changing callback does not tear down and re-render the
  // widget, which would drop a token the visitor has already solved for.
  useEffect(() => {
    cb.current = onToken;
  }, [onToken]);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !holder.current) return;
    let cancelled = false;

    function render() {
      if (cancelled || !holder.current || !window.turnstile || widget.current) return;
      widget.current = window.turnstile.render(holder.current, {
        sitekey: siteKey,
        callback: (token: string) => cb.current(token),
        "expired-callback": () => cb.current(null),
        "error-callback": () => cb.current(null),
        theme,
      });
    }

    if (window.turnstile) {
      render();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.src = SCRIPT_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
    }

    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) {
        window.turnstile.remove(widget.current);
        widget.current = null;
      }
    };
  }, [siteKey, theme]);

  if (!siteKey) return null;
  return <div ref={holder} style={{ marginTop: "0.875rem" }} />;
}
