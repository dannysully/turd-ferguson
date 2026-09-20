import type { CSSProperties } from "react";

/**
 * The waiting sequence's stagger, for the acts that map a list.
 *
 * In its own module rather than in `HeroSequence.tsx` for the reason
 * `motion-script.ts` is: `node --test` cannot load a `.tsx`, so anything left
 * inside one is untestable, and this is a piece of motion nobody has ever
 * watched in a browser.
 *
 * This used to hand back a rung of the `.seq-in` .. `.seq-in5` ladder, indexed
 * by list position and clamped to five so it could not emit a class no rule
 * matches. The clamp was correct and it was not enough: a clamped stagger gives
 * every row past the fifth the same beat, so the tail of a longer list arrives
 * together while the head staggers. That is invisible in the markup - the class
 * name reads perfectly well - and it is the same species as the two defects
 * `9f64c63` and `bcf799a` were about.
 *
 * `QUESTION_ROWS` is five rows long, which is exactly the ladder depth, so the
 * next row anybody adds to it is the one that flattens. Rather than leave that
 * for someone to find in a browser nobody has, the delay is computed from the
 * index: `.seq-step` reads `--ac-i` and there is no rung to run out of.
 *
 * `n * .10s` is the ladder's own spacing, so for every list on the board today
 * this renders frame for frame as the rungs did. The ladder rules stay in
 * `globals.css` because the acts also use them as fixed choreography, where
 * `.seq-in3` means the third beat of this act rather than the third item of a
 * list. Those are hand-written on single elements and have no index to run out.
 */

/**
 * Class and index for list position `n`, spread onto the element.
 *
 * Takes the element's own style rather than returning a bare class, because the
 * index has to travel as a custom property on the same element and every call
 * site already had a `style` of its own to merge it into.
 */
export function seqStep(n: number, style?: CSSProperties): { className: string; style: CSSProperties } {
  return {
    className: "seq-step",
    // Spread first: a caller's own `--ac-i` would be a mistake, and the index
    // this function was given is the one thing it is responsible for.
    style: { ...style, ["--ac-i" as string]: Math.max(Math.trunc(n), 0) } as CSSProperties,
  };
}
