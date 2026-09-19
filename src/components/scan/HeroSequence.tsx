"use client";

import { useEffect, useState } from "react";

import TierName, { type TierKey } from "@/components/TierName";
import { TIERS } from "@/config/pricing";
import { CARD, MICRO, T } from "@/config/tokens";
import { ENGINE_SPECS, isEngine } from "@/lib/scan/engines";

/**
 * The waiting sequence, from HeroSequence.dc.html.
 *
 * Eight acts, one per beat of the argument, played while a scan runs. This is
 * the only multi-act animation on the site and it is deliberate: the minute a
 * scan takes is the one minute a prospect will give the whole product, and a
 * spinner spends it saying nothing.
 *
 * Three rules it keeps:
 *
 * - **It settles.** The board loops modulo 8; this stops on the last act. A
 *   story that starts again from the top reads as stuck, which is the exact
 *   thing motion here is meant to prevent, and the run is usually over by
 *   then anyway.
 * - **The progress bar is the scan, not the story.** The board drives the bar
 *   off the act index. That would be a lie told by a progress bar, so the bar
 *   and the step name under it come from the real pipeline step, and the acts
 *   run on their own clock beside it.
 * - **Every brand in it is a placeholder.** A worked example on a marketing
 *   site must not read as a measurement of a real company.
 */

type Act = {
  tier: TierKey;
  title: string;
  body: string;
};

const ACTS: Act[] = [
  {
    tier: "tracked",
    title: "Every question, and whether you got named.",
    body: "One row per question you kept. How many engines named you, whether an AI Overview appeared, and which engines it was. Refreshed on a schedule, so the number moves rather than sits.",
  },
  {
    tier: "tracked",
    title: "Open any one and read what it actually said.",
    body: "The answer is stored word for word, with the pages it was assembled from. No score to argue with - just the sentence, and the sources behind it.",
  },
  {
    tier: "tracked",
    title: "Who is being named instead of you.",
    body: "The same question set scored for every brand in the category. This is the gap, and it is the number that has to move.",
  },
  {
    tier: "tracked",
    title: "The pages you need to be on, and why.",
    body: "We rank the opportunities by how many answers each page feeds and whether inclusion is realistic. That list is the deliverable.",
  },
  {
    tier: "mentioned",
    title: "We approach the publications and get you in.",
    body: "Existing pages where inclusion is an editorial conversation, and new pages written on contextually adjacent sites where no good source exists yet. Every placement carries a link.",
  },
  {
    tier: "mentioned",
    title: "Both measures move off the same work.",
    body: "This tier is a placement strategy first - the article is what gets you named in the answer. But the links in it are chosen rather than taken, so the page they point at climbs too. One programme, two outcomes, reported separately.",
  },
  {
    tier: "cited",
    title: "Everything above, plus link insertions and on-site work.",
    body: "Where the tier below earns a foothold, this one goes after the top of the page: link insertions on pages already ranking for your term, on-page content alignment, schema, and the crawlability work that makes you easy for both crawlers to read.",
  },
  {
    tier: "everywhere",
    title: "When organic is no longer the constraint.",
    body: "Visibility creates demand. The top tier is the rest of the channel set, so that demand converts rather than leaks.",
  },
];

const TIER_ORDER: TierKey[] = ["tracked", "mentioned", "cited", "everywhere"];

const ACT_MS = 5200;

/** The three steps the pipeline reports, in the words the visitor is given. */
export const RUN_STEPS = [
  "Building the questions buyers ask",
  "Reading what the engines answered",
  "Finding the sources they cited",
];

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
const WARN = pill(T.warnBg, T.warnFg);
const BAD = pill(T.badBg, T.badFg);

const panel: React.CSSProperties = {
  border: "1px solid " + T.line,
  borderRadius: "14px",
  overflow: "hidden",
};

const soft: React.CSSProperties = {
  background: T.bg,
  border: "1px solid " + T.line,
  borderRadius: "14px",
  padding: "16px 18px",
};

const accented: React.CSSProperties = {
  background: T.wash,
  border: "1px solid " + T.accent,
  borderRadius: "14px",
  padding: "16px 18px",
};

function priceOf(key: TierKey): string {
  return TIERS.find((t) => t.key === key)?.priceLabel ?? "";
}

const GLOSS: Record<TierKey, string> = {
  tracked: "you find out where you need to be",
  mentioned: "we do the placing for you",
  cited: "citations and rankings pushed together",
  everywhere: "the whole channel set, across a portfolio",
};

/* ── Act 1: every question, and whether you got named ── */

const QUESTION_ROWS = [
  { q: "best crm software providers", named: "0 of 4", tone: BAD, aio: "shown, absent" },
  { q: "best crm for small b2b companies", named: "1 of 4", tone: WARN, aio: "none shown" },
  { q: "alternatives to [Competitor A]", named: "1 of 4", tone: WARN, aio: "mentioned" },
  { q: "which crm integrates with xero", named: "3 of 4", tone: GOOD, aio: "mentioned" },
  { q: "how much should a crm cost", named: "2 of 4", tone: WARN, aio: "mentioned" },
];

function ActQuestions() {
  return (
    <div style={panel}>
      <div className="seq-qrow" style={{ background: "#fbfbfc", borderBottom: "1px solid " + T.line, padding: "9px 20px" }}>
        <div style={MICRO}>Your buying questions</div>
        <div style={{ ...MICRO, textAlign: "right" }}>Named</div>
        <div style={{ ...MICRO, textAlign: "right" }}>AI Overview</div>
      </div>
      {QUESTION_ROWS.map((r, n) => (
        <div
          key={r.q}
          className={"seq-in" + (n ? n + 1 : "")}
          style={{ borderBottom: "1px solid " + T.hair }}
        >
          <div className="seq-qrow">
            <div style={{ fontSize: "13.5px" }}>{r.q}</div>
            <div style={{ textAlign: "right" }}>
              <span style={r.tone}>{r.named}</span>
            </div>
            <div style={{ fontSize: "13px", color: T.soft, textAlign: "right" }}>{r.aio}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Act 2: open one and read what it said ── */

const ASSEMBLED = [
  { u: "reviewsite.example/crm", k: "Review site" },
  { u: "publication.example/best-crm-providers", k: "Listicle" },
  { u: "competitor-a.example/product", k: "Brand site" },
  { u: "forum.example/software", k: "Forum" },
];

function ActAnswer() {
  return (
    <div className="seq-two-up">
      <div className="seq-in" style={{ border: "1px solid " + T.accent, borderRadius: "14px", overflow: "hidden" }}>
        <div
          style={{
            padding: "11px 18px",
            background: T.wash,
            borderBottom: "1px solid " + T.washLine,
            display: "flex",
            alignItems: "baseline",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "13.5px", fontWeight: 600 }}>best crm software providers</span>
          <div style={{ flexGrow: 1 }} />
          <span style={{ fontSize: "11px", fontWeight: 600, color: T.accent }}>ChatGPT</span>
        </div>
        <p style={{ margin: 0, padding: "16px 18px", fontSize: "13.5px", lineHeight: 1.75, color: T.soft }}>
          The providers most often recommended are <strong style={{ color: T.ink, fontWeight: 600 }}>[Competitor A]</strong>,{" "}
          <strong style={{ color: T.ink, fontWeight: 600 }}>[Competitor B]</strong> and{" "}
          <strong style={{ color: T.ink, fontWeight: 600 }}>[Competitor C]</strong>. [Competitor A] is usually cited for
          its reporting, while [Competitor B] is picked for smaller teams.
        </p>
        <div style={{ padding: "12px 18px", borderTop: "1px solid " + T.hair }}>
          <span style={BAD}>You are not in this answer</span>
        </div>
      </div>
      <div className="seq-in3">
        <div style={MICRO}>Assembled from</div>
        <div style={{ marginTop: "9px", display: "flex", flexDirection: "column", gap: "7px" }}>
          {ASSEMBLED.map((s) => (
            <div
              key={s.u}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "10px",
                padding: "9px 12px",
                background: T.bg,
                border: "1px solid " + T.line,
                borderRadius: "10px",
              }}
            >
              <span style={{ fontSize: "12.5px", flexGrow: 1 }}>{s.u}</span>
              <span style={MICRO}>{s.k}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Act 3: who is named instead of you ── */

const SOV = [
  { name: "[Competitor A]", pct: 61 },
  { name: "[Competitor B]", pct: 48 },
  { name: "[Competitor C]", pct: 34 },
  { name: "You", pct: 8, you: true },
  { name: "[Competitor D]", pct: 6 },
];

function ActShareOfVoice() {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "11px", maxWidth: "760px" }}>
        {SOV.map((s, n) => (
          <div key={s.name} className="seq-sov">
            <div style={{ fontSize: "13.5px", fontWeight: s.you ? 700 : 500, color: s.you ? T.ink : T.soft }}>
              {s.name}
            </div>
            <div style={{ height: "22px", background: T.chip, borderRadius: "4px", overflow: "hidden" }}>
              <div
                className="seq-bar"
                style={{
                  height: "100%",
                  width: s.pct + "%",
                  background: s.you ? T.accent : "#c8cad0",
                  borderRadius: "4px",
                  animationDelay: n * 0.09 + "s",
                }}
              />
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                textAlign: "right",
                color: s.you ? T.ink : T.soft,
              }}
            >
              {s.pct + "%"}
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: "18px 0 0", fontSize: "13px", color: T.soft }}>
        Share of AI answers naming each brand, across your tracked question set. Example data.
      </p>
    </div>
  );
}

/* ── Act 4: the pages you need to be on ── */

const OPPS = [
  {
    url: "publication.example/best-crm-providers",
    kind: "Listicle",
    why: "Feeds 7 answers. Editorial, so inclusion is a conversation.",
  },
  {
    url: "reviewsite.example/crm",
    kind: "Review site",
    why: "Feeds 9 answers. Profile and category placement both possible.",
  },
  {
    url: "A best-for-vertical guide that does not exist yet",
    kind: "Create",
    why: "No page covers this cut. One that ranks for it becomes the source.",
  },
];

function ActOpportunities() {
  return (
    <div>
      <div style={panel}>
        {OPPS.map((o, n) => (
          <div key={o.url} className={"seq-in" + (n ? n + 1 : "")} style={{ borderBottom: "1px solid " + T.hair }}>
            <div className="seq-orow">
              <div style={{ fontSize: "13.5px", fontWeight: 500 }}>{o.url}</div>
              <div>
                <span style={pill(T.chip, T.soft)}>{o.kind}</span>
              </div>
              <div style={{ fontSize: "13px", lineHeight: 1.55, color: T.soft }}>{o.why}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="seq-in4 seq-even" style={{ marginTop: "18px" }}>
        <div style={soft}>
          <div style={{ fontSize: "13.5px", fontWeight: 600 }}>You take the list</div>
          <p style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: 1.6, color: T.soft }}>
            That is <TierName tier="tracked" />. We hand you the targets and the publication types. Your team does the
            outreach.
          </p>
        </div>
        <div style={accented}>
          <div style={{ fontSize: "13.5px", fontWeight: 600 }}>Or we do it for you</div>
          <p style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: 1.6, color: T.ink }}>
            That is <TierName tier="mentioned" />. We approach the publications, write the placements and get the link
            in.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Act 5: the placement, and the link in it ── */

const PLACEMENT_STEPS = [
  {
    k: "One",
    t: "Approach the publication",
    b: "Editors, not link farms. We pitch inclusion on the pages the engines already read.",
  },
  {
    k: "Two",
    t: "Or build the adjacent page",
    b: "Where no good source exists, we write one on a contextually adjacent site with the authority to rank for it.",
  },
  {
    k: "Three",
    t: "The link goes in",
    b: "Commercial anchor, pointing at the page you want to rank. Live in weeks, not months.",
  },
];

function ActPlacement() {
  return (
    <div>
      <div className="seq-three">
        {PLACEMENT_STEPS.map((s, n) => (
          <div key={s.k} className={"seq-in" + (n ? n + 1 : "")} style={soft}>
            <div style={{ ...MICRO, color: T.accent }}>{s.k}</div>
            <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "7px" }}>{s.t}</div>
            <p style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: 1.6, color: T.soft }}>{s.b}</p>
          </div>
        ))}
      </div>

      <div className="seq-in5" style={{ ...CARD, marginTop: "20px", padding: "18px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr", alignItems: "center", gap: "10px" }}>
          <div style={{ background: T.bg, border: "1px solid " + T.line, borderRadius: "12px", padding: "13px 16px" }}>
            <div style={MICRO}>The placement</div>
            <div style={{ fontSize: "13.5px", fontWeight: 600, marginTop: "5px" }}>
              publication.example/best-crm-providers
            </div>
            <div style={{ fontSize: "12.5px", color: T.soft, marginTop: "4px" }}>Anchor: crm software providers</div>
          </div>
          <svg viewBox="0 0 120 40" width="120" height="40" fill="none" aria-hidden="true" style={{ display: "block" }}>
            <path className="seq-flow" d="M4 20 H104" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
            <path
              d="M100 14 L110 20 L100 26"
              stroke={T.accent}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <text x="56" y="14" fontSize="10.5" fill={T.soft} textAnchor="middle">
              link
            </text>
          </svg>
          <div style={{ background: T.wash, border: "1px solid " + T.accent, borderRadius: "12px", padding: "13px 16px" }}>
            <div style={{ ...MICRO, color: T.accent }}>Your page</div>
            <div style={{ fontSize: "13.5px", fontWeight: 600, marginTop: "5px" }}>yourdomain.com/crm</div>
            <div style={{ fontSize: "12.5px", color: T.soft, marginTop: "4px" }}>
              Gains authority for the term the anchor names
            </div>
          </div>
        </div>
        <p style={{ margin: "14px 0 0", fontSize: "13.5px", lineHeight: 1.65, color: T.soft }}>
          One article, two jobs. The engines read it as a source and name you in the answer. Google reads the link and
          passes authority to the page it points at, for the keyword the anchor uses.
        </p>
      </div>
    </div>
  );
}

/* ── The results page, drawn as a results page ── */
/**
 * A real Google listing rather than a rank chart, because that is what a
 * client recognises. One row climbs and the rest settle around it; the climb
 * distance is (places moved x the height of one result), so the motion cannot
 * claim more movement than the numbers do.
 *
 * seq-rise is acRise: the panel arrives at .3s over 1s, and the climb starts
 * at .45s, so the listing is there to be read before a row moves inside it.
 */

const LINK_BLUE = "#1a0dab";

type SerpRow = { site: string; path: string; title: string; snippet?: string; you?: boolean };

function SerpPanel(p: { keyword: string; count: string; from: number; to: number; rows: SerpRow[] }) {
  const climb = p.from - p.to === 5 ? "seq-climb5" : "seq-climb4";
  return (
    <div className="seq-rise" style={{ ...CARD, marginTop: "8px", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid " + T.hair }}>
        <div style={{ border: "1px solid " + T.line, borderRadius: "999px", padding: "6px 14px", fontSize: "12.5px" }}>
          {p.keyword}
        </div>
      </div>
      <div style={{ padding: "9px 16px 13px" }}>
        <div style={{ fontSize: "11px", color: T.soft }}>{p.count}</div>
        <div style={{ marginTop: "7px", display: "flex", flexDirection: "column", gap: "3px" }}>
          {p.rows.map((r, n) => (
            <div
              key={r.site + r.path}
              className={r.you ? climb : "seq-settle seq-in" + (n ? n + 1 : "")}
              style={{
                background: r.you ? T.wash : T.surface,
                border: "1px solid " + (r.you ? T.accent : T.hair),
                borderRadius: "10px",
                padding: "8px 11px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: "15px",
                    height: "15px",
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
                    {"was #" + p.from}
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: "13.5px", color: LINK_BLUE, lineHeight: 1.3, marginTop: "3px" }}>{r.title}</div>
              {r.you && r.snippet ? (
                <div style={{ fontSize: "11.5px", color: T.soft, lineHeight: 1.45, marginTop: "3px" }}>{r.snippet}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const YOU: SerpRow = {
  site: "yourdomain.com",
  path: "> crm",
  you: true,
  title: "CRM software for small B2B teams | yourdomain",
  snippet: "Pipeline, contacts and forecasting in one place. Used by 400+ B2B teams. Free 14-day trial.",
};

const SERP_A: SerpRow[] = [
  { site: "[Competitor A]", path: "> crm", title: "[Competitor A] - CRM software for growing teams" },
  { site: "[review site]", path: "> best-crm", title: "The 12 best CRM providers, reviewed and priced" },
  { site: "[directory]", path: "> crm > providers", title: "Compare CRM software providers 2026" },
  { site: "[Competitor B]", path: "> platform", title: "[Competitor B] - the CRM built for B2B" },
  YOU,
  { site: "[Competitor C]", path: "> pricing", title: "[Competitor C] pricing and plans" },
  { site: "[publication]", path: "> software", title: "Choosing a CRM: what actually matters" },
  { site: "[forum]", path: "> r/sales", title: "What CRM is everyone using in 2026?" },
];

const SERP_B: SerpRow[] = [
  YOU,
  { site: "[Competitor A]", path: "> crm", title: "[Competitor A] - CRM software for growing teams" },
  { site: "[review site]", path: "> best-crm", title: "The 12 best CRM providers, reviewed and priced" },
  { site: "[directory]", path: "> crm > providers", title: "Compare CRM software providers 2026" },
  { site: "[Competitor B]", path: "> platform", title: "[Competitor B] - the CRM built for B2B" },
  { site: "[Competitor C]", path: "> pricing", title: "[Competitor C] pricing and plans" },
];

const RESULT_COUNT = "About 41,300,000 results";

/* ── Act 6: both measures move ── */

function ActBothMeasures() {
  return (
    <div>
      <div className="seq-even">
        <div className="seq-in" style={{ border: "1px solid " + T.line, borderRadius: "14px", padding: "18px 20px" }}>
          <div style={MICRO}>AI share of voice</div>
          <div style={{ fontSize: "13px", color: T.soft, marginTop: "3px" }}>
            prompt: best crm software providers
          </div>
          <div style={{ marginTop: "16px", display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontSize: "34px", fontWeight: 700, letterSpacing: "-0.035em", color: T.soft }}>8%</span>
            <span style={{ fontSize: "16px", color: T.soft }}>to</span>
            <span style={{ fontSize: "34px", fontWeight: 700, letterSpacing: "-0.035em", color: T.accent }}>31%</span>
          </div>
          <div style={{ marginTop: "14px", height: "22px", background: T.chip, borderRadius: "4px", overflow: "hidden" }}>
            <div className="seq-bar" style={{ height: "100%", width: "31%", background: T.accent, borderRadius: "4px" }} />
          </div>
          <p style={{ margin: "10px 0 0", fontSize: "12.5px", color: T.soft }}>
            Share of tracked answers naming you. Example figures, not a client result.
          </p>
        </div>

        <div className="seq-in3">
          <div style={MICRO}>Google results page, tenth to fifth</div>
          <SerpPanel keyword="crm software providers" count={RESULT_COUNT} from={10} to={5} rows={SERP_A} />
          <p style={{ margin: "9px 0 0", fontSize: "12.5px", color: T.soft }}>
            The placement is bought for the answer. The link is chosen for the ranking. Example figures, not a client
            result.
          </p>
        </div>
      </div>
      <p className="seq-in5" style={{ margin: "16px 0 0", fontSize: "15px", fontWeight: 600 }}>
        Want to challenge for the top positions?
      </p>
    </div>
  );
}

/* ── Act 7: insertions, on-site work, and the top of the page ── */

const INSERTS = [
  { u: "blog.example/crm-buying-guide", p: "4th", r: "Strong", tone: GOOD },
  { u: "tradetitle.example/sales-software", p: "7th", r: "Strong", tone: GOOD },
  { u: "publication.example/software-stack", p: "9th", r: "Moderate", tone: WARN },
];

const ONSITE = [
  {
    t: "On-page content alignment",
    b: "Titles, headings and internal links aligned to the terms the placements point at, so the authority lands somewhere that deserves it.",
  },
  {
    t: "Schema",
    b: "Structured data on the target cluster, so both crawlers can read what the page is about without inferring it.",
  },
  {
    t: "Crawlability for both",
    b: "Easier for Googlebot and easier for the LLM crawlers. That lifts the odds of a citation and the odds of a ranking at the same time.",
  },
];

/**
 * The two real client figures in the sequence, both attested by Danny as the
 * account owner on 19 September 2026. The keyword carries its window, because
 * the window is what makes it a claim rather than a boast; the visibility
 * figure carries none, because none is sourced and an invented window is worse
 * than no window at all.
 */
const VIBE_VISIBILITY = "0% to 25%";
const VIBE_KEYWORD = "#83 to #1";

function ActCited() {
  return (
    <div className="seq-two-up">
      <div className="seq-in">
        <div style={{ ...MICRO, color: T.accent }}>Link insertions, chosen on semantic relevance</div>
        <p style={{ margin: "8px 0 0", fontSize: "13.5px", lineHeight: 1.65, color: T.soft }}>
          We find pages already ranking for your target keyword, or something close to it, and secure a link insertion
          in them. A page that is already earning traffic on your term passes far more than a high-DR page about
          something else.
        </p>
        <div style={{ marginTop: "14px", border: "1px solid " + T.line, borderRadius: "12px", overflow: "hidden" }}>
          <div
            className="seq-irow"
            style={{ background: "#fbfbfc", borderBottom: "1px solid " + T.line, padding: "9px 16px" }}
          >
            <div style={MICRO}>Page ranking for the term</div>
            <div style={{ ...MICRO, textAlign: "right" }}>Position</div>
            <div style={{ ...MICRO, textAlign: "right" }}>Relevance</div>
          </div>
          {INSERTS.map((i) => (
            <div key={i.u} className="seq-irow" style={{ borderBottom: "1px solid " + T.hair }}>
              <div style={{ fontSize: "13px" }}>{i.u}</div>
              <div style={{ fontSize: "13px", textAlign: "right", color: T.soft }}>{i.p}</div>
              <div style={{ textAlign: "right" }}>
                <span style={i.tone}>{i.r}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...MICRO, color: T.accent, marginTop: "16px" }}>And on your own site</div>
        <div className="seq-three" style={{ marginTop: "8px", gap: "10px" }}>
          {ONSITE.map((o) => (
            <div key={o.t} style={{ ...soft, borderRadius: "12px", padding: "12px 14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>{o.t}</div>
              <p style={{ margin: "4px 0 0", fontSize: "12px", lineHeight: 1.5, color: T.soft }}>{o.b}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="seq-in3">
        <div style={{ ...MICRO, color: T.accent }}>The same results page, fifth to first</div>
        <SerpPanel keyword="crm software providers" count={RESULT_COUNT} from={5} to={1} rows={SERP_B} />

        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid " + T.hair }}>
          <div style={MICRO}>Vibe Retail, US retail SaaS</div>
          <div style={{ ...CARD, marginTop: "8px", display: "flex", overflow: "hidden", flexWrap: "wrap" }}>
            <div style={{ flexGrow: 1, flexBasis: 0, padding: "14px 16px" }}>
              <div style={{ fontSize: "12px", color: T.soft }}>ChatGPT brand visibility</div>
              <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em", marginTop: "2px" }}>
                {VIBE_VISIBILITY}
              </div>
            </div>
            <div style={{ flexGrow: 1, flexBasis: 0, padding: "14px 16px", borderLeft: "1px solid " + T.line }}>
              <div style={{ fontSize: "12px", color: T.soft }}>Money keyword, in four months</div>
              <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em", marginTop: "2px" }}>
                {VIBE_KEYWORD}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Act 8: when organic is no longer the constraint ── */

const LADDER = [
  {
    step: "Starts here",
    tier: "cited" as TierKey,
    label: "",
    b: "AI citations and Google rankings pushed together. The engine of the whole thing.",
    on: true,
  },
  {
    step: "Then",
    tier: null,
    label: "Conversion rate optimisation",
    b: "So the visits the first tier wins actually turn into enquiries.",
    on: false,
  },
  {
    step: "Then",
    tier: null,
    label: "Brand PR and earned mentions",
    b: "Coverage the engines read, beyond the pages we can place into directly.",
    on: false,
  },
  {
    step: "Then",
    tier: null,
    label: "Paid search expansion",
    b: "Buying the demand organic cannot reach yet, against the same question set.",
    on: false,
  },
];

function ActEverywhere() {
  return (
    <div>
      <div className="seq-four">
        {LADDER.map((l, n) => (
          <div key={l.step + n} className={"seq-in" + (n ? n + 1 : "")} style={l.on ? accented : soft}>
            <div style={{ ...MICRO, color: l.on ? T.accent : T.soft }}>{l.step}</div>
            <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.022em", marginTop: "7px" }}>
              {l.tier ? <TierName tier={l.tier} /> : l.label}
            </div>
            <p style={{ margin: "7px 0 0", fontSize: "12.5px", lineHeight: 1.6, color: T.soft }}>{l.b}</p>
          </div>
        ))}
      </div>
      <p style={{ margin: "18px 0 0", fontSize: "14px", lineHeight: 1.65, color: T.soft, maxWidth: "82ch" }}>
        Organic AI search is where it starts. <TierName tier="everywhere" /> is when a client needs the rest of the
        channel set to catch the demand the first three tiers create.
      </p>
    </div>
  );
}

const ACT_BODIES = [
  ActQuestions,
  ActAnswer,
  ActShareOfVoice,
  ActOpportunities,
  ActPlacement,
  ActBothMeasures,
  ActCited,
  ActEverywhere,
];

/** How far through the pipeline, by its own step rather than by the story. */
const STEP_PCT = [15, 55, 85, 100];

// headingRef is destructured out of the props bag for the same reason as in
// screens.tsx: a ref held in `p` makes every read of `p` a ref access to the
// React Compiler, which flagged p.step and p.engines during render.
export default function HeroSequence({ headingRef, ...p }: {
  domain: string;
  /** The engines this scan actually reads, frozen onto the row at start. */
  engines: string[];
  /** 0 questions, 1 reading, 2 sources, 3 done. */
  step: number;
  slow?: boolean;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const [act, setAct] = useState(0);
  /** Set once the rail is used. The story is theirs from then on. */
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (act >= ACTS.length - 1) return;
    const t = setTimeout(() => setAct((n) => n + 1), ACT_MS);
    return () => clearTimeout(t);
  }, [act, held]);

  const current = ACTS[act];
  const Body = ACT_BODIES[act];
  const pct = STEP_PCT[Math.min(Math.max(p.step, 0), STEP_PCT.length - 1)];
  const engines = p.engines.filter(isEngine);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Which engines, and how far through. Both are the real scan. */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={MICRO}>{"Running your scan - " + p.domain}</span>
          <div style={{ flexGrow: 1 }} />
          {engines.map((key) => {
            const spec = ENGINE_SPECS[key];
            return (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  background: T.surface,
                  border: "1px solid " + T.line,
                  borderRadius: "999px",
                  padding: "3px 11px 3px 3px",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "19px",
                    height: "19px",
                    borderRadius: "6px",
                    background: spec.colour + "1a",
                    border: "1px solid " + spec.colour + "3d",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "12px", color: T.soft }}>{spec.label}</span>
              </div>
            );
          })}
        </div>
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
          {p.slow ? "This is taking longer than usual. Still working on it." : RUN_STEPS[Math.min(p.step, 2)]}
        </p>
      </div>

      {/* The stage. The band names the tier each act belongs to, so a change of
          package is never something you have to notice in 12px type. */}
      <div style={{ ...CARD, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "11px 20px",
            background: "#fbfbfc",
            borderBottom: "1px solid " + T.line,
            flexWrap: "wrap",
          }}
        >
          {TIER_ORDER.map((key) => {
            const on = key === current.tier;
            return (
              <div
                key={key}
                className={on ? undefined : "tier-quiet"}
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "-0.018em",
                  borderRadius: "999px",
                  padding: "5px 13px",
                  background: on ? T.surface : "transparent",
                  border: "1px solid " + (on ? T.accent : "transparent"),
                }}
              >
                <TierName tier={key} />
              </div>
            );
          })}
          <div style={{ flexGrow: 1 }} />
          <span style={{ fontSize: "12px", color: T.soft }}>{act + 1 + " of " + ACTS.length}</span>
        </div>

        <div style={{ padding: "22px 32px 26px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "21px", fontWeight: 700, letterSpacing: "-0.028em" }}>
              <TierName tier={current.tier} />
            </span>
            <span
              style={{
                fontSize: "13.5px",
                fontWeight: 600,
                background: T.wash,
                borderRadius: "999px",
                padding: "3px 11px",
              }}
            >
              {priceOf(current.tier)}
            </span>
            <span style={{ fontSize: "13.5px", color: T.soft }}>{GLOSS[current.tier]}</span>
          </div>

          <h2
            ref={headingRef}
            tabIndex={-1}
            style={{
              margin: "12px 0 0",
              fontSize: "25px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.22,
              outline: "none",
            }}
          >
            {current.title}
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: "14.5px", lineHeight: 1.65, color: T.soft, maxWidth: "82ch" }}>
            {current.body}
          </p>

          <div style={{ marginTop: "20px" }} key={act}>
            <Body />
          </div>
        </div>
      </div>

      {/* The rail. Taking it stops the autoplay: nothing is more annoying than
          a story that moves on while you are reading the bit you chose. */}
      <div style={{ display: "flex", gap: "6px" }}>
        {ACTS.map((a, n) => (
          <button
            key={a.title}
            type="button"
            onClick={() => {
              setAct(n);
              setHeld(true);
            }}
            aria-label={"Step " + (n + 1) + ": " + a.title}
            aria-current={n === act}
            style={{
              height: "3px",
              flexGrow: 1,
              border: 0,
              padding: 0,
              borderRadius: "3px",
              cursor: "pointer",
              background: n === act ? T.accent : T.line,
            }}
          />
        ))}
      </div>
    </div>
  );
}
