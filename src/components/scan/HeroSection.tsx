import { scanReady } from "@/lib/scan/readiness";
import { T } from "@/config/tokens";

import LiveScanChecker from "./LiveScanChecker";
import RequestScanForm from "./RequestScanForm";

/**
 * The hero, rebuilt from Main.dc.html. Centred - and it is the only centred
 * block on the site, every other page is left-aligned.
 *
 * The domain field is the single call to action. There is no button pair
 * here by design: the scan is the offer, and anything beside it competes
 * with it.
 */

const pill: React.CSSProperties = {
  display: "inline-block",
  background: T.surface,
  border: `1px solid ${T.line}`,
  borderRadius: "999px",
  padding: "2px 11px",
  fontSize: "14px",
  fontWeight: 600,
  color: T.ink,
};

export default function HeroSection({ initialDomain = "" }: { initialDomain?: string }) {
  // No background is set here: body carries the page ground, so every board
  // sits on #f6f6f7 and the white cards read as surfaces.
  return (
    <section id="scan">
      <div
        style={{
          maxWidth: "940px",
          width: "100%",
          margin: "0 auto",
          padding: "50px 24px 0",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(32px, 4.6vw, 46px)",
            fontWeight: 700,
            letterSpacing: "-0.032em",
            lineHeight: 1.1,
          }}
        >
          <span style={{ color: T.ink }}>Every AI tool shows you the gap.</span>
          <br />
          <span style={{ color: T.accent }}>We close it.</span>
        </h1>

        <p
          style={{
            margin: "16px auto 0",
            fontSize: "16px",
            lineHeight: 1.7,
            color: T.soft,
            maxWidth: "62ch",
          }}
        >
          We run the questions your buyers actually ask, find the <span style={pill}>sources</span> the answers are
          built from, then get you <span style={pill}>named inside them</span>. Built white-label for agencies, and
          it works the same if you are the brand.
        </p>

        <div style={{ margin: "26px auto 0", maxWidth: "400px", textAlign: "left" }}>
          {scanReady() ? <LiveScanChecker initialDomain={initialDomain} /> : <RequestScanForm initialDomain={initialDomain} />}
        </div>
      </div>
    </section>
  );
}
