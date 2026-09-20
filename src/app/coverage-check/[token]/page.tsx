import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ReadingPoll from "@/components/coverage/ReadingPoll";
import { CARD, GRID12, H2, MICRO, SHELL, T } from "@/config/tokens";
import { readCampaign, type ReadingAnswer } from "@/lib/coverage/reading";
import { count, isAre } from "@/lib/plural";
import { ENGINE_SPECS } from "@/lib/scan/engines";

/**
 * A campaign reading, by its link.
 *
 * Not indexed. Every one of these is somebody's own campaign, with a client
 * brand and an uploaded coverage list on it.
 */
export const metadata: Metadata = {
  title: "Campaign benchmark",
  robots: { index: false, follow: false },
};

/**
 * The reading.
 *
 * Every number here is counted in `readCampaign` from stored rows, and none of
 * them is typed - including the engine count, which is the reading's own frozen
 * list rather than today's settings. A reading taken in March has to keep
 * describing the run that produced it, however the free scan's engine set moves
 * afterwards. `copy.test.mts` sweeps for a literal count in front of "engines"
 * across the tree, which is what stopped this page's parent advertising three
 * of them for a thing that returns four.
 *
 * Motion: the board's one beat, on the question list, which is the real content
 * here. Nothing loops and nothing important is hidden at rest.
 */

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

/**
 * One engine's verdict on one question.
 *
 * Three states, and the word is the signal. Colour is never the only way to
 * tell them apart - the same rule the tier names carry - so each chip names the
 * engine and says what it did, and would still read correctly in greyscale.
 *
 * "Did not answer" is its own state rather than being folded into "not named".
 * They are different findings: one is a measured absence of the brand from an
 * answer that exists, the other is an answer we never got, and a reading that
 * merged them would report the second as the first.
 */
function verdict(a: ReadingAnswer) {
  const label = ENGINE_SPECS[a.engine].label;
  if (!a.answered) return { label, word: "no answer", bg: T.chip, fg: T.soft };
  if (a.brandNamed) return { label, word: "named", bg: T.goodBg, fg: T.goodFg };
  return { label, word: "not named", bg: T.badBg, fg: T.badFg };
}

function dateOf(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default async function CampaignReadingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const data = await readCampaign(token);
  if (!data) notFound();

  const { campaign, reading, questions, sources, coverage, named, history } = data;
  const running = reading ? reading.status === "queued" || reading.status === "running" : true;
  const failed = reading?.status === "failed";
  const complete = reading?.status === "complete";

  const engineCount = reading?.engines.length ?? 0;
  const placedSources = sources.filter((s) => s.placed);

  /**
   * What the source list actually shows.
   *
   * The first real reading cited 111 distinct domains across 210 citations,
   * and 83 of those were cited exactly once. Printing all of them is honest and
   * unreadable - a PR lead scrolls past eighty single-citation rows looking for
   * their own coverage, which is the one thing they came for.
   *
   * So the cut is by weight, not by an arbitrary top-N: everything cited more
   * than once, plus every placed domain whatever its count, and the remainder
   * named as a number underneath. Nothing is hidden from a crawler that matters
   * - the tail is one citation each and the count of it is on the page - and a
   * placement can never fall off the list, which is the case where a cut would
   * have changed what the reading says.
   */
  const SHOW_BELOW = 2;
  const shown = sources.filter((s) => s.citations >= SHOW_BELOW || s.placed);
  const tail = sources.length - shown.length;

  return (
    <main
      style={{
        ...SHELL,
        paddingTop: "42px",
        paddingBottom: "44px",
        display: "flex",
        flexDirection: "column",
        gap: "26px",
      }}
    >
      {running && <ReadingPoll />}

      <div className="board-head" style={{ ...GRID12, alignItems: "start" }}>
        <div style={{ gridColumn: "span 8" }}>
          <div style={MICRO}>Campaign benchmark</div>
          <h1
            style={{
              margin: "10px 0 0",
              fontSize: "36px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.18,
              color: T.ink,
            }}
          >
            {campaign.brand}, on {campaign.topic}
          </h1>
          <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.65, color: T.soft, maxWidth: "62ch" }}>
            {campaign.domain} &middot; {campaign.market}
            {reading?.completedAt ? ` · read ${dateOf(reading.completedAt)}` : ""}
          </p>
        </div>

        <div style={{ ...CARD, gridColumn: "span 4", padding: "20px" }}>
          <div style={MICRO}>Where the brand stands</div>
          {complete ? (
            <>
              <div style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-0.03em", marginTop: "8px", color: T.ink }}>
                {named.count} of {named.of}
              </div>
              <p style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: 1.55, color: T.soft }}>
                answers named {campaign.brand}, across {count(questions.length, "question")} on{" "}
                {count(engineCount, "engine")}. A measured zero is a finding, not a blank.
              </p>
            </>
          ) : (
            <p style={{ margin: "8px 0 0", fontSize: "13px", lineHeight: 1.55, color: T.soft }}>
              The reading is not in yet. This page fills in on its own.
            </p>
          )}
        </div>
      </div>

      {running && (
        <div style={{ ...CARD, padding: "20px 24px", background: T.wash, borderColor: T.washLine }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: T.ink }}>Reading now</div>
          <p style={{ margin: "6px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
            {count(questions.length || 0, "question")} on {count(engineCount, "engine")}, and every source they cite.
            It takes a couple of minutes. The link is yours - it keeps working, so you can close this and come back.
          </p>
        </div>
      )}

      {failed && (
        <div style={{ ...CARD, padding: "20px 24px", background: T.badBg, borderColor: T.badLine }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: T.badFg }}>That reading stopped before it finished</div>
          <p style={{ margin: "6px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
            {/* The stored reason, verbatim. A benchmark that failed for a reason
                we can name and does not name it sends the reader to guess at
                their own campaign. */}
            {reading?.error ? reading.error : "We could not complete it."} Nothing was measured, so there is nothing
            here to read against. Running it again starts a fresh reading.
          </p>
          <Link
            href="/coverage-check"
            style={{ display: "inline-block", marginTop: "12px", fontSize: "14px", fontWeight: 600, color: T.accent, textDecoration: "none" }}
          >
            Run it again
          </Link>
        </div>
      )}

      {complete && (
        <section>
          <div className="board-head" style={{ ...GRID12, marginBottom: "14px" }}>
            <h2 style={{ ...H2, gridColumn: "span 4" }}>What each engine said</h2>
            <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
              The same {count(questions.length, "question")} will be asked again after the campaign, word for word, so
              the next reading is a comparison rather than another snapshot.
            </p>
          </div>

          <div style={{ ...CARD, overflow: "hidden", ["--ac-stagger" as string]: "0.07s" } as React.CSSProperties}>
            {questions.map((q, i) => (
              <div
                key={q.question}
                className="ac-row"
                style={{ padding: "16px 26px", borderTop: i ? `1px solid ${T.hair}` : undefined }}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "baseline", flexWrap: "wrap" }}>
                  <span className="ac-stamp" style={pill(T.chip, T.soft)}>
                    {q.kind}
                  </span>
                  <span style={{ fontSize: "14.5px", color: T.ink }}>{q.question}</span>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                  {q.answers.map((a) => {
                    const v = verdict(a);
                    return (
                      <span key={a.engine} style={pill(v.bg, v.fg)}>
                        {v.label}: {v.word}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {complete && (
        <section>
          <div className="board-head" style={{ ...GRID12, marginBottom: "14px" }}>
            <h2 style={{ ...H2, gridColumn: "span 4" }}>Which pages built those answers</h2>
            <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
              {coverage.uploaded > 0 ? (
                <>
                  {coverage.cited} of {count(coverage.uploaded, "domain")} you uploaded {isAre(coverage.cited)} among
                  them. A placement nothing cited is not a failed placement - it is one the engines have not read yet,
                  which is what the next reading measures.
                </>
              ) : (
                <>
                  No coverage list was uploaded with this campaign, so nothing here is marked as yours. Upload one on
                  the next reading and every source below is matched against it.
                </>
              )}
            </p>
          </div>

          <div style={{ ...CARD, overflow: "hidden" }}>
            {sources.length === 0 && (
              <p style={{ margin: 0, padding: "16px 26px", fontSize: "14px", color: T.soft }}>
                No engine cited a source on any of these answers. That is a measurement, not a gap in the report:
                every one of them answered from what it already held.
              </p>
            )}
            {shown.map((s, i) => (
              <div
                key={s.domain}
                style={{
                  padding: "12px 26px",
                  borderTop: i ? `1px solid ${T.hair}` : undefined,
                  display: "flex",
                  alignItems: "baseline",
                  gap: "12px",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "14px", color: T.ink }}>
                  {s.domain}
                  {s.placed && (
                    <span style={{ ...pill(T.goodBg, T.goodFg), marginLeft: "10px" }}>yours</span>
                  )}
                </span>
                <span style={{ fontSize: "12.5px", color: T.soft }}>
                  cited in {count(s.citations, "answer")}
                </span>
              </div>
            ))}
            {sources.length > 0 && (
              <p
                style={{
                  margin: 0,
                  padding: "13px 26px",
                  fontSize: "12.5px",
                  color: T.soft,
                  borderTop: `1px solid ${T.hair}`,
                }}
              >
                {/* One string rather than adjacent expressions. JSX collapses
                    the newline between two of them to a space, which put a
                    space in front of the full stop on the first reading that
                    had a tail. */}
                {`${count(sources.length, "source")} in all, ${placedSources.length} from your coverage` +
                  (tail > 0 ? `. ${tail} more cited once each, not listed.` : ".")}
                {placedSources.length > 0 && (
                  <>
                    {" "}
                    A source is matched on its domain, so a page on a large host - a networking site, a wire service -
                    counts as yours even when the page the engine cited is somebody else&apos;s.
                  </>
                )}
              </p>
            )}
          </div>

          {coverage.uncited.length > 0 && (
            <div style={{ ...CARD, marginTop: "14px", padding: "18px 24px" }}>
              <div style={MICRO}>Uploaded, not yet cited</div>
              <p style={{ margin: "8px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
                {coverage.uncited.join(", ")}
              </p>
            </div>
          )}
        </section>
      )}

      {history.length > 1 && (
        <section>
          <div className="board-head" style={{ ...GRID12, marginBottom: "14px" }}>
            <h2 style={{ ...H2, gridColumn: "span 4" }}>Every reading of this campaign</h2>
            <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
              Each one is kept as it was taken. A re-run writes a new reading and never edits an old one, which is what
              makes the first one worth having.
            </p>
          </div>
          <div style={{ ...CARD, overflow: "hidden" }}>
            {history.map((h, i) => (
              <div
                key={h.id}
                style={{
                  padding: "12px 26px",
                  borderTop: i ? `1px solid ${T.hair}` : undefined,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "14px", color: T.ink }}>
                  {h.takenAt ? dateOf(h.takenAt) : h.status}
                </span>
                <span style={{ fontSize: "12.5px", color: T.soft }}>
                  {h.answers ? `named in ${h.named} of ${h.answers} answers` : "no answers stored"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.65, color: T.soft }}>
        This is the free benchmark.{" "}
        <Link href="/#scan" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
          The full scan asks more
        </Link>{" "}
        - a generated question set across the whole category, the leaderboard, and where an article could be placed.
      </p>
    </main>
  );
}
