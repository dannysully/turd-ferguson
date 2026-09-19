import { CARD, MICRO, SHELL, T } from "@/config/tokens";

/**
 * The 404 for a scan link, rather than for an address.
 *
 * Without this file a token that resolves to nothing fell through to the root
 * 404, which opens "That address does not match anything here." That is right
 * for a mistyped marketing URL and wrong here: the address was almost
 * certainly correct, the visitor arrived by following a link they were sent,
 * and what is missing is the scan.
 *
 * It deliberately does not say the link expired. Nothing deletes a scan row -
 * the retention job clears response_text from unclaimed scans after
 * app_settings.response_retention_days and leaves the scan and its token where
 * they are - so a token that does not resolve either never existed or did not
 * arrive whole. Truncation by a mail client or a chat app is the likely cause
 * and the only one the reader can act on, so that is what the copy leads with.
 *
 * Same idiom as the root 404: micro-label, 36px heading, one paragraph, cards
 * that all point somewhere real.
 */

const ROUTES = [
  {
    href: "/#scan",
    label: "Run a fresh scan",
    body:
      "Give it the domain again and it runs from the start. It takes about a minute, and there is no call and no card.",
  },
  {
    href: "/contact",
    label: "Tell us the link was broken",
    body:
      "If this came from us, send us the link you were given and we will find the scan behind it.",
  },
];

export default function ScanNotFound() {
  return (
    <section style={{ ...SHELL, paddingTop: "48px", paddingBottom: "56px" }}>
      <div style={MICRO}>Scan not found</div>
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
        That link does not match a scan we hold.
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
        Scan links are long, and mail clients and chat apps sometimes cut them short. If you followed one from an
        email, check it ran all the way to the end before you clicked it. Running a new scan works too, and nothing
        is lost by doing it.
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
