import { scanReady } from "@/lib/scan/readiness";
import { MICRO, T } from "@/config/tokens";

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

export default function HeroSection({
  initialDomain = "",
  notice = null,
}: {
  initialDomain?: string;
  notice?: string | null;
}) {
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
        {/* Phone board only: the desktop board has no label above the h1. */}
        <div className="phone-only" style={{ ...MICRO, marginBottom: "10px" }}>
          AI search visibility, white-labelled
        </div>

        <h1
          style={{
            margin: 0,
            /* 25px is the phone board's h1, 46px the desktop board's. */
            fontSize: "clamp(25px, 4.6vw, 46px)",
            fontWeight: 700,
            letterSpacing: "-0.032em",
            lineHeight: 1.1,
          }}
        >
          <span style={{ color: T.ink }}>Every AI tool shows you the gap.</span>
          <br />
          <span style={{ color: T.accent }}>We close it.</span>
        </h1>

        {/* The two boards write this line differently - the phone one is
            shorter and drops the inline pills, which do not survive being
            wrapped across three lines at 390px. Both are real text; CSS
            shows one. */}
        <p
          className="desktop-only"
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

        <p className="phone-only" style={{ margin: "12px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
          Free scan, then editorial placements in the pages the engines actually cite. White-label for agencies, and
          the same if you are the brand.
        </p>

        {/* Above the field rather than below it: it is the reason they are on
            this page, and it explains why the report they expected is not. */}
        {notice ? (
          <p
            role="status"
            style={{
              margin: "22px auto 0",
              maxWidth: "400px",
              textAlign: "left",
              background: T.badBg,
              border: `1px solid ${T.badLine}`,
              borderRadius: "12px",
              padding: "11px 13px",
              fontSize: "14px",
              lineHeight: 1.55,
              color: T.badFg,
            }}
          >
            {notice}
          </p>
        ) : null}

        <div style={{ margin: "26px auto 0", maxWidth: "400px", textAlign: "left" }}>
          {scanReady() ? <LiveScanChecker initialDomain={initialDomain} /> : <RequestScanForm initialDomain={initialDomain} />}
        </div>
      </div>
    </section>
  );
}
