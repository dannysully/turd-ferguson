import type { Metadata } from "next";

import { CARD, GRID12, MICRO, SHELL, T } from "@/config/tokens";

export const metadata: Metadata = {
  title: "Privacy policy | alwayscited",
  description:
    "What alwayscited collects when you run a scan, why, how long it is kept, and who processes it. Written plainly, with the gaps marked rather than filled in.",
  alternates: { canonical: "https://alwayscited.com/legal" },
};

/**
 * The privacy policy - Legal.dc.html.
 *
 * Every factual claim here is one I checked in the code rather than one the
 * board asserted:
 *  - raw IPs are never stored, they are salted SHA-256 (lib/scan/ip.ts)
 *  - an unclaimed scan loses only its transcript, after
 *    response_retention_days (default 7), and keeps its measured facts
 *    (api/cron/purge-responses)
 *  - the only third-party script the browser loads is Cloudflare Turnstile
 *  - the app sets no cookies of its own: no document.cookie, no cookies()
 *  - there is no analytics of any kind installed
 *
 * The board's processor list omits Anthropic, which the scan sends crawled
 * site text and the generated questions to. It is listed here.
 *
 * Where a clause needs a fact nobody has given me, the page says so in the
 * open. An invented retention period or a guessed company number is worse
 * than a visible gap, and every marker is in docs/blocked.md.
 */

const TO_CONFIRM = "TO CONFIRM";

function Gap({ children }: { children: React.ReactNode }) {
  return (
    <mark
      style={{
        background: T.warnBg,
        color: T.warnFg,
        padding: "1px 6px",
        borderRadius: "6px",
        fontWeight: 600,
        fontSize: "0.95em",
      }}
    >
      [{TO_CONFIRM}: {children}]
    </mark>
  );
}

type Section = { id: string; title: string; body: React.ReactNode };

const SECTIONS: Section[] = [
  {
    id: "what",
    title: "What we collect",
    body: (
      <>
        When you run a scan we store the domain you entered. If you unlock the report we store the email address you
        gave, and nothing else about you. We do not ask for a name, a company, a phone number or a card. The contact
        form collects what you type into it. We also store a salted one-way hash of your IP address, to stop one
        visitor running the scan hundreds of times - the address itself is never written down, and the hash cannot be
        turned back into it.
      </>
    ),
  },
  {
    id: "why",
    title: "Why we collect it",
    body: (
      <>
        The email address exists so we can send you the link back to your report, and so a scan can be reclaimed if
        nobody opens it. Our lawful basis is legitimate interest in responding to a request you made. We do not add you
        to a mailing list, because there is not one.
      </>
    ),
  },
  {
    id: "how-long",
    title: "How long we keep it",
    body: (
      <>
        Scan results are kept so you can come back to the link. The full text of what each engine said is deleted after
        seven days if nobody claims the scan - what survives is the measurements: whether an engine answered, whether it
        named the brand, and what it cited. <Gap>the retention period for claimed scans, and for contact form messages</Gap>
      </>
    ),
  },
  {
    id: "who",
    title: "Who else sees it",
    body: (
      <>
        The scan runs through DataForSEO, which queries the engines on our behalf - your domain and the generated
        questions pass through it, your email address does not. Anthropic reads the text of the site being scanned and
        writes the questions. Email is sent through Resend. Hosting is Vercel, and the database is Supabase, in London.{" "}
        <Gap>that this list is complete, and whether a data processing agreement is in place with each of them</Gap>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and tracking",
    body: (
      <>
        This site sets no cookies of its own and runs no analytics - there is no Google Analytics, no tag manager, and
        no advertising pixel. The one third-party script the page loads is Cloudflare Turnstile, the box that checks you
        are not a robot before a scan runs, and it sets storage of its own to do that.{" "}
        <Gap>whether Turnstile&apos;s own storage needs a cookie banner under PECR</Gap>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        You can ask what we hold, have it corrected, have it deleted, or object to us holding it at all. We will do it
        within a month and usually the same week. Deleting your email address deletes the link to your report with it.
      </>
    ),
  },
];

export default function LegalPage() {
  return (
    <main style={{ ...SHELL, paddingTop: "44px", paddingBottom: "44px" }}>
      <div className="board-head" style={{ ...GRID12, alignItems: "start" }}>
        <aside className="legal-nav" style={{ gridColumn: "span 3" }}>
          <div style={MICRO}>Legal</div>
          <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "2px" }}>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  style={{ display: "block", fontSize: "13.5px", color: T.soft, textDecoration: "none", padding: "7px 11px", borderRadius: "8px" }}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
          <p style={{ margin: "20px 0 0", fontSize: "12.5px", lineHeight: 1.6, color: T.faint }}>
            Drafted as a structure, not as legal advice. It needs a solicitor before it can be relied on - this site
            processes personal data of UK and EU residents.
          </p>
        </aside>

        <div style={{ gridColumn: "span 9" }}>
          <div style={MICRO}>Privacy policy</div>
          <h1 style={{ margin: "8px 0 0", fontSize: "32px", fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>
            What we collect, and what we do with it
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: "13px", color: T.faint, lineHeight: 1.7 }}>
            Nomada Digital Ltd &middot; <Gap>company number</Gap> &middot; <Gap>registered address</Gap> &middot;{" "}
            <Gap>ICO registration number</Gap> &middot; <Gap>the date this was last reviewed by someone qualified</Gap>
          </p>

          <div style={{ ...CARD, marginTop: "26px", overflow: "hidden" }}>
            {SECTIONS.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                style={{ padding: "22px 28px", borderTop: i ? `1px solid ${T.hair}` : undefined, scrollMarginTop: "2rem" }}
              >
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
                  {s.title}
                </h2>
                <p style={{ margin: "9px 0 0", fontSize: "14.5px", lineHeight: 1.75, color: T.soft, maxWidth: "76ch" }}>
                  {s.body}
                </p>
              </section>
            ))}
          </div>

          <p style={{ margin: "18px 0 0", fontSize: "13.5px", lineHeight: 1.7, color: T.soft, maxWidth: "76ch" }}>
            To ask what we hold about you, to have it corrected, or to have it deleted, email{" "}
            <a href="mailto:hello@alwayscited.com" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
              hello@alwayscited.com
            </a>
            . If you are not satisfied with how we handle it you can complain to the Information Commissioner&apos;s
            Office at{" "}
            <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
              ico.org.uk
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
