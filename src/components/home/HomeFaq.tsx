import { CARD, GRID12, H2, MICRO, SHELL, T } from "@/config/tokens";
import { ORG_REF, SITE_REF, ld } from "@/config/schema";
import Link from "next/link";

/**
 * FAQ and the closing scan - HomeFaq.dc.html.
 *
 * The questions are <details>/<summary>, as on the board: open by default is
 * wrong for eight of them, and a disclosure that works without JavaScript is
 * better than an accordion that does not.
 *
 * The closing form is a plain GET to /scan, which is the no-JS path the app
 * already supports (/scan?domain=... prefills the hero). It deliberately does
 * not render a second LiveScanChecker: that component hardcodes
 * id="scan-email", so a second instance on this page would duplicate a DOM id
 * and break the label, and it would start a second independent scan.
 */

export type Faq = { q: string; hint: string; a: string };

export const FAQS: Faq[] = [
  {
    q: "If I am an agency, will you contact my client?",
    hint: "No, and it is in the agreement",
    a: "No. Not for a case study, not for a testimonial, not after the engagement ends. Every surface a client opens carries your branding, and the only place our name appears is on the invoice to you.",
  },
  {
    q: "Do I need links, or do mentions count?",
    hint: "Both, and they do different jobs",
    a: "An unlinked mention can get a brand named in an answer. A link does that and moves the Google position. Every placement we run carries one, which is why the two measures move together rather than separately.",
  },
  {
    q: "How long before anything moves?",
    hint: "Weeks for a placement, longer for a position",
    a: "A placement is live in weeks. Citation usually follows the next time the engine reads the page. A Google position moves on its own schedule, and we report the two separately rather than averaging them into one number that hides which one changed.",
  },
  {
    q: "What happens when a placement gets old?",
    hint: "It decays, and that is the honest answer",
    a: "Citation rates drift down as articles age and newer pages replace them in the engines' source sets. That is why the programme is a replacement cycle rather than a one-off campaign, and why the charts we show you have dips in them.",
  },
  {
    q: "Can I resell this, and at what margin?",
    hint: "Your call entirely",
    a: "The prices on the packages page are what an agency pays us, not what their client pays them. We have no view on what you charge and no way of finding out. If you are the brand rather than the agency, the same prices apply and there is nothing to mark up.",
  },
  {
    q: "Why is there no search volume anywhere in this?",
    hint: "Because it is zero on the questions that matter",
    a: "Search volume indexes keyword-shaped queries. What a buyer actually types into an engine is a sentence - eleven words, a budget, a constraint, a deadline - and those return nothing. On a real scan we ran in September, all fourteen questions came back at zero volume, and those fourteen were the ones deciding who got recommended. A column that reads zero on every row is not a measure. So we track the questions nearest the decision and report whether you were named in the answer, which is the thing that changes what someone buys.",
  },
  {
    q: "Then how do you choose which questions to track?",
    hint: "Backwards, from the decision",
    a: 'We start at the prompt someone types when they are ready to choose - "best X for a team of twelve moving off spreadsheets" - and work outwards to the questions sitting next to it. That is the opposite of keyword research, which starts at the biggest number and works down. Being named in the broadest question in your category is worth less than being named in the narrow one where somebody is deciding, and the broad one is far more crowded.',
  },
  {
    q: "What if I already pay for a tracking tool?",
    hint: "Keep it if your team knows it",
    a: "Most agencies that talk to us already pay for something. Our figures will not match theirs exactly - different prompt sets, different engines, different days - and where two tools disagree we report it rather than smooth it. What we add is the placements, which no tracking tool does.",
  },
];

/**
 * FAQPage, built from the same array the page renders. The README has claimed
 * this schema was on the homepage for a while and it was not - only
 * /what-is-aeo carried one. Generating it from FAQS rather than hand-writing
 * it means the markup and the answers cannot drift apart, which is the usual
 * way this schema goes wrong.
 */
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  isPartOf: SITE_REF,
  publisher: ORG_REF,
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function HomeFaq() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(faqSchema) }} />

      <section id="faq" style={{ ...SHELL, marginTop: "44px" }}>
        <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
          <h2 style={{ ...H2, gridColumn: "span 4" }}>Questions we get asked</h2>
          <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Answered here rather than on a call, because the whole point is that you should not need one.
          </p>
        </div>

        <div style={{ ...CARD, overflow: "hidden" }}>
          {FAQS.map((f) => (
            <details key={f.q} className="faq-row" style={{ borderBottom: `1px solid ${T.hair}` }}>
              <summary className="board-head faq-summary" style={{ ...GRID12, padding: "17px 26px", cursor: "pointer" }}>
                <span style={{ gridColumn: "span 5", fontSize: "15px", fontWeight: 600, color: T.ink }}>{f.q}</span>
                <span style={{ gridColumn: "span 7", fontSize: "13.5px", color: T.faint }}>{f.hint}</span>
              </summary>
              <div className="board-head" style={{ ...GRID12, padding: "0 26px 20px" }}>
                <p style={{ gridColumn: "6 / span 7", margin: 0, fontSize: "14.5px", lineHeight: 1.7, color: T.soft }}>
                  {f.a}
                </p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section style={{ ...SHELL, marginTop: "34px", marginBottom: "44px" }}>
        <div className="board-head closing-scan" style={{ ...CARD, ...GRID12, alignItems: "center", padding: "34px 40px" }}>
          <div style={{ gridColumn: "span 6" }}>
            <h2 style={{ margin: 0, fontSize: "25px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.22, color: T.ink }}>
              Pick a domain and find out.
            </h2>
            <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.6, color: T.soft }}>
              Up to 14 questions across the clusters you keep, with every source behind every answer. It takes a few
              minutes and we email you when it is done.
            </p>
          </div>

          {/* A GET to /scan, which prefills the hero checker. No second
              checker here - see the note at the top of this file. */}
          <form action="/scan" method="get" style={{ gridColumn: "span 6" }}>
            <label htmlFor="close-domain" style={{ ...MICRO, display: "block", marginBottom: "7px" }}>
              Domain
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                id="close-domain"
                name="domain"
                type="text"
                inputMode="url"
                autoComplete="url"
                placeholder="yourdomain.com"
                style={{
                  flexGrow: 1,
                  minWidth: 0,
                  fontFamily: "inherit",
                  fontSize: "15px",
                  color: T.ink,
                  background: T.surface,
                  border: `1px solid ${T.line}`,
                  borderRadius: "10px",
                  padding: "13px 15px",
                }}
              />
              <button
                type="submit"
                style={{
                  fontFamily: "inherit",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#ffffff",
                  background: T.accent,
                  border: 0,
                  borderRadius: "10px",
                  padding: "13px 26px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Check
              </button>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: "12.5px", color: T.soft }}>
              Or{" "}
              <Link href="/contact" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
                talk to a partner
              </Link>{" "}
              if you have a portfolio to move.
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
