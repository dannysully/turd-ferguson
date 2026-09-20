/**
 * The design tokens, from the canvas.
 *
 * These are exact and are not to be re-derived. They replaced the older
 * navy/soft palette: ink is #0f1115, not #0B1220, and the page ground is
 * #f6f6f7, not #F8F7FF.
 *
 * No file defines the old values any more - the `C` object on the ops page is
 * a set of named aliases onto these, kept so forty call sites did not have to
 * be rewritten to prove a point about spelling. The same values are mirrored
 * as CSS custom properties in globals.css for anything that needs them in a
 * stylesheet.
 *
 * **This used to open "There is one palette now, and this is it", and that was
 * false.** Measured 20 September 2026 by `palette.test.mts`, which was written
 * for it: fifteen hex values and six `rgba()` values are written outside this
 * file, at 47 sites. Ten of the fifteen are drawn by between two and 23 of the
 * artboards in `docs/design/` - they are palette members that never got a name
 * here, not typos. Two are drawn by no board at all, and both sit in the only
 * two files no page sweep can reach: the transactional email, which is not a
 * page, and the ops page, which answers 401.
 *
 * The sentence was not inert. The clause after it - the `C` object being pure
 * aliases - is true, and it is offered as the evidence for the sentence; the
 * file it points at carries eight of the off-palette values one line from that
 * object. A true clause joined to a false one is what makes a sentence read as
 * settled, and nothing here could have told you, because `contrast.test.mts`
 * asks whether a colour is readable on its ground rather than whether it is
 * one of these. A hand-typed hex that clears AA is invisible to it - which is
 * exactly how `#f6f6f8` and `#eceef2` reached production through the sweep
 * that was meant to end the old palette (`verify-email.ts` records both).
 *
 * `palette.test.mts` is the denominator this file did not have. Whether the
 * ten board values should become tokens here is a design-system call and is
 * blocked.md 33; until it is answered they are recorded there with the board
 * that draws each one, and a sixteenth cannot be typed without failing.
 */
export const T = {
  bg: "#f6f6f7",
  surface: "#ffffff",
  chip: "#f4f4f6",
  hair: "#f2f2f4",
  line: "#ececee",
  wash: "#f4f0fe",
  washLine: "#e3d8fd",
  ink: "#0f1115",
  soft: "#6f7480",
  /**
   * Not for text on a light ground. Measured against the boards own grounds,
   * faint is 2.54 on #ffffff and 2.35 on #f6f6f7, against the 4.5 AA asks for
   * body text - roughly half. It was carrying prose in 19 files, including
   * four footnotes on /legal and the methodology line under the homepage
   * chart.
   *
   * The value is unchanged, because the boards drew it and tokens here are
   * exact. What changed is what may use it: rules, dividers, non-text marks,
   * genuinely disabled controls, and text on the dark grounds - where it is
   * the right choice at 7.44 on #0f1115 and soft would be a worse 4.04.
   * Light-ground text uses soft.
   */
  faint: "#9ca3af",
  accent: "#7C3AED",
  accentHover: "#6D28D9",
  goodFg: "#0f7b45",
  goodBg: "#edf6f1",
  warnFg: "#c96a15",
  warnBg: "#fbf1e6",
  badFg: "#b3372f",
  badBg: "#faeceb",
  badLine: "#f3d6d3",
} as const;

/** The container every board shares. */
export const SHELL: React.CSSProperties = {
  maxWidth: "1180px",
  width: "100%",
  margin: "0 auto",
  padding: "0 24px",
  boxSizing: "border-box",
};

/** 12 columns, 24px gutter. Used for every section heading and description. */
export const GRID12: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  columnGap: "24px",
  alignItems: "baseline",
};

/** Micro-label: 12px, 600, sentence case. Never uppercase. */
export const MICRO: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.002em",
  color: T.soft,
};

export const H2: React.CSSProperties = {
  margin: 0,
  fontSize: "19px",
  fontWeight: 700,
  letterSpacing: "-0.022em",
  color: T.ink,
};

export const CARD: React.CSSProperties = {
  background: T.surface,
  border: `1px solid ${T.line}`,
  borderRadius: "18px",
};
