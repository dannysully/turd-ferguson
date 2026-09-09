import type { Metadata } from "next";
import { getScanAdapter } from "@/lib/scan";
import { getExampleResult } from "@/lib/scan/example-cache";
import { DataPill, fmtDate } from "@/components/scan/ResultDashboard";
import { CoverageScreen, DomainScreen, ResultScreen, RunningScreen, TopicScreen, TrackingScreen, C, field, btn, label } from "@/components/scan/screens";
import ScanChecker from "@/components/scan/ScanChecker";
import StepRail from "@/components/scan/StepRail";
import TrackExampleView from "@/components/scan/TrackExampleView";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "See exactly what happens, run on our own agency | alwayscited",
  description:
    "The whole alwayscited journey, step by step, using Nomada Digital as the worked example: domain in, topic confirmed, the free result, what opens after the email, the coverage upload, and the tracking. Real data, labelled where it is not yet live.",
  alternates: { canonical: "https://alwayscited.com/example" },
};

const wrap: React.CSSProperties = { maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" };
const grad: React.CSSProperties = { background: `linear-gradient(135deg, ${C.purple} 0%, #A855F7 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };

/* Amber, same size and position as the green pill */
function IllustrativePill() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.7rem", fontWeight: 600, borderRadius: "999px", padding: "0.2rem 0.625rem", color: "#B45309", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)", whiteSpace: "nowrap" }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />
      Illustrative - our own tracking starts this month
    </span>
  );
}

const STEPS = [
  { id: "step-1", label: "Enter the domain" },
  { id: "step-2", label: "Confirm the topic" },
  { id: "step-3", label: "It runs" },
  { id: "step-4", label: "The free result" },
  { id: "step-5", label: "What the email opens" },
  { id: "step-6", label: "Upload your coverage" },
  { id: "step-7", label: "Track it weekly" },
];

function Step({ id, n, lead, body, pill, children }: { id: string; n: number; lead: string; body: string; pill: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="walk-step" aria-labelledby={`${id}-h`} style={{ scrollMarginTop: "5rem" }}>
      <div className="walk-annot">
        <p style={{ fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 700, color: C.purple, letterSpacing: "0.08em", margin: "0 0 0.5rem" }}>0{n}</p>
        <h2 id={`${id}-h`} style={{ fontWeight: 800, fontSize: "clamp(1.125rem, 2vw, 1.375rem)", color: C.navy, lineHeight: 1.3, letterSpacing: "-0.02em", margin: "0 0 0.625rem" }}>{lead}</h2>
        <p style={{ fontSize: "0.9375rem", color: C.body, lineHeight: 1.7, margin: "0 0 0.875rem" }}>{body}</p>
        {pill}
      </div>
      <div className="walk-screen">{children}</div>
    </section>
  );
}

export default async function ExamplePage() {
  const r = await getExampleResult();
  const source = getScanAdapter().source;
  const brand = r.brand.name;

  /* Frozen gate for step 4 - the same copy the live checker shows, non-interactive */
  const frozenGate = (
    <>
      <p style={{ fontWeight: 700, color: C.navy, marginBottom: "0.5rem" }}>See everything behind this.</p>
      <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.6, marginBottom: "1rem" }}>
        The full source list and the history for {r.topic}. Then upload the coverage you have already earned and find out which pieces are doing the work.
      </p>
      <label htmlFor="ex-email" style={label}>Your email</label>
      <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
        <input id="ex-email" type="email" placeholder="you@agency.com" readOnly tabIndex={-1} style={{ ...field, flex: "1 1 200px" }} />
        <button type="button" className="btn-primary" style={btn} disabled tabIndex={-1}>Show me</button>
      </div>
    </>
  );

  return (
    <>
      <TrackExampleView />

      {/* Header strip */}
      <section style={{ padding: "4.5rem 1.5rem 3rem", background: C.soft }}>
        <div style={wrap}>
          <div style={{ marginBottom: "1.25rem" }}><DataPill source={source} readAt={r.read_at} /></div>
          <h1 style={{ fontWeight: 800, fontSize: "clamp(2rem, 4vw, 2.75rem)", color: C.navy, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1rem", maxWidth: "760px" }}>
            See exactly what happens. <span style={grad}>We ran it on our own agency.</span>
          </h1>
          <p style={{ fontSize: "1.0625rem", color: C.body, lineHeight: 1.7, maxWidth: "640px", margin: 0 }}>
            Nomada Digital, the agency that builds alwayscited, checked against <strong style={{ color: C.navy }}>{r.topic}</strong> in the UK. Seven steps, in the order a customer sees them, using the same screens as the product. Read {fmtDate(r.read_at)}.
          </p>
        </div>
      </section>

      {/* Rail + steps */}
      <div style={{ ...wrap, paddingTop: "3rem", paddingBottom: "3rem" }} className="walk">
        <StepRail steps={STEPS} />

        <div className="walk-steps">
          <Step id="step-1" n={1} lead="You enter a client's domain." body="Nothing else. The check starts from the domain alone." pill={<DataPill source={source} readAt={r.read_at} />}>
            <DomainScreen value="nomadadigital.co.uk" readOnly id="ex-domain" />
          </Step>

          <Step id="step-2" n={2} lead="We read the brand from the domain and suggest a topic." body="Change it if it is wrong - the topic decides every question we ask. Write it the way a buyer would say it." pill={<DataPill source={source} readAt={r.read_at} />}>
            <TopicScreen brand={brand} topic={r.topic} market={r.market} readOnly id="ex" />
          </Step>

          <Step id="step-3" n={3} lead="It runs." body="We are building the questions a buyer would ask about this topic, reading what the engines answered, and finding the sources they drew on. Three named steps, not a spinner." pill={<DataPill source={source} readAt={r.read_at} />}>
            <RunningScreen brandLabel={brand} progress={1} />
          </Step>

          <Step id="step-4" n={4} lead="This is what anyone gets, free." body={`${brand} is not among the sources the engines cite for ${r.topic} in the UK. The most-cited source is ${r.top_source?.domain ?? "unknown"}, and ${brand} is not in it. The leaderboard and full source list sit behind the email.`} pill={<DataPill source={source} readAt={r.read_at} />}>
            <ResultScreen result={r} gated compact gate={frozenGate} />
          </Step>

          <Step id="step-5" n={5} lead="Give an email and the rest opens." body={`Every source the engines cite for the topic, ranked by how often, and ${brand}'s mentions month by month. The scan is saved as your first client.`} pill={<DataPill source={source} readAt={r.read_at} />}>
            <ResultScreen result={r} gated={false} />
          </Step>

          <Step id="step-6" n={6} lead="Upload a campaign's coverage and we match it against what the engines cited." body="Three of our 22 pieces are doing the work. Every one of them has no link in it. The 19 that are not cited, and the sources that own the commercial questions, are the list we work from next." pill={<IllustrativePill />}>
            <CoverageScreen uploaded={22} cited={3} notCited={19} pieces={null} owners={r.sources.slice(0, 5)} readAt={r.read_at} />
          </Step>

          <Step id="step-7" n={7} lead="Then it keeps reading, weekly, on the same questions." body="Before and after, the questions your client is newly named in, and share of voice week by week. This is the report you send a client. Ours has not run four weeks yet, so those fields are blank rather than estimated." pill={<IllustrativePill />}>
            <TrackingScreen brand={brand} baseline={r.history} readAt={r.read_at} after={null} newlyNamed={null} shareOfVoiceWeekly={null} />
          </Step>
        </div>
      </div>

      {/* Closing CTA */}
      <section style={{ padding: "4rem 1.5rem 5rem", background: C.soft }}>
        <div style={{ ...wrap, maxWidth: "760px" }}>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(1.5rem, 3vw, 2rem)", color: C.navy, lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 0.75rem" }}>Run this on one of your clients.</h2>
          <p style={{ fontSize: "1rem", color: C.body, lineHeight: 1.7, marginBottom: "1.5rem" }}>Same check, same honesty. Enter their domain.</p>
          <ScanChecker compact />
        </div>
      </section>
    </>
  );
}
