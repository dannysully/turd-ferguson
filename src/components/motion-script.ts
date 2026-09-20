/**
 * The entrance trigger.
 *
 * What shipped before was `animation-timeline: view()`, which is elegant - no
 * JavaScript at all - but it computes as `duration: auto, timing-function:
 * linear`, so the boards' `.45s ease-out` and `1s cubic-bezier(.2,.7,.3,1)`
 * could not be written down and the motion followed the scrollbar rather than
 * playing at its own pace. Danny's instruction on 20 Sep was the boards'
 * timing, which means seconds, which means a class added once.
 *
 * Reverting to plain on-load animations was the other option and it is wrong:
 * a static artboard has no scroll, so "on load" is what the board can express
 * rather than what it means, and taken literally every section below the fold
 * would play before anyone saw it. So: the board's durations and easings,
 * started when the element first enters view.
 *
 * Four properties this has to keep, all of which the view() version had:
 *
 * 1. Nothing important is hidden at rest. Every from-state in globals.css is
 *    scoped to `html[data-motion="on"]`, and that attribute is only ever set
 *    by this script. No JavaScript, no from-state - a crawler that does not
 *    run us finds the settled page, which on an AI visibility product is the
 *    property that matters most on the site.
 * 2. prefers-reduced-motion skips straight to settled. Checked here, before
 *    the attribute is set, so the whole system stays off rather than being
 *    switched off rule by rule.
 * 3. No IntersectionObserver, no attribute. Same settled fallback as 1.
 * 4. Once per element. Each target is unobserved the moment it fires, so
 *    scrolling back up never replays anything.
 *
 * It runs as an inline script rather than an effect in a client component on
 * purpose: the attribute has to be set before first paint or the page paints
 * settled and then jumps back to the from-state, and it has to work whether
 * or not hydration ever completes. Being plain DOM code also means a client
 * navigation is handled by the same MutationObserver as any other insertion.
 *
 * The stagger is assigned here rather than in the markup. `--ac-i` is the
 * element's index among its `.ac-row` siblings, so the delay comes out of the
 * document's own structure and no component has to count its rows. Capped at
 * eight because the boards stagger short groups, and a twenty-row table with
 * an uncapped .09s would still be arriving two seconds in.
 *
 * The cap is a ceiling on a ladder, which on this site is a defect species
 * rather than a one-off - so both halves of it are checked. `motion-script.
 * test.mts` pins the mechanism, and it also measures every `.ac-row` group in
 * the prerendered build against this number: past nine rows the tail shares a
 * beat, which reads as perfectly correct in the markup. The homepage's largest
 * group is eight. If you raise or lower the cap here, that test reads the new
 * value out of this string and needs no edit; if a group outgrows it, the test
 * names the page.
 *
 * ## Siblings that are displayed, not siblings that exist
 *
 * The count skips any `.ac-row` whose computed `display` is `none`, and the
 * hero is why. This site carries responsive pairs - a `phone-only` paragraph
 * and a `desktop-only` one, both `.ac-row`, both always in the DOM, one of them
 * hidden at any given width. Counting siblings that exist gave the hidden twin
 * an index anyway, so it held a slot nothing ever animated into:
 *
 *     idx 0  .00s  phone-only label      showing
 *     idx 1  .09s  h1
 *     idx 2   --   desktop-only para     display:none, holds a slot
 *     idx 3  .27s  the call to action
 *
 * A visible run of .00, .09, .27, .36 - one .18s step inside a run of .09s,
 * immediately before the call to action, in the first group anyone sees. The
 * cloud session measured that on the real DOM at 750px on 20 September 2026;
 * before that it was an inference from markup in the queue, which is why it sat
 * unfixed for two runs. At desktop width the same fault flips and puts the
 * empty beat in front of the h1, which is the LCP element.
 *
 * ### Ask for a box, not for a style property
 *
 * The check is `!el.getClientRects().length`, and the two obvious alternatives
 * are both wrong:
 *
 * - `getComputedStyle(el).display === 'none'` is what shipped first, and it only
 *   catches an element hidden *in its own right*. `display` is not inherited, so
 *   an element inside a `display: none` **ancestor** still computes `block` -
 *   the subtree is simply never laid out. The cloud session measured the gap on
 *   the live page at 2160px on 20 September 2026: two elements were `none`
 *   themselves, and three more - the `ScanFacts` rows, inside a hidden
 *   `section.phone-only` - had no box at all while computing `block`. Nothing
 *   was visibly wrong, because those three are a group of their own with no
 *   visible siblings to mis-count against, but that is luck. The next
 *   responsive pair built as a hidden **wrapper** rather than a hidden element
 *   puts the phantom beat straight back.
 * - `offsetParent` is null for a `position: fixed` element too, so it would drop
 *   rows that are perfectly visible. Client rects are correct there - a fixed
 *   element has them.
 *
 * So the question being asked is "does this take up space", and client rects are
 * that question rather than a proxy for it. One call per previous sibling, once
 * per element, at scan time - nothing beside the DOM walk it is already inside,
 * and it never runs again for an element already marked `data-ac-seen`.
 *
 * Width changes are not re-scanned, deliberately. A visitor who rotates a phone
 * mid-page keeps the indices the layout had when the row was first seen, which
 * is a stagger that is off by one beat for rows they have already watched
 * arrive. Re-scanning on resize would instead re-time rows that are already
 * on screen and settled, which is the worse of the two.
 *
 * ## The failsafe, and why the from-state can be as low as it now is
 *
 * Danny's instruction on 20 Sep was that the motion is correct and too quiet
 * to notice, so `.ac-row` went from `opacity: .55 / translateY(8px)` to
 * `.15 / 16px`. The old floor was not arbitrary: it was insurance against the
 * one failure that leaves an element holding its from-state forever, which is
 * JavaScript running and IntersectionObserver never delivering. A background
 * tab has `document.hidden`, and Chrome suspends rAF and IO with it. At .55
 * those rows were degraded but legible; at .15 they are effectively gone.
 *
 * So the insurance is now a mechanism rather than a number. **Nothing may sit
 * in a from-state once the page is visible and settled**, and that property is
 * what `motion-rest-state.test.mts` rule 2 checks - not a floor.
 *
 * `sweep()` adds `.in-view` to any target whose rect currently intersects the
 * viewport. Three things make it the right shape rather than a blanket reveal:
 *
 * - **It is bounded, not repeating.** `arm()` sets one timer, `FAILSAFE_MS`
 *   after a scan, and refuses to set a second while one is pending. A page
 *   that mutates constantly - `/scan` during a live run - would otherwise
 *   postpone its own failsafe indefinitely if the timer were re-armed on every
 *   insertion. Arming only when idle means it fires 1.5s after the first scan
 *   and 1.5s after any later insertion, and never slides.
 * - **It only reveals what is on screen.** A blanket "reveal everything after
 *   N seconds" would play every section below the fold at once, unseen, which
 *   is the trigger defeating itself. An element off screen keeps its observer
 *   and its scroll trigger. An element with no box - the hidden half of a
 *   responsive pair - is skipped for the same reason it is skipped when
 *   counting siblings: it is not something anybody is looking at.
 * - **It does not flatten the stagger.** The delay is
 *   `calc(var(--ac-i) * var(--ac-stagger))` in CSS, per element, so revealing
 *   a group in one pass still plays it as a staggered run. The sweep changes
 *   when the group starts, never whether it is a group.
 *
 * It also runs on `visibilitychange` to visible, which is the background-tab
 * case resolving itself: rAF resumes, and the sweep covers the window before
 * the observer catches up. And on `scroll`, which is the case the other two
 * miss: the one-shot timer reveals what was on screen at 1.5s, and a row
 * BELOW the fold at that moment correctly keeps its trigger - but if the
 * observer is the thing that is broken, scrolling to that row would otherwise
 * leave it at .15 for good. Danny's property is "nothing may sit in a
 * from-state once the page is visible and settled", and a row a visitor has
 * just scrolled to is the plainest case of that. The arm-once guard makes it
 * at most one sweep per window however hard the page is scrolled, and the
 * listener is passive so it cannot delay scrolling.
 *
 * All three paths are idempotent - `classList.add` of a class already present
 * is a no-op, and the observer having already fired leaves nothing for the
 * sweep to find. On a page whose observer works, every sweep after the first
 * finds nothing and costs one `querySelectorAll` plus a rect per unrevealed
 * element, which by then is only the below-fold ones.
 *
 * `FAILSAFE_MS` is 1500. The longest legitimate arrival is .45s of animation
 * behind eight beats of .09s stagger, which is 1.17s, so the failsafe cannot
 * pre-empt a group that is animating normally - and if it did, it would only
 * add a class those elements were about to receive anyway.
 */

export const MOTION_SCRIPT = `(function(){
var d=document,r=d.documentElement;
try{
if(!('IntersectionObserver' in window))return;
if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
}catch(e){return}
r.setAttribute('data-motion','on');
var SEL='.ac-row,.ac-grow,.ac-stamp,.chart-line,.chart-dot,.flow-line';
var FAILSAFE_MS=1500;
var io=new IntersectionObserver(function(es){
for(var i=0;i<es.length;i++){
var e=es[i];
if(!e.isIntersecting)continue;
e.target.classList.add('in-view');
io.unobserve(e.target);
}
},{rootMargin:'0px 0px -8% 0px',threshold:0});
function hidden(el){
try{return !el.getClientRects().length}catch(e){return false}
}
function scan(){
var els=d.querySelectorAll(SEL);
for(var i=0;i<els.length;i++){
var el=els[i];
if(el.hasAttribute('data-ac-seen'))continue;
el.setAttribute('data-ac-seen','');
if(el.classList.contains('ac-row')){
var k=0,s=el.previousElementSibling;
while(s){if(s.classList.contains('ac-row')&&!hidden(s))k++;s=s.previousElementSibling}
el.style.setProperty('--ac-i',String(k>8?8:k));
}
io.observe(el);
}
arm();
}
function sweep(){
var els=d.querySelectorAll(SEL);
var h=window.innerHeight||r.clientHeight||0;
var w=window.innerWidth||r.clientWidth||0;
for(var i=0;i<els.length;i++){
var el=els[i];
if(el.classList.contains('in-view'))continue;
var b=el.getBoundingClientRect();
if(!b.width&&!b.height)continue;
if(b.bottom<0||b.top>h||b.right<0||b.left>w)continue;
el.classList.add('in-view');
try{io.unobserve(el)}catch(e){}
}
}
var armed=null;
function arm(){
if(armed)return;
armed=setTimeout(function(){armed=null;sweep()},FAILSAFE_MS);
}
var queued=false;
function queue(){
if(queued)return;
queued=true;
requestAnimationFrame(function(){queued=false;scan()});
}
function start(){
scan();
try{new MutationObserver(queue).observe(d.body,{childList:true,subtree:true})}catch(e){}
d.addEventListener('visibilitychange',function(){if(d.visibilityState==='visible')arm()});
window.addEventListener('scroll',arm,{passive:true});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start);else start();
})();`;
