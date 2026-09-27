"use client";

import { useState } from "react";

import { T } from "@/config/tokens";

import LiveScanChecker from "@/components/scan/LiveScanChecker";
import RequestScanForm from "@/components/scan/RequestScanForm";

import { D } from "./dark";

/**
 * The homepage scan field and the line under it (R49, 27 Sep 2026). While the
 * field is checking it draws its own stepping status, so the static line
 * steps aside rather than stacking under it - one line, as R32 asked. HomeHero
 * stays a server component and passes `ready` down, since scanReady() is
 * server-only.
 */
export default function HeroScanArea({ ready, questionsLine }: { ready: boolean; questionsLine: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div style={{ margin: "30px auto 0", maxWidth: "520px" }}>
        {ready ? (
          <LiveScanChecker dark onBusyChange={setBusy} />
        ) : (
          // The fallback form is drawn for a light ground, so it gets one.
          <div style={{ background: T.surface, borderRadius: "14px", padding: "16px", textAlign: "left", color: T.ink }}>
            <RequestScanForm />
          </div>
        )}
      </div>
      {!busy && <p style={{ margin: "12px 0 0", fontSize: "13px", color: D.quiet }}>{questionsLine}</p>}
    </>
  );
}
