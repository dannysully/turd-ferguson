/**
 * The waiting sequence's stagger ladder.
 *
 * In its own module rather than in `HeroSequence.tsx` for the reason
 * `motion-script.ts` is: `node --test` cannot load a `.tsx`, so anything left
 * inside one is untestable, and this is a piece of motion nobody has ever
 * watched in a browser.
 *
 * The ladder is `.seq-in` through `.seq-in5` in `globals.css` - five rungs,
 * .00s to .40s. Callers index it by list position, which is what makes the
 * clamp necessary: an eight-row list indexing it directly emitted `.seq-in6`,
 * `.seq-in7` and `.seq-in8`, none of which any rule matches. The tail of the
 * list then arrived with no animation while the head staggered.
 *
 * A stagger that runs out and lets the tail share the last beat is a stagger.
 * A stagger with a hole in it is the defect `bcf799a` was about, and it is
 * invisible from the markup - the class name looks perfectly reasonable.
 */

/** Rungs that exist in globals.css. Raising this means adding rules there. */
export const SEQ_LADDER = 5;

/** The ladder class for list position `n`, clamped to a rung that exists. */
export function seqIn(n: number): string {
  const rung = Math.min(Math.max(n, 0) + 1, SEQ_LADDER);
  return "seq-in" + (rung > 1 ? rung : "");
}
