/**
 * The one place an event leaves this site, and the reason it currently leaves
 * nowhere at all.
 *
 * ## Why this is one module
 *
 * It was two, byte for byte: a `track` inside `LiveScanChecker` and another at
 * the top of `ScanFlow`, sharing no import and no test. That is the species
 * this repo keeps paying for - the date formatter existed twice under two names
 * and the untested copy was the one missing a guard - and here the guard is the
 * whole function. A second copy losing its `Array.isArray` is a site that
 * starts collecting.
 *
 * ## Why the push is guarded rather than buffered
 *
 * The privacy policy says, to anyone who reads it: "This site sets no cookies
 * of its own and runs no analytics - there is no Google Analytics, no tag
 * manager, and no advertising pixel." That is true today, and it is this guard
 * that keeps it true rather than an absence of code. `window.dataLayer` only
 * exists once a container has created it, so with no container every call here
 * is a no-op: nothing is queued, nothing is stored, and nothing is waiting to
 * be flushed the moment one appears.
 *
 * The ordinary way to write this is `(w.dataLayer ||= []).push(...)`, which
 * buffers for a container that has not loaded yet. **Do not.** That version
 * accumulates a record of what the visitor did in their tab, and it would make
 * the sentence above false while looking like a tidy-up.
 *
 * `analytics-claim.test.mts` holds both halves - the sentence on the page, and
 * that nothing in the tree loads an analytics script or writes a dataLayer
 * outside this file. Whether shipping dormant instrumentation is the right
 * thing at all is Danny's call; see blocked.md.
 */
export function track(event: string, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event, ...props });
}
