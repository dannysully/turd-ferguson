import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LiveScanChecker from "@/components/scan/LiveScanChecker";
import { supabaseAdmin } from "@/lib/supabase/admin";

const C = { navy: "#0B1220", purple: "#7C3AED", purpleLight: "#A855F7", body: "#4B5563" };
const grad: React.CSSProperties = {
  background: `linear-gradient(135deg, ${C.purple} 0%, ${C.purpleLight} 100%)`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

/**
 * A scan, by its link.
 *
 * This is where the verification email and the magic link both land, and until
 * now it did not exist: /scan read a ?domain= param and nothing else, so anyone
 * clicking through arrived at an empty form with no sign of the report they had
 * just been promised.
 *
 * The page renders the result the token points at. If the scan has been
 * unlocked it opens in full; if it has not, the same gate as anywhere else.
 */
export const metadata: Metadata = {
  title: "Your AI visibility report | alwayscited",
  robots: { index: false, follow: false },
};

export default async function ScanTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data: scan } = await supabaseAdmin()
    .from("scans")
    .select("brand_name, domain, status")
    .eq("public_token", token)
    .maybeSingle();

  if (!scan) notFound();

  const brand = (scan.brand_name as string | null) ?? (scan.domain as string);

  return (
    <section id="scan" style={{ padding: "5.5rem 1.5rem 4rem", position: "relative", overflow: "hidden" }}>
      <div
        className="gradient-orb"
        style={{
          position: "absolute",
          width: "700px",
          height: "700px",
          background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)",
          top: "-250px",
          right: "-150px",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 1.5rem", position: "relative" }}>
        <h1
          style={{
            fontWeight: 800,
            fontSize: "clamp(2rem, 4vw, 2.75rem)",
            color: C.navy,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginBottom: "1.25rem",
          }}
        >
          What AI says about <span style={grad}>{brand}</span>
        </h1>
        <p
          style={{
            fontSize: "clamp(1rem, 1.5vw, 1.0625rem)",
            color: C.body,
            lineHeight: 1.7,
            marginBottom: "2rem",
            maxWidth: "540px",
          }}
        >
          Read across the engines your buyers actually use.
        </p>
        <LiveScanChecker initialToken={token} />
      </div>
    </section>
  );
}
