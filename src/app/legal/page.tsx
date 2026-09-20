import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";

import { CONTACT_EMAIL } from "@/config/contact";
import { CARD, GRID12, MICRO, SHELL, T } from "@/config/tokens";
import ToConfirm from "@/components/ToConfirm";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What alwayscited collects when you run a scan, why, how long it is kept, and who processes it. Written plainly, with the gaps marked rather than filled in.",
  openGraph: { url: "https://alwayscited.com/legal", images: OG_IMAGE },
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
 * All five are executable now, and a claim on this page that is not executable
 * is a claim that rots: `analytics-claim.test.mts` holds the analytics one,
 * `privacy-claims.test.mts` holds the other four. Read those before rewording
 * anything below - they fail on the wording as well as on the code,
 * deliberately, so a reworded promise cannot quietly outrun what enforces it.
 *
 * The board's processor list omits Anthropic, which the scan sends crawled
 * site text and the generated questions to. It is listed here. It also omitted
 * Cloudflare, and that one was found by executing the claim above rather than
 * by reading: `verifyTurnstile` posts `remoteip: ip` to Cloudflare's siteverify
 * endpoint on all three scan doors, so the raw address - the thing "What we
 * collect" promises is never written down - does leave this server, to a
 * processor the page did not name. Never stored and never disclosed are
 * different promises and the page was only keeping the first.
 *
 * Where a clause needs a fact nobody has given me, the page says so in the
 * open. An invented retention period or a guessed company number is worse
 * than a visible gap, and every marker is in docs/blocked.md.
 */


/**
 * The five documents the board's sidebar switches between. Four are not
 * drafted anywhere - terms of service, a standalone cookie policy, a data
 * processing agreement and a sub-processor list - and Danny's answer on
 * 19 Sep was that the legal facts wait. They are listed as unpublished
 * rather than linked or hidden, because a reader looking for terms should
 * find out they do not exist rather than assume they missed them.
 */
const DOCUMENTS: { label: string; here?: boolean }[] = [
  { label: "Privacy policy", here: true },
  { label: "Cookies" },
  { label: "Terms of service" },
  { label: "Data processing" },
  { label: "Sub-processors" },
];

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
        named the brand, and what it cited. <ToConfirm>the retention period for claimed scans, and for contact form messages</ToConfirm>
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
        writes the questions. Cloudflare runs the robot check in front of a scan, and we pass it your IP address so it
        can do that. Email is sent through Resend. Hosting is Vercel, and the database is Supabase, in London.{" "}
        <ToConfirm>that this list is complete, and whether a data processing agreement is in place with each of them</ToConfirm>
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
        <ToConfirm>whether Turnstile&apos;s own storage needs a cookie banner under PECR</ToConfirm>
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
        {/* The beat, from globals.css. The document switcher animates as one
            list rather than five items - the four unpublished entries are one
            fact, not four arrivals. */}
        <aside className="legal-nav" style={{ gridColumn: "span 3" }}>
          <div className="ac-row" style={MICRO}>Legal</div>
          {/* The board's sidebar is a switcher between five documents, not a
              contents list for this one. Only the privacy policy is written,
              so the other four say so rather than linking somewhere empty or
              being quietly dropped. */}
          <ul className="ac-row" style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "2px" }}>
            {DOCUMENTS.map((d) => (
              <li key={d.label}>
                {d.here ? (
                  <span
                    style={{
                      display: "block",
                      fontSize: "13.5px",
                      fontWeight: 600,
                      color: T.ink,
                      padding: "7px 11px",
                      borderRadius: "8px",
                      background: T.surface,
                      border: `1px solid ${T.line}`,
                    }}
                  >
                    {d.label}
                  </span>
                ) : (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "8px",
                      fontSize: "13.5px",
                      color: T.soft,
                      padding: "7px 11px",
                    }}
                  >
                    {d.label}
                    <span style={{ fontSize: "11.5px", color: T.soft }}>not yet published</span>
                  </span>
                )}
              </li>
            ))}
          </ul>

          <p className="ac-row" style={{ margin: "16px 0 0", fontSize: "12.5px", lineHeight: 1.6, color: T.soft }}>
            On this page:{" "}
            {SECTIONS.map((sec, i) => (
              <span key={sec.id}>
                {i ? ", " : ""}
                <a href={`#${sec.id}`} style={{ color: T.soft, textDecoration: "none" }}>
                  {sec.title.toLowerCase()}
                </a>
              </span>
            ))}
            .
          </p>
          <p className="ac-row" style={{ margin: "20px 0 0", fontSize: "12.5px", lineHeight: 1.6, color: T.soft }}>
            Drafted as a structure, not as legal advice. It needs a solicitor before it can be relied on - this site
            processes personal data of UK and EU residents.
          </p>
        </aside>

        <div style={{ gridColumn: "span 9" }}>
          <div className="ac-row" style={MICRO}>Privacy policy</div>
          <h1 className="ac-row" style={{ margin: "8px 0 0", fontSize: "32px", fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>
            What we collect, and what we do with it
          </h1>
          <p className="ac-row" style={{ margin: "10px 0 0", fontSize: "13px", color: T.soft, lineHeight: 1.7 }}>
            Nomada Digital Ltd &middot; <ToConfirm>company number</ToConfirm> &middot; <ToConfirm>registered address</ToConfirm> &middot;{" "}
            <ToConfirm>ICO registration number</ToConfirm> &middot; <ToConfirm>the date this was last reviewed by someone qualified</ToConfirm>
          </p>

          <div style={{ ...CARD, marginTop: "26px", overflow: "hidden" }}>
            {SECTIONS.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                className="ac-row"
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
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
              {CONTACT_EMAIL}
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
