import type { Metadata } from "next";
import { fixtureAdapter } from "@/lib/scan/fixture";
import { buildIllustrativeResult, illustrativeCoverage, illustrativeTracking } from "@/lib/scan/illustrative";
import { CoverageScreen, CoverageUploadScreen, DomainScreen, ResultScreen, RunningScreen, TopicScreen, TrackingScreen, C, field, btn, label } from "@/components/scan/screens";
import ScanChecker from "@/components/scan/ScanChecker";
import StepRail from "@/components/scan/StepRail";
import TrackExampleView from "@/components/scan/TrackExampleView";

export const metadata: Metadata = {
  title: "See exactly what happens, run on our own agency | alwayscited",
  description:
    "The whole alwayscited journey in seven steps, using Nomada Digital as the worked example: domain in, topic confirmed, the free result, what opens after the email, the coverage upload, and the weekly tracking report.",
  alternates: { canonical: "https://alwayscited.com/example" },
};

const wrap: React.CSSProperties = { maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" };
const grad: React.CSSProperties = { background: `linear-gradient(135deg, ${C.purple} 0%, #A855F7 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };

/* Amber on every step: this page is a display specification with example data */
function IllustrativePill() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.7rem", fontWeight: 600, borderRadius: "999px", padding: "0.2rem 0.625rem", color: "#B45309", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)", whiteSpace: "nowrap" }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />
      Illustrative example - real screens, example data
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

function Step({ id, n, lead, body, children }: { id: string; n: number; lead: string; body: string; children: React.ReactNode }) {
  return (
    <section id={id} className="walk-step" aria-labelledby={`${id}-h`} style={{ scrollMarginTop: "5rem" }}>
      <div className="walk-annot">
        <p style={{ fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 700, color: C.purple, letterSpacing: "0.08em", margin: "0 0 0.5rem" }}>0{n}</p>
        <h2 id={`${id}-h`} style={{ fontWeight: 800, fontSize: "clamp(1.125rem, 2vw, 1.375rem)", color: C.navy, lineHeight: 1.3, letterSpacing: "-0.02em", margin: "0 0 0.625rem" }}>{lead}</h2>
        <p style={{ fontSize: "0.9375rem", color: C.body, lineHeight: 1.7, margin: "0 0 0.875rem" }}>{body}</p>
        <IllustrativePill />
      </div>
      <div className="walk-screen">{children}</div>
    </section>
  );
}

export default async function ExamplePage() {
  /* Real cited sources from the fixture; the rest overlaid as example data */
  const start = await fixtureAdapter.startScan({ domain: "nomadadigital.co.uk" });
  const real = await fixtureAdapter.runScan({ scan_id: start.scan_id, topic: "b2b seo agency", market: "UK" });
  const r = buildIllustrativeResult(real);
  const brand = r.brand.name;

  const frozenGate = (
    <>
      <p style={{ fontWeight: 700, color: C.navy, marginBottom: "0.5rem" }}>See everything behind this.</p>
      <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.6, marginBottom: "1rem" }}>
        The full leaderboard and every source the engines cite for {r.topic}. Then upload the coverage you have already earned and find out which pieces are doing the work.
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

      <section style={{ padding: "4.5rem 1.5rem 3rem", background: C.soft }}>
        <div style={wrap}>
          <div style={{ marginBottom: "1.25rem" }}><IllustrativePill /></div>
          <h1 style={{ fontWeight: 800, fontSize: "clamp(2rem, 4vw, 2.75rem)", color: C.navy, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1rem", maxWidth: "760px" }}>
            See exactly what happens. <span style={grad}>We ran it on our own agency.</span>
          </h1>
          <p style={{ fontSize: "1.0625rem", color: C.body, lineHeight: 1.7, maxWidth: "640px", margin: 0 }}>
            Nomada Digital, the agency that builds alwayscited, checked against <strong style={{ color: C.navy }}>{r.topic}</strong> in the UK.
          </p>
        </div>
      </section>

      <div style={{ ...wrap, paddingTop: "3rem", paddingBottom: "3rem" }} className="walk">
        <StepRail steps={STEPS} />
        <div className="walk-steps">
          <Step id="step-1" n={1} lead="You enter a client's domain." body="Nothing else. The check starts from the domain alone.">
            <DomainScreen value="nomadadigital.co.uk" readOnly id="ex-domain" />
          </Step>

          <Step id="step-2" n={2} lead="We read the brand from the site and suggest a topic." body="Change it if it is wrong - the topic decides every question we ask. Write it the way a buyer would say it.">
            <TopicScreen brand={brand} topic={r.topic} market={r.market} readOnly id="ex" />
          </Step>

          <Step id="step-3" n={3} lead="It takes about a minute." body="We are asking the questions a buyer would ask about this topic, reading what the engines answered, and finding the sources they drew on. Three named steps, not a spinner.">
            <RunningScreen brandLabel={brand} progress={1} />
          </Step>

          <Step id="step-4" n={4} lead="This is what anyone gets, free." body={`${brand} is named in ${r.brand.named_in} of ${r.brand.of} answers, ${r.brand.rank}th of ${r.brand.of_brands} brands the engines mention. The most-cited source is ${r.top_source?.domain}, and ${brand} is not in it. The leaderboard and full source list sit behind the email.`}>
            <ResultScreen result={r} gated compact gate={frozenGate} />
          </Step>

          <Step id="step-5" n={5} lead="Give an email and the rest opens." body="The full leaderboard, and every source the engines cite for the topic ranked by how often. The scan is saved as your first client.">
            <ResultScreen result={r} gated={false} />
          </Step>

          <Step id="step-6" n={6} lead="Upload a campaign's coverage and we match it against what the engines cited." body="Drop a CSV or paste URLs. We resolve redirects and match every piece against the cited sources. Three of our 22 pieces are doing the work, and every one of them has no link in it. Eleven launch pieces earned nothing.">
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <CoverageUploadScreen file={illustrativeCoverage.file} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: C.muted, fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                <span style={{ flex: 1, height: 1, background: C.border }} />after matching<span style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              <CoverageScreen pieces={illustrativeCoverage.pieces} owners={r.sources.slice(0, 5)} readAt={r.read_at} />
            </div>
          </Step>

          <Step id="step-7" n={7} lead="Then it keeps reading, weekly, on the same questions." body={`Four weeks on: named in ${illustrativeTracking.before.namedIn} of ${illustrativeTracking.before.of} to ${illustrativeTracking.after.namedIn} of ${illustrativeTracking.after.of}, ${illustrativeTracking.before.rank}th to ${illustrativeTracking.after.rank}rd. This is the report you send a client, with your logo on it, not ours.`}>
            <TrackingScreen brand={brand} topic={r.topic} market={r.market} tracking={illustrativeTracking} baseline={r.history} />
          </Step>
        </div>
      </div>

      <section style={{ padding: "4rem 1.5rem 5rem", background: C.soft }}>
        <div style={{ ...wrap, maxWidth: "760px" }}>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(1.5rem, 3vw, 2rem)", color: C.navy, lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 0.75rem" }}>Run this on one of your clients.</h2>
          <p style={{ fontSize: "1rem", color: C.body, lineHeight: 1.7, marginBottom: "1.5rem" }}>Real data, on their domain. Enter it.</p>
          <ScanChecker compact />
        </div>
      </section>
    </>
  );
}
