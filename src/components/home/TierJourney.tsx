import TierName, { TIER_PLAIN, type TierKey } from "@/components/TierName";
import { TIERS } from "@/config/pricing";
import { listOf, namedOf, pickEngines } from "@/config/scan-shape";
import { CARD, GRID12, MICRO, SHELL, T } from "@/config/tokens";
import { overviewLabel, type WorkedQuestionId, workedQuestion } from "@/config/worked-example";

/**
 * "Four tiers, each one adding to the last" - Journey.dc.html.
 *
 * Built static. The board autoplays one tier at a time on a 3.6s cycle, but
 * nothing is hidden at rest there and nothing is hidden here: all four render
 * in full, and the rail is anchor links rather than a player.
 *
 * The board's stagger arrives on the tier that starts playing; with no player
 * there is no such moment, so ac-row hangs it off the scroll position instead.
 * See the ac-row comment in globals.css for why these rows come up from .55
 * rather than the board's opacity 0 - a table that holds the placement list
 * must not be empty to something that renders the page without scrolling it.
 *
 * Prices come from src/config/pricing.ts, not from the board. The two agree
 * today; if they ever diverge, the config is the one that is also on the
 * pricing table and the package pages.
 */

const priceOf = (id: string) => TIERS.find((t) => t.id === id)?.priceLabel ?? "";

/**
 * What the price buys, read from pricing.ts the way Packages.tsx already reads
 * it rather than typed into the lead beside it.
 *
 * The tracking lead said "$99 covers 20 questions checked weekly", which is
 * two numbers this component already renders from config - the price is in the
 * same Step's header four lines up - typed a second time with nothing holding
 * them in step.
 */
const basisOf = (id: string) => TIERS.find((t) => t.id === id)?.priceBasis ?? "";

const pill = (bg: string, fg: string): React.CSSProperties => ({
  fontSize: "11px",
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: "999px",
  background: bg,
  color: fg,
  whiteSpace: "nowrap",
});

const LIVE = pill(T.goodBg, T.goodFg);
const SUBMITTED = pill(T.warnBg, T.warnFg);

const th: React.CSSProperties = { ...MICRO };
const cellNote = { fontSize: "13px", color: T.soft };

function Step({ n, tier, price, lead, body, dark }: {
  n: number;
  tier: TierKey;
  price: string;
  lead: string;
  body: string;
  dark?: boolean;
}) {
  return (
    <div className="board-head" style={{ ...GRID12, padding: dark ? 0 : "24px 26px 20px" }}>
      <div style={{ gridColumn: "span 4" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ ...MICRO, color: dark ? T.faint : T.soft }}>Step {n}</span>
          <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.022em", color: dark ? "#ffffff" : T.ink }}>
            <TierName tier={tier} />
          </span>
          {price ? <span style={{ fontSize: "13px", color: T.soft }}>{price}</span> : null}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: "14px", lineHeight: 1.6, color: dark ? T.faint : T.soft }}>{lead}</p>
      </div>
      <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.65, color: dark ? "#e8e8ea" : T.soft }}>
        {body}
      </p>
    </div>
  );
}

/**
 * The alwaystracked table: four of the homepage's worked questions, read off
 * the one registry that holds them.
 *
 * Typed here, this table read "Claude" under a column headed "Which engines"
 * long after Claude left the free pass - which is why the engine set became a
 * position into config/scan-shape.ts. The question's own result stayed typed,
 * and it was a second copy of what AnswerExplorer prints further up the same
 * page: three of these four rows named different engines there. See
 * config/worked-example.ts.
 */
const TRACKED: WorkedQuestionId[] = [
  "competitor-alternatives",
  "crm-b2b",
  "xero",
  "pm-creative",
];

const PLACEMENTS = [
  { url: "publication.example/best-pm-tools-2026", dr: "67", traffic: "25.9k", anchor: "project management software", status: "Live", tone: LIVE },
  { url: "tradetitle.example/best-for-creative-teams", dr: "54", traffic: "4.2k", anchor: "creative project management", status: "Live", tone: LIVE },
  { url: "blog.example/competitor-a-alternatives", dr: "45", traffic: "1.8k", anchor: "alternative to [Competitor A]", status: "Submitted", tone: SUBMITTED },
  { url: "reviewsite.example/xero-integrations", dr: "38", traffic: "1.1k", anchor: "xero invoicing integration", status: "Live", tone: LIVE },
];

const CHANNELS = [
  { name: "Paid media", note: "Search and social, against the same buying questions" },
  { name: "Content", note: "On the client site, aimed at what the placements point to" },
  { name: "Digital PR", note: "Earned coverage beyond the source pages" },
  { name: "CRO", note: "So the traffic the rest of it wins converts" },
  { name: "Tracking and analytics", note: "GA4 and dataLayer, set up properly" },
  { name: "Reporting", note: "One dashboard, your branding, every channel" },
];

const RAIL: TierKey[] = ["tracked", "mentioned", "cited", "everywhere"];

export default function TierJourney() {
  return (
    <section style={{ ...SHELL, marginTop: "44px" }}>
      <div className="board-head" style={{ ...GRID12 }}>
        <div style={{ gridColumn: "span 5" }}>
          <div style={MICRO}>How it builds</div>
          <h2 style={{ margin: "8px 0 0", fontSize: "27px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, color: T.ink }}>
            Four tiers, each one adding to the last
          </h2>
        </div>
        <p style={{ gridColumn: "span 7", margin: 0, fontSize: "14.5px", lineHeight: 1.65, color: T.soft }}>
          Start with measurement and stop there if you want. Everything above it is the same measurement plus the work
          that moves it. Nothing is a different product.
        </p>
      </div>

      {/* The rail. Anchors, not a player: every tier below is rendered in full. */}
      <nav aria-label="The four tiers" style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
        {RAIL.map((tier) => (
          <a
            key={tier}
            href={`#tier-${tier}`}
            style={{ flexGrow: 1, flexBasis: 0, textDecoration: "none", display: "block" }}
          >
            <span className="ac-grow" style={{ display: "block", height: "3px", borderRadius: "3px", background: T.line }} />
            <span style={{ display: "block", marginTop: "7px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.002em" }}>
              <TierName tier={tier} />
            </span>
          </a>
        ))}
      </nav>

      <div style={{ display: "flex", flexDirection: "column", gap: "30px", marginTop: "30px" }}>
        {/* 1. alwaystracked */}
        <div id="tier-tracked" style={{ ...CARD, overflow: "hidden", scrollMarginTop: "2rem" }}>
          <Step
            n={1}
            tier="tracked"
            price={priceOf("tracked")}
            lead={`You find out where you need to be. ${basisOf("tracked")}`}
            body="Your buying questions, as many as you want tracked across as many clusters, run across the engines every month. For each one: whether the brand gets named, which engines named it, the answer word for word, and every source it was assembled from - with what kind of publication each one is. That is the placement brief. You act on it yourself."
          />
          <div style={{ borderTop: `1px solid ${T.hair}` }}>
            <div className="tier-table tier-table--tracked" style={{ padding: "10px 26px", background: "#fbfbfc", borderBottom: `1px solid ${T.line}` }}>
              <div style={th}>Prompt</div>
              <div style={{ ...th, textAlign: "right" }}>Named</div>
              <div style={{ ...th, textAlign: "right" }}>AI Overview</div>
              <div style={th}>Which engines</div>
            </div>
            {TRACKED.map((id) => {
              const q = workedQuestion(id);
              return (
              <div key={id} className="tier-table tier-table--tracked ac-row" style={{ padding: "11px 26px", borderBottom: `1px solid ${T.hair}`, alignItems: "baseline" }}>
                <div style={{ fontSize: "13.5px", color: T.ink }}>{q.text}</div>
                <div style={{ fontSize: "13.5px", fontWeight: 600, textAlign: "right", color: T.ink }}>{namedOf(q.engines)}</div>
                <div style={{ ...cellNote, textAlign: "right" }}>{overviewLabel(q)}</div>
                <div style={cellNote}>{listOf(pickEngines(q.engines)) || "none"}</div>
              </div>
              );
            })}
            <p style={{ margin: 0, padding: "12px 26px", fontSize: "12.5px", color: T.soft }}>
              Example data. A real scan carries the verbatim answer and the full source list behind every row.
            </p>
          </div>
        </div>

        {/* 2. alwaysmentioned */}
        <div id="tier-mentioned" style={{ ...CARD, overflow: "hidden", scrollMarginTop: "2rem" }}>
          <Step
            n={2}
            tier="mentioned"
            price={priceOf("mentioned")}
            lead="We do the placing for you."
            body="Editorial placements on the pages the engines already read, and new pages written on third-party sites where the answer has no good source yet. Every one carries a link, so the same article that gets the brand named also passes authority to the page it points at."
          />
          <div style={{ borderTop: `1px solid ${T.hair}` }}>
            <div className="tier-table tier-table--placed" style={{ padding: "10px 26px", background: "#fbfbfc", borderBottom: `1px solid ${T.line}` }}>
              <div style={th}>Placed on</div>
              <div style={{ ...th, textAlign: "right" }}>DR</div>
              <div style={{ ...th, textAlign: "right" }}>Traffic</div>
              <div style={th}>Anchor</div>
              <div style={th}>Status</div>
            </div>
            {PLACEMENTS.map((r) => (
              <div key={r.url} className="tier-table tier-table--placed ac-row" style={{ padding: "11px 26px", borderBottom: `1px solid ${T.hair}`, alignItems: "baseline" }}>
                <div style={{ fontSize: "13px", color: T.ink, wordBreak: "break-word" }}>{r.url}</div>
                <div style={{ ...cellNote, textAlign: "right" }}>{r.dr}</div>
                <div style={{ ...cellNote, textAlign: "right" }}>{r.traffic}</div>
                <div style={cellNote}>{r.anchor}</div>
                <div><span style={r.tone}>{r.status}</span></div>
              </div>
            ))}
            <div style={{ padding: "14px 26px", background: T.wash, borderTop: `1px solid ${T.line}` }}>
              <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.6, color: T.ink }}>
                <strong style={{ fontWeight: 600 }}>This tier already moves Google.</strong> The links on these
                placements pass authority whether or not the engines cite the article. What it does not do is choose
                placements <em>for</em> the ranking - that is the next tier.
              </p>
            </div>
          </div>
        </div>

        {/* 3. alwayscited */}
        <div id="tier-cited" style={{ ...CARD, border: `1px solid ${T.accent}`, overflow: "hidden", scrollMarginTop: "2rem" }}>
          <Step
            n={3}
            tier="cited"
            price={priceOf("cited")}
            lead="Both measures, pushed together."
            body="Placements chosen because the page ranks for the money keyword and feeds the answer. Volume goes up, rank tracking comes in alongside the question set, and the two measures get reported on the same page. This is the part no AI tracking tool does, because it is a supply problem rather than a software one."
          />
          <div style={{ borderTop: `1px solid ${T.hair}`, padding: "22px 26px" }}>
            <div className="board-head" style={{ ...GRID12, marginBottom: "14px" }}>
              <h3 style={{ gridColumn: "span 4", margin: 0, fontSize: "15px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
                The same programme, two measures
              </h3>
              <p style={{ gridColumn: "span 8", margin: 0, fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
                Two charts rather than one. AI visibility is a share of answers; a Google position is a rank. They have
                different denominators, so they never share an axis - but they share a time axis, and that is where you
                see them move together.
              </p>
            </div>

            <div style={MICRO}>AI visibility, share of tracked answers naming the brand</div>
            <svg viewBox="0 0 1080 150" width="100%" height="150" style={{ display: "block", marginTop: "4px" }} role="img" aria-label="AI visibility rising from 0 to 39 percent between April and September, with a dip in August">
              <line x1="56" y1="130" x2="1050" y2="130" stroke={T.line} strokeWidth="1" />
              <line x1="56" y1="75" x2="1050" y2="75" stroke={T.hair} strokeWidth="1" />
              <line x1="56" y1="20" x2="1050" y2="20" stroke={T.hair} strokeWidth="1" />
              <text x="10" y="134" fontSize="11" fill={T.soft}>0%</text>
              <text x="10" y="79" fontSize="11" fill={T.soft}>25%</text>
              <text x="10" y="24" fontSize="11" fill={T.soft}>50%</text>
              <polyline className="chart-line" pathLength={1} points="56,130 250.8,112.4 445.6,83.8 640.4,42 835.2,55.2 1030,44.2" fill="none" stroke={T.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="56" cy="130" r="3.5" fill={T.accent} />
              <circle className="chart-dot" cx="640.4" cy="42" r="3.5" fill={T.accent} />
              <circle className="chart-dot" cx="1030" cy="44.2" r="3.5" fill={T.accent} />
              <text x="640.4" y="32" fontSize="11" fill={T.soft} textAnchor="middle">40%</text>
              <text x="1030" y="34" fontSize="11" fill={T.soft} textAnchor="end">39%</text>
            </svg>

            <div style={{ ...MICRO, marginTop: "16px" }}>Google position, focus keyword (1 is best)</div>
            <svg viewBox="0 0 1080 150" width="100%" height="150" style={{ display: "block", marginTop: "4px" }} role="img" aria-label="Google position improving from outside the top 100 to 12th between April and September">
              <line x1="56" y1="130" x2="1050" y2="130" stroke={T.line} strokeWidth="1" />
              <line x1="56" y1="75" x2="1050" y2="75" stroke={T.hair} strokeWidth="1" />
              <line x1="56" y1="20" x2="1050" y2="20" stroke={T.hair} strokeWidth="1" />
              <text x="10" y="134" fontSize="11" fill={T.soft}>100</text>
              <text x="10" y="79" fontSize="11" fill={T.soft}>50</text>
              <text x="10" y="24" fontSize="11" fill={T.soft}>1</text>
              <polyline className="chart-line" pathLength={1} points="56,130 250.8,105.6 445.6,67.8 640.4,46.7 835.2,36.7 1030,32.2" fill="none" stroke={T.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="56" cy="130" r="3.5" fill={T.ink} />
              <circle className="chart-dot" cx="1030" cy="32.2" r="3.5" fill={T.ink} />
              <text x="56" y="145" fontSize="11" fill={T.soft}>Apr</text>
              <text x="1030" y="145" fontSize="11" fill={T.soft} textAnchor="end">Sep</text>
              <text x="1030" y="24" fontSize="11" fill={T.ink} textAnchor="end">12th</text>
            </svg>

            <p style={{ margin: "14px 0 0", fontSize: "13px", lineHeight: 1.6, color: T.soft }}>
              Example data, drawn to the same rules as a client dashboard: the August dip is real decay as the placed
              articles age, not a reporting artefact. A gap longer than three weeks between readings would be drawn
              dashed.
            </p>
          </div>
        </div>

        {/* 4. alwayseverywhere */}
        <div
          id="tier-everywhere"
          className="on-dark"
          style={{ background: T.ink, borderRadius: "18px", border: `1px solid ${T.ink}`, padding: "26px", scrollMarginTop: "2rem" }}
        >
          <div className="board-head" style={GRID12}>
            <div style={{ gridColumn: "span 4" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ ...MICRO, color: T.faint }}>Step 4</span>
                <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.022em", color: "#ffffff" }}>
                  <TierName tier="everywhere" />
                </span>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: "14px", lineHeight: 1.6, color: T.faint }}>
                The whole channel set, across a portfolio.
              </p>
            </div>
            <div style={{ gridColumn: "span 8" }}>
              <p style={{ margin: "0 0 16px", fontSize: "14px", lineHeight: 1.65, color: "#e8e8ea" }}>
                For agencies handing over more than search. Everything above, plus the channels a client needs to be
                found and chosen, run under your name and priced on volume rather than per seat.
              </p>
              <div className="channel-grid">
                {CHANNELS.map((c) => (
                  <div key={c.name} className="ac-row" style={{ background: "#16181e", border: "1px solid #23262d", borderRadius: "12px", padding: "13px 15px" }}>
                    <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#ffffff" }}>{c.name}</div>
                    <div style={{ fontSize: "12.5px", color: T.faint, marginTop: "3px", lineHeight: 1.5 }}>{c.note}</div>
                  </div>
                ))}
              </div>
              <p className="sr-only">{TIER_PLAIN.everywhere} covers every channel listed above.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
