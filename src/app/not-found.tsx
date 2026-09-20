import { CARD, MICRO, SHELL, T } from "@/config/tokens";
import { PRICED_TIERS, TIERS } from "@/config/pricing";
import { count } from "@/lib/plural";

/**
 * The 404. There is no board for it, so this is the interior-page idiom the
 * rebuilt pages share: micro-label, 36px heading, one paragraph, a list of
 * cards.
 *
 * Built because there was not one. With no not-found file, Next renders its
 * own default inside the root layout and injects a stylesheet with it -
 * black on white, plus a prefers-color-scheme: dark pair that turns the
 * ground black. The header and footer keep their light colours because those
 * are inline, so the only page on the site without a design was also the only
 * one that could render light chrome on a black page. The Next docs say
 * providing your own markup is how you take full control, and it drops the
 * injected stylesheet with it.
 *
 * The title stays the layout default. not-found cannot export metadata - only
 * the experimental global-not-found can, and that bypasses the layout, so
 * matching a title would mean rebuilding the chrome on a page Next already
 * serves noindex on. Not a trade worth taking.
 *
 * Every destination below exists. A 404 that links to a second 404 is worse
 * than the default one. Plain anchors rather than next/link, matching the
 * closing CTA, which points at these same two homepage sections.
 */

const ROUTES = [
  {
    href: "/#scan",
    label: "Run a free scan",
    body:
      "Give it a domain and it reports which answers already name that brand, and which name somebody else. No call and no card.",
  },
  {
    href: "/#packages",
    label: "What each tier costs",
    // Was "Four tiers, every price published on the page." Three of the four
    // carry a figure; the fourth is a call. Both counts are derived now, so
    // this line cannot outlive the table it describes.
    body: `${count(TIERS.length, "tier")}, ${count(PRICED_TIERS.length, "price")} published on the page.`,
  },
  {
    href: "/how-it-works",
    label: "How it works",
    body: "What we do to get a brand cited, in the order we do it.",
  },
  {
    href: "/contact",
    label: "Tell us the link was broken",
    body:
      "If you followed a link to get here, say where it was and we will fix it.",
  },
];

export default function NotFound() {
  return (
    <section style={{ ...SHELL, paddingTop: "48px", paddingBottom: "56px" }}>
      <div style={MICRO}>404</div>
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
        That address does not match anything here.
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
        The page may have moved, or the link may never have pointed anywhere. Either way it is not something you did.
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
