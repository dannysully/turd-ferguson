import type { Metadata } from "next";
import TierName from "@/components/TierName";
import { CONTACT_URL } from "@/config/pricing";

export const metadata: Metadata = {
  title: "alwaystracked - free AI visibility tracking for agencies",
  description:
    "Enter a client domain and category, and see where they sit in AI answers, which sources the engines cite, and which of your coverage is doing the work. Free permanently, no card.",
  alternates: { canonical: "https://alwayscited.com/alwaystracked" },
  openGraph: {
    title: "alwaystracked - free AI visibility tracking for agencies",
    description:
      "See where a client sits in AI answers, which sources the engines cite, and which of your coverage is doing the work. Free permanently.",
    url: "https://alwayscited.com/alwaystracked",
  },
};

const C = {
  navy: "#0B1220",
  purple: "#7C3AED",
  purpleLight: "#A855F7",
  body: "#4B5563",
  soft: "#F8F7FF",
  border: "#E5E7EB",
  white: "#ffffff",
};

const grad: React.CSSProperties = {
  background: `linear-gradient(135deg, ${C.purple} 0%, ${C.purpleLight} 100%)`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const wrap: React.CSSProperties = { maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" };

/* The four-step flow. Numbered because the order genuinely matters - each step
   depends on the one before it. */
const steps = [
  {
    n: "01",
    title: "Enter a domain and a category",
    body: "No data to upload and nothing to connect. Give us the client's domain and the category they compete in.",
  },
  {
    n: "02",
    title: "We build the question set",
    body: "We generate the questions their buyers actually ask around that topic - the longer-tail ones people use when they are choosing a provider, not just the head term.",
  },
  {
    n: "03",
    title: "See the leaderboard and the sources",
    body: "Where your client sits against competitors across the question set, and which sources the engines drew on to answer. That second list is the one that tells you what to do next.",
  },
  {
    n: "04",
    title: "Upload the coverage you have earned",
    body: "Add the pieces already published and find out which of them are being cited. Some will be doing the work. Some will not. The report does not average them together.",
  },
];

export default function AlwaystrackedPage() {
  return (
    <>
      {/* Hero */}
      <section style={{ padding: "5.5rem 1.5rem 4rem", position: "relative", overflow: "hidden" }}>
        <div
          className="gradient-orb"
          style={{
            position: "absolute", width: "620px", height: "620px",
            background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)",
            top: "-220px", right: "-140px", pointerEvents: "none",
          }}
          aria-hidden="true"
        />

        <div style={{ ...wrap, maxWidth: "780px", position: "relative" }}>
          <div style={{
            display: "inline-flex", alignItems: "center",
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: "999px",
            padding: "0.25rem 0.875rem",
            fontSize: "0.75rem", fontWeight: 600, color: C.purple,
            marginBottom: "1.25rem",
          }}>
            Free permanently
          </div>

          <h1 style={{
            fontWeight: 800,
            fontSize: "clamp(2.25rem, 4.5vw, 3.25rem)",
            color: C.navy,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            marginBottom: "1.375rem",
          }}>
            Start with a domain.{" "}
            <span style={grad}>Find out what AI already says.</span>
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 1.5vw, 1.125rem)",
            color: C.body,
            lineHeight: 1.7,
            marginBottom: "1.25rem",
            maxWidth: "620px",
          }}>
            <TierName tier="tracked" /> shows you where a client sits in AI answers, which sources the engines draw on, and which of the coverage you have already earned is being cited.
          </p>
          <p style={{ fontSize: "0.9375rem", color: C.body, lineHeight: 1.7, marginBottom: "2.25rem", maxWidth: "620px" }}>
            One client and ten questions a day, free, with no expiry. No card and no call.
          </p>

          <a href="/#scan" className="btn-primary">Start free</a>
        </div>
      </section>

      {/* Four-step flow */}
      <section style={{ padding: "5rem 1.5rem", background: C.soft }}>
        <div style={wrap}>
          <h2 style={{
            fontWeight: 800, fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)",
            color: C.navy, lineHeight: 1.12, letterSpacing: "-0.03em",
            marginBottom: "3rem", maxWidth: "620px",
          }}>
            How it works
          </h2>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}
            className="stack-mobile"
          >
            {steps.map(({ n, title, body }) => (
              <div
                key={n}
                className="card-hover"
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: "20px",
                  padding: "1.75rem",
                  boxShadow: "0 2px 12px rgba(11,18,32,0.05)",
                }}
              >
                <div style={{
                  fontSize: "0.75rem", fontWeight: 700, color: C.purple,
                  letterSpacing: "0.08em", marginBottom: "0.875rem", fontFamily: "monospace",
                }}>
                  {n}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "1.0625rem", color: C.navy, marginBottom: "0.625rem", lineHeight: 1.3 }}>
                  {title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What the history claim actually covers */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ ...wrap, maxWidth: "760px" }}>
          <h2 style={{
            fontWeight: 800, fontSize: "clamp(1.5rem, 3vw, 2rem)",
            color: C.navy, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1.25rem",
          }}>
            What we can show you from before you signed up
          </h2>
          <p style={{ color: C.body, fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "1.75rem" }}>
            AI Overview history goes back to August 2025, so you see a trend on day one rather than an empty chart. Where an engine has no history, we say so instead of drawing a line.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {[
              { engine: "Google AI Overviews", history: "Back to August 2025" },
              { engine: "Google rankings", history: "Partially recoverable" },
              { engine: "ChatGPT", history: "United States and English only" },
              { engine: "Gemini", history: "None before you start tracking" },
              { engine: "Perplexity", history: "None before you start tracking" },
            ].map(({ engine, history }) => (
              <div
                key={engine}
                style={{
                  display: "grid", gridTemplateColumns: "1fr auto", gap: "1.5rem",
                  padding: "0.875rem 0", borderTop: `1px solid ${C.border}`,
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: "0.9375rem", fontWeight: 600, color: C.navy }}>{engine}</span>
                <span style={{ fontSize: "0.8125rem", color: C.body, textAlign: "right" }}>{history}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.8125rem", color: "#9CA3AF", marginTop: "1.5rem", lineHeight: 1.6 }}>
            If we did not measure it, the field is blank. We never fill a gap with a model.
          </p>
        </div>
      </section>

      {/* Free vs pro */}
      <section style={{ padding: "0 1.5rem 6rem" }}>
        <div style={{ ...wrap, maxWidth: "760px" }}>
          <div style={{
            background: C.navy, borderRadius: "24px", padding: "2.75rem 2.5rem",
            position: "relative", overflow: "hidden",
          }}>
            <div className="gradient-orb" style={{ position: "absolute", width: "420px", height: "420px", background: "radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 70%)", top: "-150px", right: "-110px", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ position: "relative" }}>
              <h2 style={{
                fontWeight: 800, fontSize: "clamp(1.5rem, 3vw, 2rem)",
                color: C.white, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1rem",
              }}>
                Where the paid line sits
              </h2>
              <p style={{ color: "#9CA3AF", fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: "600px", marginBottom: "1.25rem" }}>
                AI visibility runs on aggregate data that costs pennies per scan, so it is free and stays free. Google ranking data means live rank checks per topic, per client, every day - a real cost per account. That is the layer <TierName tier="tracked" qualifier="pro" /> charges for.
              </p>
              <p style={{ color: "#9CA3AF", fontSize: "0.9375rem", lineHeight: 1.7, maxWidth: "600px", marginBottom: "2rem" }}>
                Pro adds Google rankings for both the article and the client page, multiple clients, white-label reports and a daily refresh. $99 a month, with the first 30 days free.
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <a href="/#scan" className="btn-primary">Start free</a>
                <a
                  href="/#pricing"
                  style={{
                    display: "inline-block", background: "transparent", color: C.white,
                    padding: "0.875rem 2rem", borderRadius: "12px", fontWeight: 600,
                    fontSize: "1rem", textDecoration: "none",
                    border: "1.5px solid rgba(255,255,255,0.2)",
                  }}
                >
                  See all tiers
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
