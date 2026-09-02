import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact alwayscited",
  description:
    "Prices, placement counts and what each tier includes are all published. Partner enquiries and everything else, here.",
  alternates: { canonical: "https://alwayscited.com/contact" },
  openGraph: {
    title: "Contact alwayscited",
    description:
      "Prices are on the pricing page. Partner enquiries and everything else, here.",
    url: "https://alwayscited.com/contact",
  },
};

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact alwayscited",
  description:
    "Book a call with alwayscited. We'll show you exactly which AI surfaces your brand is missing from, and what it would take to fix that.",
  url: "https://alwayscited.com/contact",
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />

      {/* Hero */}
      <section style={{ background: "linear-gradient(160deg, #0D1B2A 0%, #152636 100%)" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24 md:py-32">
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#ffffff",
              fontSize: "clamp(1.9rem, 4vw, 3rem)",
              lineHeight: 1.15,
              marginBottom: "1.25rem",
              maxWidth: "36rem",
            }}
          >
            Talk to us.
          </h1>
          <p style={{ color: "#b4c5d6", fontSize: "1.1rem", lineHeight: 1.6, maxWidth: "32rem" }}>
            Most of what you need is on the pricing page - prices, placement counts, what each
            tier includes. If you want to buy, you do not need to speak to us first.
          </p>
        </div>
      </section>

      {/* Form section */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "4rem",
            }}
            className="md:grid-cols-[1fr_360px]"
          >
            {/* Form */}
            <div>
              <h2
                style={{
                  fontFamily: "Georgia, 'Times New Roman', Times, serif",
                  color: "#0D1B2A",
                  fontSize: "1.5rem",
                  lineHeight: 1.25,
                  marginBottom: "2rem",
                }}
              >
                Send us a message.
              </h2>
              <ContactForm />
              {/* PLACEHOLDER: confirm actual email before launch */}
              <p style={{ color: "#5F5E5A", fontSize: "0.875rem", marginTop: "1.5rem" }}>
                Or email us directly:{" "}
                <a href="mailto:hello@alwayscited.com" style={{ color: "#D85A30" }}>
                  hello@alwayscited.com
                </a>
              </p>
            </div>

            {/* Aside */}
            <div>
              <div
                style={{
                  background: "#F5F5F4",
                  borderRadius: "8px",
                  padding: "2rem",
                }}
              >
                <h3
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', Times, serif",
                    color: "#0D1B2A",
                    fontSize: "1.1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  Partner enquiries.
                </h3>
                <p style={{ color: "#3D3D3A", fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
                  Running this across several clients, or need multi-market coverage? That is a
                  conversation - use the form and say so, and we will set one up.
                </p>
                <h3
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', Times, serif",
                    color: "#0D1B2A",
                    fontSize: "1.1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  Everything else.
                </h3>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.875rem",
                  }}
                >
                  {[
                    "Prices, placement counts and tier contents are published - no call needed.",
                    "Your brand on everything the client sees. We never contact your client.",
                    "Monthly, no notice period. Placements already commissioned are delivered.",
                    "hello@alwayscited.com, or the form on this page.",
                  ].map((item) => (
                    <li
                      key={item}
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        alignItems: "flex-start",
                        color: "#3D3D3A",
                        fontSize: "0.9375rem",
                        lineHeight: 1.6,
                      }}
                    >
                      <span style={{ color: "#1D9E75", flexShrink: 0, marginTop: "0.15rem" }}>
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
