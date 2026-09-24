"use client";

import { useEffect, useRef, useState } from "react";

import EngineLogo from "@/components/EngineLogo";
import TierName, { type TierKey } from "@/components/TierName";
import { TIERS } from "@/config/pricing";
import { CARD, MICRO, SHELL, T } from "@/config/tokens";
import { FREE_ENGINE_COUNT } from "@/config/scan-shape";
import { ENGINE_SPECS, FREE_ENGINES } from "@/lib/scan/engines";

import { seqClimb, seqStep } from "./scan/seq-stagger";

/**
 * The four-tier explanation, as four pictures.
 *
 * One component in two places - the scan waiting screen and the homepage -
 * because there were two explanations of the same four tiers and they did not
 * say the same thing. The waiting screen ran an eight-act essay
 * (`HeroSequence`) and the homepage ran a static table (`TierJourney`); a
 * visitor who read both got two different accounts of what $99 buys.
 *
 * Each beat is one picture and at most one short line. The old acts averaged
 * forty words of body copy each, which is not what a person does with the
 * minute a scan takes: they look. The argument is carried by the pictures -
 * you are missing, a placement lands, the listing climbs, every engine names
 * you - and the words label them rather than repeat them.
 *
 * Three rules it keeps:
 *
 * - **Take the motion away and the argument survives.** With no
 *   `html[data-motion="on"]` - a crawler, motion turned off, JavaScript off -
 *   all four beats render stacked and fully visible, and the rail is gone
 *   rather than dead. Every hidden start state is scoped under that attribute,
 *   which `Motion.tsx` sets only after clearing `prefers-reduced-motion`. So
 *   nothing here is content that exists only once an animation has run.
 * - **Every figure in it is illustrative.** The brands are bracketed
 *   placeholders, the domain is `yourdomain.com`, and the panel says so in
 *   words. A worked example on a marketing site must never read as a
 *   measurement of a real client - see `client-results.ts` for the numbers
 *   that _are_ attested, none of which are used here.
 * - **The prices come from config.** `priceLabel` and `priceBasis` are read
 *   from `pricing.ts`, the same source the pricing table and the package pages
 *   read, because a price typed into a picture is a price that goes stale in a
 *   place nobody looks.
 */

const BEAT_MS = 3500;

/** The one-line label for each beat. Six words or fewer, sentence case. */
type Beat = {
  tier: TierKey;
  line: string;
  /** What this beat shows, for the rail's accessible name and the sr-only text. */
  alt: string;
};

const BEATS: Beat[] = [
  {
    tier: "tracked",
    line: "See where you stand.",
    alt: `A buyer question, the ${FREE_ENGINE_COUNT} engines, competitors named and you missing.`,
  },
  {
    tier: "mentioned",
    line: "A placement gets you named.",
    alt: "An article lands on a publication, the answer starts naming you, and the listing climbs.",
  },
  {
    tier: "cited",
    line: "Cited as the source, and first.",
    alt: "Link insertions and on-site work take the listing to the top, with your own page cited.",
  },
  {
    tier: "everywhere",
    line: "Every engine names you.",
    alt: `All ${FREE_ENGINE_COUNT} engines name you in their answer.`,
  },
];

const tierOf = (key: TierKey) => TIERS.find((t) => t.key === key);

const pill = (bg: string, fg: string): React.CSSProperties => ({
  fontSize: "11px",
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: "999px",
  background: bg,
  color: fg,
  whiteSpace: "nowrap",
});

const GOOD = pill(T.goodBg, T.goodFg);
const BAD = pill(T.badBg, T.badFg);

const soft: React.CSSProperties = {
  background: T.bg,
  border: "1px solid " + T.line,
  borderRadius: "14px",
  padding: "14px 16px",
};

/**
 * What a buyer types, drawn as the thing they typed it into.
 *
 * Named `ASK` rather than `QUESTION` on purpose. `copy.test.mts` sweeps for a
 * question count typed into shipped text, and its digit rule fires on a number
 * sharing a line with the word "question" - which `<SerpPanel ... from={10}
 * to={5} />` did, on a 10 that is a search position and not a count of
 * anything. Renaming the constant is the honest way past that: the rule is
 * catching what it was written to catch and the coincidence was mine.
 */
const ASK = "best crm for small b2b teams";

/* ── The listing, drawn as a listing ────────────────────────────── */
/**
 * Moved here from `HeroSequence`, unchanged in substance: a real Google
 * listing rather than a rank chart, because that is what a client recognises.
 * One row climbs and the rest settle around it, and the climb distance is
 * (places moved x the height of one result), so the motion cannot claim more
 * movement than the numbers beside it do. `seqClimb` computes that travel.
 */

const LINK_BLUE = "#1a0dab";

type SerpRow = { site: string; path: string; title: string; snippet?: string; you?: boolean };

function SerpPanel(p: { keyword: string; from: number; to: number; rows: SerpRow[] }) {
  return (
    <div className="seq-rise" style={{ ...CARD, overflow: "hidden" }}>
      <div style={{ padding: "9px 14px", borderBottom: "1px solid " + T.hair }}>
        <div style={{ border: "1px solid " + T.line, borderRadius: "999px", padding: "5px 12px", fontSize: "12px" }}>
          {p.keyword}
        </div>
      </div>
      <div style={{ padding: "8px 14px 12px", display: "flex", flexDirection: "column", gap: "3px" }}>
        {p.rows.map((r, n) => {
          // One animation per row, never two: `.seq-settle` and a stagger rung
          // both set the `animation` shorthand at equal specificity, so the
          // second silently took the whole property. The row that moves takes
          // its travel from the numbers; the rest settle on a delay.
          const motion = r.you
            ? seqClimb(p.from, p.to)
            : { className: "seq-settle", style: { animationDelay: (0.5 + n * 0.06).toFixed(2) + "s" } };
          return (
            <div
              key={r.site + r.path}
              className={motion.className}
              style={{
                ...motion.style,
                background: r.you ? T.wash : T.surface,
                border: "1px solid " + (r.you ? T.accent : T.hair),
                borderRadius: "10px",
                padding: "7px 10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    background: r.you ? T.accent : "#c9ccd3",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "11px", color: r.you ? T.ink : T.soft }}>{r.site}</span>
                <span style={{ fontSize: "11px", color: T.soft }}>{r.path}</span>
                <div style={{ flexGrow: 1 }} />
                {r.you ? (
                  <span style={{ ...pill(T.surface, T.accent), border: "1px solid " + T.accent }}>
                    {"#" + p.from + " to #" + p.to}
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: "13px", color: LINK_BLUE, lineHeight: 1.3, marginTop: "3px" }}>{r.title}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const YOU: SerpRow = {
  site: "yourdomain.com",
  path: "> crm",
  you: true,
  title: "CRM software for small B2B teams | yourdomain",
};

const SERP_TEN: SerpRow[] = [
  { site: "[Competitor A]", path: "> crm", title: "[Competitor A] - CRM software for growing teams" },
  { site: "[review site]", path: "> best-crm", title: "The 12 best CRM providers, reviewed and priced" },
  { site: "[directory]", path: "> crm > providers", title: "Compare CRM software providers 2026" },
  { site: "[Competitor B]", path: "> platform", title: "[Competitor B] - the CRM built for B2B" },
  YOU,
];

const SERP_FIVE: SerpRow[] = [
  YOU,
  { site: "[Competitor A]", path: "> crm", title: "[Competitor A] - CRM software for growing teams" },
  { site: "[review site]", path: "> best-crm", title: "The 12 best CRM providers, reviewed and priced" },
  { site: "[Competitor B]", path: "> platform", title: "[Competitor B] - the CRM built for B2B" },
];

/* ── Beat 1: where you stand ────────────────────────────────────── */

const STANDING: { name: string; named: boolean }[] = [
  { name: "[Competitor A]", named: true },
  { name: "[Competitor B]", named: true },
  { name: "[Competitor C]", named: true },
  { name: "yourdomain.com", named: false },
];

function BeatTracked() {
  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <div style={{ ...soft, display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "13.5px", color: T.ink }}>{ASK}</span>
        <div style={{ flexGrow: 1 }} />
        {FREE_ENGINES.map((key) => (
          <span
            key={key}
            title={ENGINE_SPECS[key].label}
            style={{ display: "grid", placeItems: "center", color: T.ink }}
          >
            <EngineLogo engine={key} size={16} title={ENGINE_SPECS[key].label} />
          </span>
        ))}
      </div>
      <div style={{ ...CARD, overflow: "hidden" }}>
        {STANDING.map((s, n) => (
          <div
            key={s.name}
            {...seqStep(n, {
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderBottom: n === STANDING.length - 1 ? undefined : "1px solid " + T.hair,
              background: s.named ? undefined : T.wash,
            })}
          >
            <span style={{ fontSize: "13px", color: s.named ? T.soft : T.ink, fontWeight: s.named ? 400 : 600 }}>
              {s.name}
            </span>
            <div style={{ flexGrow: 1 }} />
            <span style={s.named ? GOOD : BAD}>{s.named ? "named" : "not named"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Beat 2: the placement ──────────────────────────────────────── */

function BeatMentioned() {
  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <div {...seqStep(0, { ...soft })}>
        <div style={MICRO}>[publication].com</div>
        <div style={{ fontSize: "14px", color: T.ink, marginTop: "4px", lineHeight: 1.4 }}>
          The 12 best CRM providers, reviewed and priced
        </div>
        <div style={{ fontSize: "12.5px", color: T.soft, marginTop: "5px", lineHeight: 1.5 }}>
          {"... alongside [Competitor A] and [Competitor B], "}
          <span style={{ color: T.ink, fontWeight: 600, background: T.wash, borderRadius: "4px", padding: "0 3px" }}>
            yourdomain.com
          </span>
          {" is worth a look for smaller teams."}
        </div>
      </div>
      <div {...seqStep(1, { ...soft, display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap" })}>
        <EngineLogo engine="chatgpt" size={15} title={ENGINE_SPECS.chatgpt.label} />
        <span style={{ fontSize: "12.5px", color: T.soft }}>
          {"the answer now names "}
          <span style={{ color: T.ink, fontWeight: 600 }}>yourdomain.com</span>
        </span>
        <div style={{ flexGrow: 1 }} />
        <span style={GOOD}>named</span>
      </div>
      <SerpPanel keyword={ASK} from={10} to={5} rows={SERP_TEN} />
    </div>
  );
}

/* ── Beat 3: insertions and on-site work ────────────────────────── */

function BeatCited() {
  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <SerpPanel keyword={ASK} from={5} to={1} rows={SERP_FIVE} />
      <div {...seqStep(0, { ...soft, display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap" })}>
        <EngineLogo engine="perplexity" size={15} title={ENGINE_SPECS.perplexity.label} />
        <span style={{ fontSize: "12.5px", color: T.soft }}>
          {"sources: "}
          <span style={{ color: T.ink, fontWeight: 600 }}>yourdomain.com/crm</span>
        </span>
        <div style={{ flexGrow: 1 }} />
        <span style={GOOD}>cited</span>
      </div>
    </div>
  );
}

/* ── Beat 4: every engine ───────────────────────────────────────── */

function BeatEverywhere() {
  return (
    <div style={{ display: "grid", gap: "10px" }}>
      {FREE_ENGINES.map((key, n) => (
        <div
          key={key}
          {...seqStep(n, {
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: T.wash,
            border: "1px solid " + T.washLine,
            borderRadius: "14px",
            padding: "12px 16px",
          })}
        >
          <span style={{ display: "grid", placeItems: "center", color: T.ink }}>
            <EngineLogo engine={key} size={17} title={ENGINE_SPECS[key].label} />
          </span>
          <span style={{ fontSize: "13.5px", color: T.ink }}>{ENGINE_SPECS[key].label}</span>
          <div style={{ flexGrow: 1 }} />
          <span style={GOOD}>names you</span>
        </div>
      ))}
    </div>
  );
}

const BODIES: Record<TierKey, () => React.JSX.Element> = {
  tracked: BeatTracked,
  mentioned: BeatMentioned,
  cited: BeatCited,
  everywhere: BeatEverywhere,
};

/**
 * The sequence.
 *
 * `heading` is what tells the two callers apart. The homepage calls this as a
 * page section, so it gets the site shell and its own `h2`; the waiting screen
 * drops it inside a shell it already has, under a progress block that already
 * carries the heading, so it takes neither.
 */
export default function ProcessSequence(p: { heading?: string }) {
  const [beat, setBeat] = useState(0);
  /** Taken by a click or a hover; autoplay never resumes on its own after that. */
  const [held, setHeld] = useState(false);
  const holdRef = useRef(false);

  useEffect(() => {
    if (held || holdRef.current) return;
    if (typeof window === "undefined") return;
    // The same gate `Motion.tsx` applies before it sets data-motion. Without
    // it the beats would still be cycling under a reader who asked for no
    // motion, while the CSS has already stacked all four for them.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setBeat((n) => (n + 1) % BEATS.length), BEAT_MS);
    return () => clearTimeout(t);
  }, [beat, held]);

  const hold = () => {
    holdRef.current = true;
    setHeld(true);
  };


  const body = (
    <div
      className="proc"
      onMouseEnter={hold}
      onFocusCapture={hold}
    >
      {p.heading ? (
        <h2 style={{ margin: "0 0 18px", fontSize: "25px", fontWeight: 700, letterSpacing: "-0.03em" }}>
          {p.heading}
        </h2>
      ) : null}

      {/* The rail. It is gone rather than dead when motion is off, because all
          four beats are on the page then and there is nothing to move between.
          The control is 24px tall for WCAG 2.5.8 even though the mark in it is
          3px, which is the same correction the old rail carried. */}
      <div className="proc-rail" role="tablist" aria-label="The four tiers">
        {BEATS.map((b, n) => (
          <button
            key={b.tier}
            type="button"
            role="tab"
            aria-selected={n === beat}
            onClick={() => {
              setBeat(n);
              hold();
            }}
            style={{
              flexGrow: 1,
              border: 0,
              padding: "11px 0",
              appearance: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "block", fontSize: "13px", fontWeight: 700, letterSpacing: "-0.018em" }}>
              <TierName tier={b.tier} />
            </span>
            <span
              aria-hidden="true"
              style={{
                display: "block",
                height: "3px",
                borderRadius: "3px",
                marginTop: "7px",
                background: n === beat ? T.accent : T.line,
              }}
            />
          </button>
        ))}
      </div>

      <div className="proc-beats">
        {BEATS.map((b, n) => {
          const tier = tierOf(b.tier);
          const Body = BODIES[b.tier];
          return (
            <div key={b.tier} className="proc-beat" data-on={n === beat ? "1" : undefined}>
              <div style={{ ...CARD, padding: "20px 22px 24px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.028em" }}>
                    <TierName tier={b.tier} />
                  </span>
                  {tier ? (
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        background: T.wash,
                        borderRadius: "999px",
                        padding: "3px 11px",
                      }}
                    >
                      {tier.priceLabel}
                    </span>
                  ) : null}
                </div>
                <p style={{ margin: "10px 0 0", fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em" }}>
                  {b.line}
                </p>
                {tier?.priceBasis ? (
                  <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: T.soft, lineHeight: 1.55 }}>
                    {tier.priceBasis}
                  </p>
                ) : null}
                {/* The pictures are decorative to a screen reader - every one
                    of them is placeholder brands in a drawing - so each beat
                    says in words what its picture shows. */}
                <p className="sr-only">{b.alt}</p>
                <div style={{ marginTop: "16px" }} key={beat}>
                  <Body />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ margin: "14px 0 0", fontSize: "12px", color: T.soft }}>
        Illustrative example. The brands, the domain and the positions are placeholders, not a client result.
      </p>
    </div>
  );

  /* The homepage calls this as a page section and gets the site shell; the
     waiting screen is already inside one. Wrapped as a value rather than by a
     component declared in this function body - that would be a fresh component
     type on every render, so React would unmount and remount the whole tree
     each time the beat changed, and the animation this exists to run would be
     destroyed by the state change that starts it. */
  return p.heading ? <section style={{ ...SHELL, marginTop: "44px" }}>{body}</section> : body;
}
