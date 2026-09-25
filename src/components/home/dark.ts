/**
 * The homepage hero's dark ground, from Main.dc.html (25 Sep 2026 read).
 *
 * The only dark surface of this size on the site, and the header sits on it
 * on `/` only. Every value is the board's and is written once, here, so the
 * palette census has one site per value rather than one per call site - the
 * header and the hero both read this file.
 *
 * Two of the board's greys are not used. `#6f7480` - the list numbers and the
 * "Illustrative" line - measures 3.99 on `ground`, under AA, so those take
 * `T.faint`, which tokens.ts already names as the text colour for dark
 * grounds (7.36 here). `#8b8b95` measures 5.54 and is kept.
 */
export const D = {
  ground: "#111218",
  field: "#1b1c23",
  fieldLine: "#2a2b33",
  card: "#17181f",
  cardLine: "#262730",
  bar: "#24252d",
  /** Nav links and the standfirst. 7.29 on ground. */
  muted: "#a1a1aa",
  /** The line under the field. 5.54 on ground. */
  quiet: "#8b8b95",
  /** Engine names on a card. 11.97 on card. */
  cardHead: "#d4d4d8",
  /** The lockup and h1 accent on dark - the value `.on-dark` already uses. */
  accent: "#a78bfa",
  caret: "#c4b5fd",
  missFg: "#fca5a5",
  missBg: "rgba(239,68,68,.14)",
} as const;

/**
 * The two purple washes. Sized to the board's 1040px hero box so the header
 * (position 0 0) and the hero under it (position 0 -HEADER_H) paint one
 * continuous wash across the seam between them.
 */
export const WASH =
  "radial-gradient(700px 500px at 12% 8%, rgba(124,58,237,.22), rgba(17,18,24,0) 70%), " +
  "radial-gradient(600px 460px at 92% 78%, rgba(124,58,237,.16), rgba(17,18,24,0) 70%)";
export const WASH_SIZE = "100% 1040px";
/** The header's height on the dark ground: 14px padding, a 38px button, 14px. */
export const HEADER_H = 66;
