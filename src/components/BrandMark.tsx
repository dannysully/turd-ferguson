/**
 * The alwayscited brand mark: a six-point asterisk in brand purple.
 *
 * Geometry is the Nomada Digital asterisk - three round-capped lines crossing
 * at the centre, 60 degrees apart, stroke width 0.39 of the arm length -
 * recoloured from Nomada blue to the alwayscited purple gradient.
 *
 * The rotation lives in globals.css (.brand-mark__ast) so it can be disabled
 * under prefers-reduced-motion and sped up on hover of a .brand-lockup parent.
 *
 * `id` must be unique per rendered instance: SVG gradient ids are global to the
 * document, so two marks sharing one id would collide.
 */
export default function BrandMark({ id, size = 32 }: { id: string; size?: number }) {
  const gradientId = `brandMarkGrad-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="brand-mark"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        {/* userSpaceOnUse so all three arms share one continuous gradient
            rather than each line restarting it across its own bounding box. */}
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="6" y1="4.5" x2="26" y2="27.5">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <g className="brand-mark__ast" stroke={`url(#${gradientId})`} strokeWidth="4.5" strokeLinecap="round">
        <line x1="16" y1="4.5" x2="16" y2="27.5" />
        <line x1="6.041" y1="10.25" x2="25.959" y2="21.75" />
        <line x1="25.959" y1="10.25" x2="6.041" y2="21.75" />
      </g>
    </svg>
  );
}
