import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — Book a Call",
  description:
    "Book a 30-minute call with AlwaysCited. We'll show you exactly which AI surfaces your brand is missing from, and what it would take to fix that.",
  alternates: { canonical: "https://alwayscited.com/contact" },
  openGraph: {
    title: "Contact AlwaysCited — Book a Call",
    description:
      "Book a 30-minute call. We'll show you exactly which AI surfaces your brand is missing from.",
    url: "https://alwayscited.com/contact",
  },
};

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact AlwaysCited",
  description:
    "Book a call with AlwaysCited. We'll show you exactly which AI surfaces your brand is missing from, and what it would take to fix that.",
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
            Let&apos;s talk about your AI search visibility.
          </h1>
          <p style={{ color: "#b4c5d6", fontSize: "1.1rem", lineHeight: 1.6, maxWidth: "32rem" }}>
            We&apos;ll show you exactly which AI surfaces your brand is missing from, and what it would
            take to fix that.
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
                  What to expect on the call.
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
                    "We'll run your brand across the AI surfaces your buyers actually use.",
                    "We'll show you where your competitors are being cited and you're not.",
                    "We'll outline a specific campaign structure for your category.",
                    "No hard sell. If we can't help, we'll say so.",
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
