/**
 * The design tokens, from the canvas.
 *
 * These are exact and are not to be re-derived. They replace the older
 * navy/soft palette that the pre-redesign sections still use: ink is
 * #0f1115, not #0B1220, and the page ground is #f6f6f7, not #F8F7FF.
 *
 * Both palettes are in the tree while the homepage is rebuilt board by
 * board. New work uses these; a section still on the old `C` object has not
 * been rebuilt yet. The same values are mirrored as CSS custom properties in
 * globals.css for anything that needs them in a stylesheet.
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
