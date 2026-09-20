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
 */
const SCRIPT = `(function(){
var d=document,r=d.documentElement;
try{
if(!('IntersectionObserver' in window))return;
if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
}catch(e){return}
r.setAttribute('data-motion','on');
var SEL='.ac-row,.ac-grow,.ac-stamp,.chart-line,.chart-dot,.flow-line';
var io=new IntersectionObserver(function(es){
for(var i=0;i<es.length;i++){
var e=es[i];
if(!e.isIntersecting)continue;
e.target.classList.add('in-view');
io.unobserve(e.target);
}
},{rootMargin:'0px 0px -8% 0px',threshold:0});
function scan(){
var els=d.querySelectorAll(SEL);
for(var i=0;i<els.length;i++){
var el=els[i];
if(el.hasAttribute('data-ac-seen'))continue;
el.setAttribute('data-ac-seen','');
if(el.classList.contains('ac-row')){
var k=0,s=el.previousElementSibling;
while(s){if(s.classList.contains('ac-row'))k++;s=s.previousElementSibling}
el.style.setProperty('--ac-i',String(k>8?8:k));
}
io.observe(el);
}
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
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start);else start();
})();`;

export default function Motion() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
