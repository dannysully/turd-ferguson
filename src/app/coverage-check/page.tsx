import type { Metadata } from "next";

import { CARD, GRID12, H2, MICRO, SHELL, T } from "@/config/tokens";

export const metadata: Metadata = {
  title: "Free campaign benchmark | alwayscited",
  description:
    "Take the reading before the campaign. Five questions, three engines, every source kept and checked against your coverage - dated and re-runnable, so the next reading is a comparison.",
  alternates: { canonical: "https://alwayscited.com/coverage-check" },
};

/**
 * CoverageCheck.dc.html, front end only.
 *
 * The board is a working tool: four inputs, five generated questions, three
 * engines, every cited source matched against an uploaded coverage list, and
 * the whole thing stored dated and re-runnable. None of that backend exists
 * and the schema for it is not mine to invent, so the submit is stubbed -
 * visibly, in the page, not as a silent no-op.
 *
 * The one thing this page must not do is take an email address for a
 * baseline that will never arrive. So the email field is not here at all
 * until the thing behind it runs; the board's four campaign inputs are, and
 * the button says what it does instead of pretending.
 *
 * The questions and the result figures below are the board's example data.
 * Placeholders stay placeholders - [Client brand], [the thing you announced]
 * - and the whole block is labelled, because a worked example on a marketing
 * page must not read as a measurement of anyone real.
 *
 * Open decisions are in docs/blocked.md, one question each.
 */

type Prompt = { kind: string; q: string; why: string; weak?: boolean };

const PROMPTS: Prompt[] = [
  {
    kind: "Identity",
    q: "what does [Client brand] do",
    why: "The description everything else is judged against.",
  },
  {
    kind: "Capability",
    q: "does [Client brand] offer [the thing you announced]",
    why: "Whether the announcement has reached the answer at all.",
  },
  {
    kind: "Category",
    q: "who offers [the thing you announced] for [segment]",
    why: "The buying question. Coverage that wins this one is worth repeating.",
  },
  {
    kind: "Comparison",
    q: "[Client brand] vs alternatives for [the thing you announced]",
    why: "Where a competitor comparison page usually speaks for you.",
  },
  {
    kind: "News",
    q: "what has [Client brand] announced recently",
    weak: true,
    why: "Weakest of the five. Engines hedge on recency and may answer from memory rather than a source.",
  },
];

const PROMISES: { k: string; t: string; b: string }[] = [
  {
    k: "Recognition",
    t: "Do the engines know who the brand is",
    b: "Ask about the brand by name and see whether the answer is right, wrong, or about somebody else. Confusion with a similarly named company is more common than you would think, and it is invisible until you look.",
  },
  {
    k: "Evidence",
    t: "Is your coverage the source, or is a competitor",
    b: "Every AI answer is assembled from pages. We show which pages built the description of your client, and mark the ones that came from your campaign. Two of four being a competitor comparison page is a finding.",
  },
  {
    k: "A starting line",
    t: "Something to measure the next campaign against",
    b: "The reading is dated and stored with its questions, so the same five can be asked again after the campaign. Without that first reading there is nothing to compare, which is why this one is free.",
  },
];

const field: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "14px",
  color: T.ink,
  background: T.surface,
  border: `1px solid ${T.line}`,
  borderRadius: "10px",
  padding: "11px 13px",
};

const pill = (bg: string, fg: string): React.CSSProperties => ({
  fontSize: "11px",
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: "999px",
  background: bg,
  color: fg,
  display: "inline-block",
  whiteSpace: "nowrap",
});

export default function CoverageCheckPage() {
  return (
    <main style={{ ...SHELL, paddingTop: "42px", paddingBottom: "44px", display: "flex", flexDirection: "column", gap: "26px" }}>
      <div className="board-head" style={{ ...GRID12, alignItems: "start" }}>
        <div style={{ gridColumn: "span 7" }}>
          <div style={MICRO}>Free campaign benchmark</div>
          <h1 style={{ margin: "10px 0 0", fontSize: "36px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.18, color: T.ink }}>
            Take the reading before the campaign. <span style={{ color: T.accent }}>Then it means something.</span>
          </h1>
          <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.65, color: T.soft, maxWidth: "62ch" }}>
            Five questions built from the brand and what the campaign is about. We ask three engines, keep the answers
            word for word, and check every source they cite against the coverage you upload. Dated, stored, and
            re-runnable - so the next reading is a comparison rather than another snapshot.
          </p>
        </div>

        <div style={{ ...CARD, gridColumn: "span 5", padding: "22px" }}>
          <div style={MICRO}>The campaign</div>
          <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label htmlFor="cc-brand" style={{ ...MICRO, display: "block", marginBottom: "6px" }}>
                Brand name
              </label>
              <input id="cc-brand" style={field} placeholder="[Client brand]" disabled />
            </div>
            <div>
              <label htmlFor="cc-domain" style={{ ...MICRO, display: "block", marginBottom: "6px" }}>
                Client domain
              </label>
              <input id="cc-domain" style={field} placeholder="clientdomain.com" disabled />
            </div>
            <div>
              <label htmlFor="cc-topic" style={{ ...MICRO, display: "block", marginBottom: "6px" }}>
                What the campaign is about
              </label>
              <input id="cc-topic" style={field} placeholder="[the thing you announced]" disabled />
              <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: T.faint, lineHeight: 1.5 }}>
                A capability or a claim, not a headline. &ldquo;Same-day settlement&rdquo;, not &ldquo;Brand announces
                exciting news&rdquo;.
              </p>
            </div>
            <div>
              <span style={{ ...MICRO, display: "block", marginBottom: "6px" }}>
                Coverage <span style={{ fontWeight: 400, color: T.faint }}>optional</span>
              </span>
              <div style={{ border: `1px dashed #d6d8dd`, borderRadius: "12px", padding: "14px", textAlign: "center", background: "#fbfbfc" }}>
                <span style={{ fontSize: "13px", color: T.soft }}>A CSV of the URLs you placed</span>
              </div>
            </div>
          </div>

          {/* Stubbed on purpose, and saying so. The alternative - a button
              that appears to work and quietly does nothing, beside a field
              for your email - would be collecting addresses for a report
              that cannot be produced yet. */}
          <div style={{ marginTop: "14px", background: T.warnBg, border: `1px solid #f0dcc0`, borderRadius: "10px", padding: "12px 14px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: T.warnFg }}>Not open yet</div>
            <p style={{ margin: "5px 0 0", fontSize: "12.5px", lineHeight: 1.55, color: T.soft }}>
              The benchmark is being built. This page shows exactly what it does and what it returns; the form does not
              run yet, and we are not taking email addresses for a report we cannot send. The free scan below is live
              today.
            </p>
          </div>

          <a
            href="/#scan"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: "12px",
              fontSize: "15px",
              fontWeight: 600,
              color: "#ffffff",
              background: T.accent,
              borderRadius: "10px",
              padding: "13px 20px",
              textDecoration: "none",
            }}
          >
            Run the free scan instead
          </a>
        </div>
      </div>

      <section>
        <div className="board-head" style={{ ...GRID12, marginBottom: "14px" }}>
          <h2 style={{ ...H2, gridColumn: "span 4" }}>These are the five we would ask</h2>
          <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Built from the brand and the campaign topic, not from your headlines. If the question is wrong, everything
            after it is wrong too, so you would get to edit them before anything ran.
          </p>
        </div>

        <div style={{ ...CARD, overflow: "hidden" }}>
          {PROMPTS.map((q, i) => (
            <div key={q.q} className="cc-prompt" style={{ padding: "14px 26px", borderTop: i ? `1px solid ${T.hair}` : undefined, alignItems: "baseline" }}>
              <div>
                <span style={q.weak ? pill(T.warnBg, T.warnFg) : pill(T.chip, T.soft)}>{q.kind}</span>
              </div>
              <div style={{ fontSize: "14px", color: T.ink }}>{q.q}</div>
              <div style={{ fontSize: "12.5px", lineHeight: 1.5, color: T.soft }}>{q.why}</div>
            </div>
          ))}
          <p style={{ margin: 0, padding: "13px 26px", fontSize: "12.5px", color: T.faint, borderTop: `1px solid ${T.hair}` }}>
            Three engines, five questions, fifteen answers. Every source kept.
          </p>
        </div>
      </section>

      <section>
        <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
          <h2 style={{ ...H2, gridColumn: "span 4" }}>Three things it tells you</h2>
          <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            All three are readable today, from what is published. None of them needs a tag on the client&apos;s site,
            and none of them claims the campaign caused anything.
          </p>
        </div>

        <div className="three-up">
          {PROMISES.map((p) => (
            <div key={p.k} style={{ ...CARD, padding: "24px" }}>
              <div style={{ ...MICRO, color: T.accent }}>{p.k}</div>
              <div style={{ fontSize: "15.5px", fontWeight: 600, marginTop: "9px", lineHeight: 1.35, color: T.ink }}>{p.t}</div>
              <p style={{ margin: "9px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>{p.b}</p>
            </div>
          ))}
        </div>
      </section>

      <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.65, color: T.soft }}>
        Built for PR teams who are tired of reporting reach.{" "}
        <a href="/pr-agencies" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
          See how agencies use it
        </a>
      </p>
    </main>
  );
}
