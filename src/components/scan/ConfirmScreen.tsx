"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { QUESTIONS } from "@/config/scan-shape";
import { CARD, MICRO, T } from "@/config/tokens";
import type { Market } from "@/lib/scan";

/**
 * Step 1: what we read off the site, and what we are about to ask.
 *
 * Built from Flow1Confirm.dc.html. The argument of the screen is in its own
 * heading - get the category wrong and every question built on it is wrong,
 * and nobody tells you unless they are asked. So the questions are written
 * and shown BEFORE anything is paid for, and a whole cluster goes with one tap.
 *
 * Nothing here is illustrative. These are the questions this scan will run:
 * the set that comes back from the preview is the set stored at confirm, and
 * the pipeline asks what it finds rather than writing its own.
 */

export type PreviewQuestion = { question: string; kind: string; cluster: string };

/** Our own question kinds, sentence case. The board column is illustrative. */
const INTENT: Record<string, string> = {
  category: "Category",
  positioning: "Positioning",
  sector: "Sector",
  outcome: "Outcome",
  comparison: "Comparison",
  custom: "Yours",
};

/**
 * The cap this screen enforces, and the one the server enforces, are the same
 * number and now come from the same place.
 *
 * /api/scan/[token]/confirm stops at QUESTION_COUNT - `if (out.length >=
 * QUESTION_COUNT) break` - and drops the rest without a word, because the cap
 * has to be enforced where the money is spent rather than trusted from here.
 * A 14 typed on this line is a second copy of that number with nothing holding
 * it in step: lower QUESTIONS and this screen still offers fourteen, still
 * prints "14 of a possible 14" under the button, and the server silently
 * discards the overflow the visitor was just told they could keep.
 */
const MAX_QUESTIONS = QUESTIONS;

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "14px",
  color: T.ink,
  background: T.surface,
  border: "1px solid " + T.line,
  borderRadius: "10px",
  padding: "11px 13px",
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: T.ink,
  margin: "12px 0 6px",
};

const chipBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "9px",
  borderRadius: "999px",
  padding: "9px 16px",
  fontSize: "14px",
  fontFamily: "inherit",
};

const rowInput: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "13.5px",
  color: T.ink,
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: "8px",
  padding: "4px 6px",
  margin: "-4px -6px",
};

const quietBtn: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: "13px",
  lineHeight: 1,
  color: T.soft,
  background: "none",
  border: 0,
  cursor: "pointer",
  padding: "4px 6px",
};

export default function ConfirmScreen(p: {
  token: string;
  domain: string;
  brand: string | null;
  positioning: string | null;
  initialTopic: string;
  initialMarket: Market;
  variants: string[];
  /** Returns a message when the run could not be started, null when it could. */
  onRun: (input: {
    topic: string;
    market: Market;
    questions: { question: string; kind: string }[];
  }) => Promise<string | null>;
  running: boolean;
}) {
  const [topic, setTopic] = useState(p.initialTopic);
  const [market, setMarket] = useState<Market>(p.initialMarket);

  const [questions, setQuestions] = useState<PreviewQuestion[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);
  const [dropped, setDropped] = useState<Set<string>>(new Set());

  /**
   * True from the first paint when there is a category to work from, because
   * that is when the request is about to fire. Starting at false rendered
   * "tell us the category above" for one frame under a field that already had
   * one, which is the wrong thing to say to somebody who is waiting.
   */
  const [writing, setWriting] = useState(p.initialTopic.trim().length >= 2);
  const [error, setError] = useState("");
  /** The topic and market the set on screen was written for. */
  const [writtenFor, setWrittenFor] = useState<{ topic: string; market: Market } | null>(null);

  const lastRef = useRef<HTMLInputElement | null>(null);
  const focusLast = useRef(false);

  const write = useCallback(
    async (forTopic: string, forMarket: Market) => {
      setWriting(true);
      setError("");
      try {
        const headers = new Headers();
        headers.set("content-type", "application/json");
        const res = await fetch("/api/scan/" + p.token + "/questions", {
          method: "POST",
          headers,
          body: JSON.stringify({ topic: forTopic, market: forMarket, topic_variants: p.variants }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message ?? "We could not write the questions just now. Try again.");
          return;
        }
        setQuestions(data.questions ?? []);
        setClusters(data.clusters ?? []);
        setDropped(new Set());
        setWrittenFor({ topic: forTopic, market: forMarket });
      } catch {
        setError("We could not reach the checker. Try again.");
      } finally {
        setWriting(false);
      }
    },
    [p.token, p.variants],
  );

  /**
   * Written once, on arrival, when the site gave us a category to work from.
   * A site that did not is left with an empty field rather than a guess, so
   * there is nothing to write yet.
   *
   * On the disable below, because this was the last lint error in the project
   * and it is worth saying why it is not a defect rather than leaving it to be
   * re-litigated every run.
   *
   * react-hooks/set-state-in-effect is aimed at cascading renders: an effect
   * that sets state, causing a render, causing the effect again. That cannot
   * happen here, and it is provable rather than argued. `write` opens with
   * setWriting(true) and setError(""), and on the only path this effect takes:
   *
   * - `writing` is initialised to `p.initialTopic.trim().length >= 2`, which
   *   is the same condition guarding the call. So it is already true.
   * - `error` is initialised to "", which is what it is set to.
   *
   * Both are therefore no-op sets, and React bails out of re-rendering when
   * setState is given the value it already holds. The rule flags it because it
   * cannot see the coupling between the useState initialiser twenty lines up
   * and the guard on this line - and that coupling is deliberate, written to
   * stop the screen saying "tell us the category above" for one frame under a
   * field that already had one.
   *
   * The run-once ref is the other half: the effect re-runs when `write` is
   * rebuilt, and without the guard a second request would fire mid-typing.
   *
   * Restructuring to satisfy the rule - deferring the call into a microtask,
   * say - would add a frame of nothing on the first screen of the funnel to
   * silence a warning about a render that does not occur. Narrowed to this one
   * line so the rule stays live everywhere else.
   */
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above: both sets are no-ops on this path
    if (p.initialTopic.trim().length >= 2) void write(p.initialTopic, p.initialMarket);
  }, [p.initialTopic, p.initialMarket, write]);

  useEffect(() => {
    if (focusLast.current && lastRef.current) {
      lastRef.current.focus();
      focusLast.current = false;
    }
  });

  const stale = Boolean(writtenFor && (writtenFor.topic.trim() !== topic.trim() || writtenFor.market !== market));
  /**
   * A cluster chip governs the questions we wrote, and nothing else.
   *
   * A question the visitor adds is stamped with the current category as its
   * cluster, so dropping that cluster silently took their own question out of
   * the run with it: typed into the table, counted in no total, and never
   * asked. Nothing on the screen said so - the row sat there at full opacity
   * while the footer count ignored it.
   *
   * Their questions are theirs. The chip is a way of dropping a batch we
   * guessed at, so it applies to the rows it guessed and leaves the rest.
   */
  const isOwn = (q: PreviewQuestion) => q.kind === "custom";
  const kept = questions.filter((q) => (isOwn(q) || !dropped.has(q.cluster)) && q.question.trim().length >= 4);
  const keptClusters = new Set(kept.map((q) => q.cluster));
  /**
   * Counted off what would actually run, not off the rows on screen. The
   * footer says "N of a possible 14" from `kept`, so a visitor who dropped a
   * cluster read "10 of a possible 14" under a button that refused an
   * eleventh, because the four dropped rows were still being counted against
   * the limit the sentence had just told them they were under.
   */
  const atMax = kept.length >= MAX_QUESTIONS;
  const needsWriting = stale || !writtenFor;
  const canAct = topic.trim().length >= 2 && !writing && !p.running && (needsWriting || kept.length > 0);

  async function run() {
    if (!kept.length) return;
    const message = await p.onRun({
      topic: topic.trim(),
      market,
      questions: kept.map((q) => ({ question: q.question.trim(), kind: q.kind })),
    });
    if (message) setError(message);
  }

  /**
   * Run without the preview.
   *
   * The set is written by a model call, and a model call can be down. Without
   * this, a visitor whose preview failed twice has no way to run a scan at
   * all - which is worse than running one they did not get to prune. Sending
   * no questions is what the pipeline already handles: it writes its own set,
   * exactly as it did before this screen existed.
   */
  async function runBlind() {
    const message = await p.onRun({ topic: topic.trim(), market, questions: [] });
    if (message) setError(message);
  }

  function toggle(cluster: string) {
    setDropped((prev) => {
      const next = new Set(prev);
      if (next.has(cluster)) next.delete(cluster);
      else next.add(cluster);
      return next;
    });
  }

  function edit(index: number, text: string) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, question: text } : q)));
  }

  function remove(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function add() {
    focusLast.current = true;
    setQuestions((prev) => [...prev, { question: "", kind: "custom", cluster: topic.trim() }]);
  }

  const primaryLabel = p.running
    ? "Starting"
    : writing
      ? "Writing the questions"
      : needsWriting
        ? "Write the questions"
        : "Run " + kept.length + (kept.length === 1 ? " question" : " questions");

  const footerText =
    kept.length +
    " of a possible " +
    MAX_QUESTIONS +
    ", across " +
    keptClusters.size +
    (keptClusters.size === 1 ? " cluster" : " clusters") +
    ". No search volume against them, deliberately - ";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
      <div className="confirm-top">
        <div>
          <div style={MICRO}>{p.domain}</div>
          <h1
            style={{
              margin: "10px 0 0",
              fontSize: "32px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              color: T.ink,
            }}
          >
            This is what we read off the site. Correct it before we run.
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: "14.5px", lineHeight: 1.65, color: T.soft, maxWidth: "62ch" }}>
            The questions come from what the site says it sells. If the category is wrong, everything after it is
            wrong too - so it is worth ten seconds now.
          </p>
          {p.positioning ? (
            <p style={{ margin: "12px 0 0", fontSize: "13px", lineHeight: 1.6, color: T.soft, maxWidth: "62ch" }}>
              From the site: {p.positioning}
            </p>
          ) : null}
        </div>

        <div style={{ ...CARD, padding: "22px", alignSelf: "start" }}>
          <div style={MICRO}>What we think you sell</div>
          <label htmlFor="confirm-category" style={fieldLabel}>
            Category
          </label>
          <input
            id="confirm-category"
            type="text"
            value={topic}
            placeholder="b2b seo agency"
            onChange={(e) => setTopic(e.target.value)}
            style={fieldStyle}
          />
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={fieldLabel}>Market</legend>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["UK", "US"] as Market[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMarket(m)}
                  aria-pressed={market === m}
                  style={{
                    flex: 1,
                    fontFamily: "inherit",
                    fontSize: "14px",
                    fontWeight: 600,
                    padding: "11px 13px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    color: market === m ? T.surface : T.ink,
                    background: market === m ? T.accent : T.surface,
                    border: "1px solid " + (market === m ? T.accent : T.line),
                  }}
                >
                  {m === "UK" ? "United Kingdom" : "United States"}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            className="btn-primary"
            onClick={() => (needsWriting ? void write(topic.trim(), market) : void run())}
            disabled={!canAct}
            style={{
              width: "100%",
              marginTop: "16px",
              fontFamily: "inherit",
              fontSize: "15px",
              fontWeight: 600,
              border: 0,
              borderRadius: "10px",
              padding: "13px 20px",
              cursor: canAct ? "pointer" : "default",
            }}
          >
            {primaryLabel}
          </button>
          <p style={{ margin: "10px 0 0", fontSize: "12.5px", color: T.soft }}>
            No email needed to start. The result is free in full - we ask for one only to open the placement list.
          </p>
          {error ? (
            <p role="alert" style={{ margin: "10px 0 0", fontSize: "12.5px", color: T.badFg }}>
              {error}
            </p>
          ) : null}
          {error && !writtenFor && topic.trim().length >= 2 ? (
            <button
              type="button"
              onClick={() => void runBlind()}
              disabled={p.running}
              style={{
                marginTop: "8px",
                padding: 0,
                fontFamily: "inherit",
                fontSize: "12.5px",
                fontWeight: 600,
                color: T.accent,
                background: "none",
                border: 0,
                cursor: "pointer",
              }}
            >
              Run it anyway, and we will write the questions as it goes
            </button>
          ) : null}
        </div>
      </div>

      {clusters.length > 0 ? (
        <section>
          <div className="board-head confirm-head" style={{ marginBottom: "14px" }}>
            <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
              Which clusters matter to you
            </h2>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
              Keep the ones you care about and drop the rest - the question count comes down with them. We would
              rather run six good questions on one cluster than fourteen variations of the same thing.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {clusters.map((c) => {
              const n = questions.filter((q) => !isOwn(q) && q.cluster === c).length;
              const on = !dropped.has(c) && n > 0;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c)}
                  aria-pressed={on}
                  disabled={n === 0}
                  style={{
                    ...chipBase,
                    cursor: n === 0 ? "default" : "pointer",
                    background: on ? T.wash : T.surface,
                    border: "1px solid " + (on ? T.accent : T.line),
                    color: on ? T.ink : T.soft,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{c}</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "1px 8px",
                      borderRadius: "999px",
                      background: on ? T.surface : T.chip,
                      color: on ? T.accent : T.soft,
                    }}
                  >
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <div className="board-head confirm-head" style={{ marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
            Your buying questions
          </h2>
          <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Written as a buyer would type them, not as keywords, and aimed at the end of the decision rather than
            the top of it. Edit any of them, swap one out, or add your own. A free scan runs up to 14.
          </p>
        </div>

        <div style={{ ...CARD, overflow: "hidden", opacity: stale ? 0.55 : 1 }}>
          <div className="q-row q-head" style={{ background: "#fbfbfc", borderBottom: "1px solid " + T.line }}>
            <div style={MICRO}>#</div>
            <div style={MICRO}>Question</div>
            <div style={MICRO}>Cluster</div>
            <div style={MICRO}>Intent</div>
            <div />
          </div>

          {questions.length === 0 ? (
            <p style={{ margin: 0, padding: "18px 26px", fontSize: "13.5px", color: T.soft }}>
              {writing
                ? "Writing the questions a buyer in this category would type. It takes a few seconds."
                : "Tell us the category above and we will write the questions before anything runs."}
            </p>
          ) : null}

          {questions.map((q, i) => {
            const off = !isOwn(q) && dropped.has(q.cluster);
            /**
             * Not in `kept` is not the same as dropped.
             *
             * indexOf returns -1, and -1 + 1 is 0, so a question the visitor
             * had just added numbered itself 0 until the first character was
             * typed into it - a blank row fails the length test in `kept`. A
             * dropped cluster draws a dash, which is a state; a row that is
             * simply not counted yet draws nothing.
             */
            const at = kept.indexOf(q);
            const position = at >= 0 ? at + 1 : "";
            const rowLabel = "Question " + (i + 1);
            const removeLabel = "Remove question " + (i + 1);
            return (
              <div key={i} className="q-row" style={{ borderBottom: "1px solid " + T.hair, opacity: off ? 0.4 : 1 }}>
                <div style={{ fontSize: "13px", color: T.soft }}>{off ? "-" : position}</div>
                <div>
                  <input
                    ref={i === questions.length - 1 ? lastRef : undefined}
                    type="text"
                    value={q.question}
                    onChange={(e) => edit(i, e.target.value)}
                    aria-label={rowLabel}
                    placeholder="the question a buyer would type"
                    maxLength={200}
                    style={rowInput}
                  />
                </div>
                <div style={{ fontSize: "12.5px", color: T.soft }}>{q.cluster}</div>
                <div style={MICRO}>{INTENT[q.kind] ?? INTENT.custom}</div>
                <div style={{ textAlign: "right" }}>
                  <button type="button" onClick={() => remove(i)} aria-label={removeLabel} style={quietBtn}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          <div style={{ padding: "12px 26px", display: "flex", alignItems: "baseline", gap: "14px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", color: T.soft }}>
              {footerText}
              <Link href="/#faq" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
                here is why
              </Link>
              .
            </span>
            <div style={{ flexGrow: 1 }} />
            <button
              type="button"
              onClick={add}
              disabled={atMax}
              style={{
                fontFamily: "inherit",
                fontSize: "13px",
                fontWeight: 600,
                color: atMax ? T.faint : T.accent,
                background: "none",
                border: 0,
                cursor: atMax ? "default" : "pointer",
                padding: 0,
              }}
            >
              Add a question
            </button>
          </div>
        </div>

        {stale ? (
          <p style={{ margin: "10px 0 0", fontSize: "13px", color: T.warnFg }}>
            These were written for a different category. Rewrite them before you run.
          </p>
        ) : null}
      </section>
    </div>
  );
}
