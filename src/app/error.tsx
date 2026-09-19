"use client";

import { CARD, MICRO, SHELL, T } from "@/config/tokens";

/**
 * The runtime error boundary, for the same reason as not-found.tsx: without
 * one, an exception anywhere below the root layout renders Next's own
 * fallback, which brings its own black-on-white stylesheet and a dark-scheme
 * pair with it.
 *
 * Next 16 calls the recovery prop retry, not reset. reset still exists and
 * the docs say to prefer retry, because retry re-fetches before re-rendering
 * and reset only clears the boundary - and every plausible error here is a
 * failed read rather than bad client state.
 *
 * The digest is printed deliberately. It is the only string that ties what
 * the visitor saw to a line in the server log, and asking somebody to quote
 * it is the difference between a reproducible report and "it broke".
 *
 * The root layout is not covered by this file - an error thrown in the
 * chrome itself needs global-error.tsx. The chrome is static markup with no
 * data in it, so that is not built.
 */

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section style={{ ...SHELL, paddingTop: "48px", paddingBottom: "56px" }}>
      <div style={MICRO}>Error</div>
      <h1
        style={{
          margin: "10px 0 0",
          fontSize: "36px",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.18,
          color: T.ink,
        }}
      >
        Something broke at our end.
      </h1>
      <p
        style={{
          margin: "14px 0 0",
          fontSize: "15px",
          lineHeight: 1.7,
          color: T.soft,
          maxWidth: "56ch",
        }}
      >
        This page did not load. Trying again is worth doing first - most of what fails here is a read that timed out
        rather than anything saved wrongly.
      </p>

      <div style={{ marginTop: "24px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "#ffffff",
            background: T.accent,
            border: "none",
            borderRadius: "10px",
            padding: "13px 26px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: T.ink,
            background: T.surface,
            border: "1px solid " + T.line,
            borderRadius: "10px",
            padding: "12px 25px",
            textDecoration: "none",
          }}
        >
          Back to the homepage
        </a>
      </div>

      {error.digest ? (
        <div style={{ ...CARD, borderRadius: "14px", padding: "16px 20px", marginTop: "24px", maxWidth: "620px" }}>
          <div style={MICRO}>If you tell us about this, quote this reference</div>
          <p
            style={{
              margin: "7px 0 0",
              fontSize: "14px",
              lineHeight: 1.6,
              color: T.ink,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            {error.digest}
          </p>
          <p style={{ margin: "7px 0 0", fontSize: "13px", lineHeight: 1.6, color: T.faint }}>
            It is a hash of the error itself, so it matches our server log and contains nothing you typed.
          </p>
        </div>
      ) : null}
    </section>
  );
}
