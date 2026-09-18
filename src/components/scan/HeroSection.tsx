import { scanReady } from "@/lib/scan/readiness";

import LiveScanChecker from "./LiveScanChecker";
import RequestScanForm from "./RequestScanForm";

const C = { navy: "#0B1220", purple: "#7C3AED", purpleLight: "#A855F7", body: "#4B5563" };
const grad: React.CSSProperties = { background: `linear-gradient(135deg, ${C.purple} 0%, ${C.purpleLight} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };

/** The hero: H1, one line, the checker. Rendered on / and, pre-advanced, on /scan. */
export default function HeroSection({ initialDomain = "" }: { initialDomain?: string }) {
  return (
    <section id="scan" style={{ padding: "5.5rem 1.5rem 4rem", position: "relative", overflow: "hidden" }}>
      <div className="gradient-orb" style={{ position: "absolute", width: "700px", height: "700px", background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)", top: "-250px", right: "-150px", pointerEvents: "none" }} aria-hidden="true" />
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 1.5rem", position: "relative" }}>
        <h1 style={{ fontWeight: 700, fontSize: "clamp(2.25rem, 4.5vw, 3.375rem)", color: C.navy, lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: "1.375rem" }}>
          Be the brand <span style={grad}>AI recommends.</span>
        </h1>
        <p style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)", color: C.body, lineHeight: 1.7, marginBottom: "2rem", maxWidth: "540px" }}>
          Start by finding out whether your client already is. Enter their domain.
        </p>
        {scanReady() ? (
          <LiveScanChecker initialDomain={initialDomain} />
        ) : (
          <RequestScanForm initialDomain={initialDomain} />
        )}
      </div>
    </section>
  );
}
