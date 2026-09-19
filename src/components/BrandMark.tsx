import { T } from "@/config/tokens";

/**
 * The alwayscited brand mark: a six-point asterisk in brand purple.
 *
 * Geometry is the Nomada Digital asterisk - three round-capped lines crossing
 * at the centre, 60 degrees apart, stroke width 0.39 of the arm length -
 * recoloured from Nomada blue to the alwayscited accent.
 *
 * Solid, not a gradient. The boards draw this mark with a single accent
 * stroke, and the design rules allow one gradient per page at most - spending
 * it on the logo, on every page, is not where it earns anything.
 *
 * Static. It used to rotate on a loop; the boards draw it plain, and the one
 * beat this page gets belongs to the charts, not to the chrome.
 *
 * Sizing follows the Nomada lockup, where the asterisk's ink is about 1.15x
 * the wordmark's ascender height - an accent beside the word, not a badge in
 * front of it. The ink fills 86% of this box, so a `size` roughly equal to the
 * wordmark's font-size lands on that ratio. Going much larger is what makes it
 * read as a logo tile.
 *
 * `id` is still accepted so call sites do not all have to change, but nothing
 * reads it now that the gradient is gone. The `brand-mark` and
 * `brand-mark__ast` class hooks went the same way: they existed only for the
 * rotation keyframes, which 7224dcf removed, and they had carried no style
 * since. Everything here is inline.
 */
export default function BrandMark({ size = 18 }: { id: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <g stroke={T.accent} strokeWidth="4.5" strokeLinecap="round">
        <line x1="16" y1="4.5" x2="16" y2="27.5" />
        <line x1="6.041" y1="10.25" x2="25.959" y2="21.75" />
        <line x1="25.959" y1="10.25" x2="6.041" y2="21.75" />
      </g>
    </svg>
  );
}
