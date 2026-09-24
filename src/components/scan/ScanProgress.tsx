"use client";

import EngineLogo from "@/components/EngineLogo";
import { MICRO, T } from "@/config/tokens";
import { type EngineResult, engineVerdict, landingAnnouncement } from "@/lib/scan/engine-results";
import { ENGINE_SPECS, knownEngines } from "@/lib/scan/engines";
import { stepCaption, stepPct } from "@/lib/scan/run-steps";

/**
 * What the scan is actually doing, while it does it.
 *
 * Split out of `HeroSequence` when the eight-act essay was replaced by
 * `ProcessSequence`. The two halves of that component were doing different
 * jobs and only one of them was being replaced: the acts were a pitch, and
 * this is a measurement. Keeping them in one file meant the pitch could not be
 * changed without touching the progress bar, and the progress bar is the one
 * thing on the screen that must not drift.
 *
 * The rule it keeps is the rule it always kept: **the bar is the scan, not the
 * story.** The width comes from the real pipeline step, and the caption under
 * it is that step's own words. Nothing here is driven by whatever the
 * explanation beside it happens to be showing.
 */
export default function ScanProgress(p: {
  domain: string;
  engines: string[];
  landed?: EngineResult[];
  step: number;
  slow?: boolean;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const pct = stepPct(p.step);
  /**
   * Through `knownEngines`, which dedupes as well as filtering.
   *
   * The chips are keyed on the engine name, so a row whose frozen list repeats
   * one rendered two identical children under one React key - and told the
   * visitor, on the screen they watch for the length of a scan, that it reads
   * more engines than it does. `pipeline.ts` takes the same column through a
   * Set before it asks anything, so this was the page disagreeing with the
   * pass about the same row.
   */
  const engines = knownEngines(p.engines);
  /**
   * The verdicts, keyed by engine, and the last one to arrive.
   *
   * A Map rather than a `find` per chip, and keyed off the parsed rows rather
   * than off anything this component derives: `parseEngineResults` has already
   * refused a row whose numbers cannot be true of one engine, so a chip either
   * has a measurement behind it or shows nothing.
   */
  const verdicts = new Map((p.landed ?? []).map((r) => [r.engine, r]));
  const newest = (p.landed ?? [])[(p.landed?.length ?? 0) - 1];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <h2
          ref={p.headingRef}
          tabIndex={-1}
          style={{ ...MICRO, margin: 0, outline: "none" }}
        >
          {"Running your scan - " + p.domain}
        </h2>
        <div style={{ flexGrow: 1 }} />
        {/* Each engine's own chip, which gains its verdict the moment that
            engine's last question comes back - rather than every chip standing
            there saying nothing until all of them are in.

            The words are `engineVerdict`'s, which are the same three the
            report's question pills use, so the chip a visitor reads here
            cannot say something different from the report that replaces this
            screen half a minute later. The colour is decoration: each verdict
            is distinguishable by its words alone, which is the rule the
            pricing table keeps for the tier names. */}
        {engines.map((key) => {
          const spec = ENGINE_SPECS[key];
          const found = verdicts.get(key);
          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                background: T.surface,
                border: "1px solid " + (found ? T.accent : T.line),
                borderRadius: "999px",
                padding: "3px 11px 3px 3px",
                transition: "border-color .4s ease",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "19px",
                  height: "19px",
                  display: "grid",
                  placeItems: "center",
                  color: T.ink,
                  flexShrink: 0,
                }}
              >
                <EngineLogo engine={key} size={15} />
              </span>
              <span style={{ fontSize: "12px", color: T.soft }}>{spec.label}</span>
              {found ? (
                <span style={{ fontSize: "12px", fontWeight: 600, color: found.named > 0 ? T.ink : T.soft }}>
                  {engineVerdict(found)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* The reveal is a figure appearing beside a label, which is nothing at
          all to a screen reader unless it is said. Only the newest landing, so
          each engine is announced once as it arrives rather than the whole
          list being re-read every time one more lands. */}
      <p aria-live="polite" className="sr-only">
        {newest ? landingAnnouncement(newest) : ""}
      </p>
      <div style={{ marginTop: "9px", height: "3px", background: T.line, borderRadius: "3px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: pct + "%",
            background: T.accent,
            borderRadius: "3px",
            transition: "width .6s ease",
          }}
        />
      </div>
      <p aria-live="polite" style={{ margin: "9px 0 0", fontSize: "13px", color: T.soft }}>
        {p.slow ? "This is taking longer than usual. Still working on it." : stepCaption(p.step)}
      </p>
    </div>
  );
}
