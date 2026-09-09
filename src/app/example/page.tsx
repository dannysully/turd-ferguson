import type { Metadata } from "next";
import { getScanAdapter } from "@/lib/scan";
import ResultDashboard, { DataPill, Finding, fmtDate } from "@/components/scan/ResultDashboard";
import ScanChecker from "@/components/scan/ScanChecker";

export const metadata: Metadata = {
  title: "A real AI visibility result, run on ourselves | alwayscited",
  description:
    "The agency that builds alwayscited, checked against b2b seo agency in the UK. Every source Google AI Overviews cite, month by month mentions, and what our own coverage did. Real data, nothing estimated.",
  alternates: { canonical: "https://alwayscited.com/example" },
};

const C = { navy: "#0B1220", purple: "#7C3AED", body: "#4B5563", soft: "#F8F7FF", border: "#E5E7EB", white: "#ffffff", muted: "#9CA3AF" };
const wrap: React.CSSProperties = { maxWidth: "820px", margin: "0 auto", padding: "0 1.5rem" };
const grad: React.CSSProperties = { background: `linear-gradient(135deg, ${C.purple} 0%, #A855F7 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };

function AmberPill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.7rem", fontWeight: 600, borderRadius: "999px", padding: "0.2rem 0.625rem", color: "#B45309", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)", whiteSpace: "nowrap" }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />{children}
    </span>
  );
}

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontWeight: 800, fontSize: "clamp(1.375rem, 2.6vw, 1.75rem)", color: C.navy, lineHeight: 1.2, letterSpacing: "-0.02em", margin: "0 0 1rem" }}>{children}</h2>
);

export default async function ExamplePage() {
  const adapter = getScanAdapter();
  const start = await adapter.startScan({ domain: "nomadadigital.co.uk" });
  const r = await adapter.runScan({ scan_id: start.scan_id, topic: start.suggested_topic ?? "b2b seo agency", market: "UK" });

  const monthsWithMentions = r.history.filter((p) => p.mentions > 0).length;
  const totalMentions = r.history.reduce((a, p) => a + p.mentions, 0);
  const top3 = r.sources.slice(0, 3);

  return (
    <>
      {/* 1. Header strip */}
      <section style={{ padding: "4.5rem 1.5rem 3rem", background: C.soft }}>
        <div style={wrap}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            <DataPill source={adapter.source} readAt={r.read_at} />
          </div>
          <h1 style={{ fontWeight: 800, fontSize: "clamp(2rem, 4vw, 2.75rem)", color: C.navy, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1rem" }}>
            A real example. <span style={grad}>We ran this on ourselves.</span>
          </h1>
          <p style={{ fontSize: "1.0625rem", color: C.body, lineHeight: 1.7, maxWidth: "640px", margin: 0 }}>
            This is Nomada Digital, the agency that builds alwayscited, checked against <strong style={{ color: C.navy }}>{r.topic}</strong> in the UK. Nothing on this page is estimated. Where we have no reading, the field says so.
          </p>
        </div>
      </section>

      {/* 2. The finding */}
      <section style={{ padding: "3.5rem 1.5rem 2rem" }}>
        <div style={wrap}><Finding r={r} /></div>
      </section>

      {/* 3, 4, 5. Leaderboard, sources, history */}
      <section style={{ padding: "0 1.5rem 3.5rem" }}>
        <div style={wrap}><ResultDashboard r={r} /></div>
      </section>

      {/* 6. What we uploaded */}
      <section style={{ padding: "3.5rem 1.5rem", background: C.soft }}>
        <div style={wrap}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
            <H2>What we uploaded</H2>
            <AmberPill>Not yet live data</AmberPill>
          </div>
          <p style={{ fontSize: "1rem", color: C.body, lineHeight: 1.7, marginBottom: "1.5rem" }}>
            We uploaded 22 pieces of our own coverage from the past year and matched them against the sources above.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }} className="stack-mobile">
            {[
              { n: "22", l: "pieces uploaded" },
              { n: "3", l: "cited by the engines" },
              { n: "19", l: "not cited" },
            ].map(({ n, l }) => (
              <div key={l} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "1.25rem" }}>
                <p style={{ fontSize: "2rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.03em", lineHeight: 1, margin: "0 0 0.25rem" }}>{n}</p>
                <p style={{ fontSize: "0.8125rem", color: C.body, margin: 0 }}>{l}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.8125rem", color: C.muted, lineHeight: 1.6, marginTop: "1rem", marginBottom: 0 }}>
            From our own coverage audit. Every one of the three cited pieces had no link in it. Piece-level detail publishes when the coverage upload runs live.
          </p>
        </div>
      </section>

      {/* 7. What we did about it */}
      <section style={{ padding: "3.5rem 1.5rem" }}>
        <div style={wrap}>
          <H2>What this told us</H2>
          <p style={{ fontSize: "1rem", color: C.body, lineHeight: 1.75, marginBottom: "1rem" }}>
            The commercial questions about {r.topic} in the UK are answered from a short list. {top3.map((s) => s.domain).join(", ")} are each cited {top3[0]?.mentions ?? 0} times; {r.sources.length - top3.length} more are cited once. Between them, that is every source Google draws on.
          </p>
          <p style={{ fontSize: "1rem", color: C.body, lineHeight: 1.75, margin: 0 }}>
            Nomada Digital is in none of the {r.sources.length}. Our own coverage earned mentions in {monthsWithMentions} of the last {r.history.length} months, {totalMentions} in total, and not one of them put us in the list the engines use for the questions that matter commercially. That is the gap, and it is the reason this product exists.
          </p>
        </div>
      </section>

      {/* 8. CTA */}
      <section style={{ padding: "3.5rem 1.5rem 5rem", background: C.soft }}>
        <div style={wrap}>
          <H2>Run this on one of your clients.</H2>
          <p style={{ fontSize: "1rem", color: C.body, lineHeight: 1.7, marginBottom: "1.5rem" }}>Same check, same honesty. Enter their domain.</p>
          <ScanChecker compact />
        </div>
      </section>
    </>
  );
}
