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

/**
 * Class and travel for the listing row that climbs, from `from` to `to`.
 *
 * `SerpPanel` says in its own comment that the climb distance is
 * (places moved x the height of one result), "so the motion cannot claim more
 * movement than the numbers do". Nothing enforced that. It read
 * `p.from - p.to === 5 ? "seq-climb5" : "seq-climb4"` against a two-rung
 * ladder, which is right for the two panels on the board and silently wrong
 * for any third: every journey that is not five places took the four-place
 * rung and travelled 192px regardless. A 2-place climb would have shown twice
 * the movement the numbers support, and over-claiming is the one direction
 * that comment cares about.
 *
 * This is `f559df3` reached from the other side. That one was a stagger ladder
 * running out of rungs and flattening its tail; this is a distance ladder with
 * two rungs and no tail at all. Both read perfectly well in the markup, and
 * both are on the one board whose classes exist only during a live scan - so
 * the cascade and this module are the only witnesses there are.
 *
 * The travel is now computed: `.seq-climb` reads `--ac-places` and multiplies
 * by the one-result height, so there is no rung to pick wrongly. For the two
 * panels that exist today - 10 to 5 and 5 to 1 - this renders frame for frame
 * as the two keyframes did.
 */
export function seqClimb(from: number, to: number, style?: CSSProperties): { className: string; style: CSSProperties } {
  // A row that did not move travels nothing rather than falling back to a rung.
  const places = Math.max(Math.trunc(from) - Math.trunc(to), 0);
  return {
    className: "seq-climb",
    style: { ...style, ["--ac-places" as string]: places } as CSSProperties,
  };
}
