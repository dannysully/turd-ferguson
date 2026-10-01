import { CARD, MICRO, SHELL, T } from "@/config/tokens";

/**
 * The 404 for a coverage reading's link, rather than for an address.
 *
 * Without this file a token that matched no campaign fell through to the root
 * 404, "That address does not match anything here." - right for a mistyped
 * marketing URL, wrong here, and its cards (scan, packages, how it works) led
 * away from the one journey the visitor was on. Found by
 * docs/parity/r151-not-found.mjs (R151, 1 Oct 2026). Same reasoning and idiom
 * as src/app/scan/[token]/not-found.tsx: the address was almost certainly
 * right, the link was cut short or copied part-way, and the next step is the
 * coverage check itself.
 *
 * A read that failed is not this page: readCampaign throws on a database
 * error, so that goes to error.tsx and its retry. Only a token that matches no
 * campaign lands here.
 */

const ROUTES = [
  {
    href: "/coverage-check",
    label: "Take a new reading",
    body: "Paste the coverage list again and the check runs from the start. No call and no card.",
  },
  {
    href: "/contact",
    label: "Tell us the link was broken",
    body: "Send us the link you were given and we will find the reading behind it.",
  },
];

export default function ReadingNotFound() {
  return (
    <section style={{ ...SHELL, paddingTop: "48px", paddingBottom: "56px" }}>
      <div style={MICRO}>Reading not found</div>
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
        That link does not match a coverage reading we hold.
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
        Reading links are long, and mail clients and chat apps sometimes cut them short. If you were sent one, check it
        ran all the way to the end before you clicked it.
      </p>

      <div
        style={{
          marginTop: "26px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxWidth: "620px",
        }}
      >
        {ROUTES.map((r) => (
          <a
            key={r.href}
            href={r.href}
            style={{
              ...CARD,
              borderRadius: "14px",
              padding: "18px 20px",
              display: "block",
              textDecoration: "none",
            }}
          >
            <div style={{ ...MICRO, color: T.accent }}>{r.label}</div>
            <p style={{ margin: "7px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>{r.body}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
