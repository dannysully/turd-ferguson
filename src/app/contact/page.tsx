import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";

import ContactForm from "@/components/ContactForm";
import { CARD, MICRO, SHELL, T } from "@/config/tokens";
import { ORG_REF, SITE_REF, ld } from "@/config/schema";

/**
 * Contact, from Contact.dc.html.
 *
 * The argument of the page is its own heading: most questions are answered by
 * running a scan, so the form is for the ones that are not. The three cards
 * name those cases rather than listing reassurances.
 */

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Most questions are answered by running a free scan. Portfolio pricing, corrections and everything else, here.",
  alternates: { canonical: "https://alwayscited.com/contact" },
  openGraph: {
    images: OG_IMAGE,
    title: "Contact alwayscited",
    description: "Most questions are answered by running a free scan. Everything else, here.",
    url: "https://alwayscited.com/contact",
  },
};

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact alwayscited",
  description:
    "Most questions are answered by running a free scan. Portfolio pricing, corrections and everything else, here.",
  url: "https://alwayscited.com/contact",
  isPartOf: SITE_REF,
  publisher: ORG_REF,
  about: ORG_REF,
};

const ROUTES = [
  {
    label: "A portfolio rather than one client",
    body: "The top tier is priced on volume. Tell us roughly how many clients and which sectors and we will come back with a number rather than a discovery call.",
  },
  {
    label: "Something is wrong on this site",
    body: "Particularly on the comparison page. If we have stated something inaccurate about another tool, tell us and we will correct it and date the correction.",
  },
  {
    label: "Prefer email",
    body: "hello@alwayscited.com reaches the same people.",
  },
];

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ld(contactSchema) }}
      />
      <section style={{ ...SHELL, paddingTop: "48px" }}>
        <div className="page-split">
          <div>
            <div style={MICRO}>Contact</div>
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
              Most questions are answered by running a scan.
            </h1>
            <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.7, color: T.soft, maxWidth: "56ch" }}>
              It is free, takes a few minutes and needs no call. If you have a portfolio to move, or a question the
              FAQ does not cover, this form reaches the people doing the work rather than a sales desk.
            </p>

            <div style={{ marginTop: "26px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {ROUTES.map((r) => (
                <div key={r.label} style={{ ...CARD, borderRadius: "14px", padding: "18px 20px" }}>
                  <div style={MICRO}>{r.label}</div>
                  <p style={{ margin: "7px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>{r.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...CARD, padding: "26px", alignSelf: "start" }}>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
