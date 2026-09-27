# Review queue

Items filed by the reviewer from live checks and from docs/danny.md. The builder works these before docs/queue.md.

- [x] R11 -> no commit (docs only; inbox line replaced, URL fetched 200 at 12:17 UTC: edge45.co.uk result, read 25 Sep 2026, 17 answers, placement rows present). Fix the garbled .co.uk scan URL in docs/inbox.md (Danny, 2026-09-25). The
  "Real scans to check the journey against" list at the bottom of docs/inbox.md
  has a garbled .co.uk line ("The document 'inbox.md' could not be autosaved...").
  Replace that line with `- .co.uk domain: https://alwayscited.com/scan/57520fc70f3cf9dced06f60186ae059e`
  so it matches the .com line's format. Use this URL (not the old garbled one)
  for Q10 and Q11 in docs/queue.md. Verify by reading the URL back with `node`
  and `fetch` and confirming it 200s and renders a real scan result for a
  .co.uk domain.

- [x] R12 -> afedaa9 (served JS verified; headless is always challenged, so the invisible path and a real scan start are a DANNY line in blocked.md). Hide the Turnstile widget until Cloudflare needs a challenge (Danny,
  2026-09-25). `src/components/scan/Turnstile.tsx`, the `window.turnstile.render`
  call around line 41: add `appearance: "interaction-only"` to the options
  object so the widget stays invisible unless Cloudflare decides to challenge
  the visitor. Do not touch the server-side check (`src/lib/scan/turnstile.ts`,
  `verifyTurnstile` / `/api/scan/start`) - it stays exactly as it is. This
  affects every place `<Turnstile />` is mounted (grep the component name),
  not just the homepage domain box. `/legal` already names Cloudflare
  Turnstile (`src/app/legal/page.tsx` line 127) - read it after the change and
  confirm the sentence is still true with the widget hidden; if it no longer
  reads true, fix the line, but a new line is very likely not needed. Verify
  on production: load `/` and confirm no Turnstile box renders under the
  domain field (read the built DOM/CSS, not a screenshot guess), then confirm
  a real scan still starts (the confirm/start step succeeds, not a submitted
  scan).

- [x] R13 -> f2aaad0 (it wrapped at 390; table widened below 860, live 1 line at 390 and 1280). Packages CTA label: "Go for first" -> "Go for position #1" (Danny,
  2026-09-25). `src/components/home/Packages.tsx` line 42, the `cited` entry's
  `label`. Change only that string. Verify the button still fits on one line
  at 390 and at 1280 - shoot `/` with `docs/parity/shoot.mjs` at both widths
  (or measure the button's rendered height/line count directly) and confirm
  the label does not wrap.

- [x] R14 -> 25b5d27 (also the meta description and /scan phone eyebrow as variants; live verified by fetch). Cut "White-label for agencies, the same if you are the brand" and
  its variants (Danny, 2026-09-25). Three sentences, in three files, all
  currently read at HEAD `b47a671`:
  1. `src/components/home/HomeHero.tsx` lines 41-42, the `<p>` under the H1:
     "We find the pages the answers are built from, then get you named
     inside them. White-label for agencies, the same if you are the brand."
     Cut the second sentence; keep "We find the pages the answers are built
     from, then get you named inside them."
  2. `src/components/scan/HeroSection.tsx` line 99 (the desktop paragraph),
     ends "...named inside them. Built white-label for agencies, and it
     works the same if you are the brand." Cut from "Built white-label"
     onward so the sentence ends at "named inside them."
  3. `src/components/scan/HeroSection.tsx` lines 102-105 (the
     `className="phone-only ac-row"` paragraph): "Free scan, then editorial
     placements in the pages the engines actually cite. White-label for
     agencies, and the same if you are the brand." Cut the second sentence;
     keep the first.
  Danny said "and its variants everywhere" - `src/app/page.tsx` line 18, the
  `openGraph.description`, also carries the phrase ("Free scan, then
  white-label placements in the sources they cite. Prices on the page.").
  Cut "white-label" there too, keeping the sentence readable (e.g. "Free
  scan, then get placed in the sources they cite. Prices on the page.").
  Grep `white-label\|white label` case-insensitively across `src` afterward
  and confirm nothing about agencies/branding remains outside `/white-label`
  itself (that page's content is out of scope - Q14, untouched).
  This is a deliberate difference from `Main.dc.html` and `Mobile.dc.html`
  (Danny, 25 Sep) - add a line to `docs/inbox.md`'s "Deliberate differences"
  list so no parity check restores the sentence.
  Verify: the grep above, `tsc`/`build`/`check` gates, and a shoot of `/`
  hero and `/scan` hero (desktop paragraph and phone-only paragraph) at 1280
  and 390 to confirm the shortened copy doesn't leave odd spacing or an
  orphaned line.

- [x] R15 -> 94d237f (one sr-only h1 live, title live, hero byte-identical before/after). Homepage SEO: sr-only H1, title tag (Danny, 2026-09-25 - amended same
  day, supersedes this item's earlier "visible eyebrow" text for part (2); part
  (1) is unchanged). Deliberate difference from `Main.dc.html` (Danny, 25 Sep) -
  add a line to `docs/inbox.md`'s "Deliberate differences" list.
  (1) `src/app/page.tsx`: change `metadata.title` (line 11) from
  `"LLM Visibility Checker | alwayscited"` to
  `"AI SEO agency | AI visibility tools - alwayscited"`. Update
  `openGraph.title` (line 17) to the same string, since it currently mirrors
  `metadata.title` exactly. There is no separate `twitter` block in this
  file, so nothing else to update there.
  (2) `src/components/home/HomeHero.tsx` lines 35-39: today this is the
  page's only `<h1>` - "Every AI tool shows you the gap." / "We close it."
  Do NOT add a visible eyebrow line. Instead: add a visually hidden `<h1>`
  reading "AI SEO agency", placed first (sr-only: clipped via the site's
  existing `.sr-only` pattern - `position: absolute`, clipped rect, not
  `display:none`), and demote the existing headline markup to a `<p>` (or
  equivalent) with its exact current visual styling unchanged - font-size
  `clamp(34px, 5vw, 64px)`, weight 700, letter-spacing `-0.04em`, line-height
  1.04, the two-line break and the accent-coloured "We close it." span. The
  hero must look unchanged - the only observable difference is which element
  is the H1.
  Verify on production: exactly one `<h1>` on `/`, its text is "AI SEO
  agency", and it is visually clipped (read the built HTML/head with
  `node`+`fetch`, not a screenshot guess, plus a screenshot confirming the
  hero is pixel-identical to before); the `<title>` reads "AI SEO agency | AI
  visibility tools - alwayscited".

- [x] R16 -> f609043, 0863386. A source's classifier note can print "marketplace" on the result
  page, which QF1(a) said must never happen (reviewer live check, 2026-09-25).
  `src/components/scan/ResultView.tsx` line 703-704, the `PlanCards`
  component: `{o.note ? <p ...>{o.note}</p> : null}` prints
  `Opportunity.note` verbatim - free text an LLM classifier wrote per domain
  (`src/lib/scan/sources.ts` line 214, `note: j?.note ?? null`), carried
  unfiltered through `deriveOpportunities` (`src/lib/scan/opportunities.ts`
  line 143, `note: classified?.note ?? null`) into the first three "join"
  cards on the live result page.
  Live evidence, fetched 2026-09-25 ~13:20 UTC from
  `https://alwayscited.com/scan/57520fc70f3cf9dced06f60186ae059e` (saved at
  `docs/parity/review/3fa5502-result.html`): the payload embedded in that
  page carries, for `mayple.com`, `"kind":"placement","note":"Marketplace/
  directory listing marketing agencies"`. That domain does not currently
  land in this scan's top three, so the word is not on screen today, but
  nothing stops a domain whose note reads this way from landing in the top
  three on another scan - the render path is unguarded.
  This is exactly what QF1(a) (shipped `c3120d1`) already fixed once for
  `difficulty_basis` and added a census for
  (`src/components/scan/result-copy.test.mts`, "no result surface or payload
  names a marketplace..."). That census greps source files for the literal
  string and cannot see this - the offending text is classifier output in
  the database, not code, so it ships clean through `npm run check` every
  time.
  Fix: stop rendering `o.note` verbatim in `PlanCards`, the same call QF1(a)
  made for the placement table - replace it with the engines-cited-by /
  brands-named line already computed for the table rows below (`cited_by`,
  `questions`, or equivalent), or at minimum strip/reject a note containing
  "marketplace", "listed on" or a price before it reaches the client. Do not
  just patch the one word for `mayple.com`'s row - the classifier can write
  this for any domain, so the fix has to be in the render path or the data
  layer, not the content.
  Verify: `npx tsc --noEmit`, `npm run check`; re-fetch both inbox scan URLs
  and grep the payload for `note.*[Mm]arket|listed on` - none should reach a
  rendered `<p>` in `PlanCards` regardless of sort order; if practical, add a
  test alongside `result-copy.test.mts` that renders `PlanCards` (or the note
  path) with a fixture opportunity whose `note` contains "marketplace" and
  asserts it does not reach the DOM/output verbatim, so this stops depending
  on which three domains happen to sort highest.

- [x] R17 -> f609043, 0863386. R16 is confirmed live, not latent, and the fix must cover a second
  render site Q10 added (reviewer live check, 2026-09-25). Q10 (`18ea030`)
  added `PlacementTable`, the "page · note" table under the three cards, and
  it has the identical bug R16 already found in `PlanCards`:
  `src/components/scan/ResultView.tsx` line 682,
  `{o.note ? <span style={{ color: T.soft }}>{" · " + o.note}</span> : null}`,
  prints `Opportunity.note` verbatim next to the domain, the same unfiltered
  classifier text as line 724's `PlanCards` copy R16 named.
  R16 said the mayple.com case "does not currently land in this scan's top
  three, so the word is not on screen today" - **that is no longer true.**
  `PlacementTable` lists every opportunity, not just the top three, so
  mayple.com's row is on screen today, live, with no interaction needed:
  fetched 2026-09-25 ~13:40 UTC from
  `https://alwayscited.com/scan/57520fc70f3cf9dced06f60186ae059e` (saved at
  `docs/parity/review/18ea030-result.html` and
  `docs/parity/review/18ea030-r17/site-0.png`), the served HTML reads
  `mayple.com</span><span style="color:#686d79"> · Marketplace/directory
  listing marketing agencies</span>` - the word "Marketplace" beside a
  placement row, on the live page, today. QF1(a)'s own rule is that nothing
  on the page may name or imply a marketplace or a price beside a
  placement; this breaks it in production right now, not hypothetically.
  Fix: whatever the builder does for R16 has to also cover
  `PlacementTable` (line 682), not only `PlanCards` (line 724) - both read
  the same `o.note` and both need the same filter or removal. Do not fix
  only the surface that happened to be checked first.
  Verify: re-fetch both inbox scan URLs after the fix and grep for
  `Marketplace|listed on|\$\d` beside any domain in either the three cards
  or the table; extend the test R16 asked for so it covers `PlacementTable`
  as well as `PlanCards` with the same fixture note.

- [x] R18 -> 9e3fec6. Build /how-it-works and /what-is-aeo to their new boards (Danny,
  2026-09-26). Two boards were added to `docs/boards-2026-09-25/` after Q24
  shipped: `HowItWorks.dc.html` (184 lines) and `WhatIsAeo.dc.html` (243
  lines). Both routes exist today (`src/app/how-it-works`,
  `src/app/what-is-aeo`) and were built Q24 with "no board - judged against
  the built pages" (queue.md, commit `1cc49b1`). This overrides two settled
  positions, in Danny's favour as the newer word:
  1. Q24's own note in `docs/queue.md` that these pages have "no board" -
     they now do.
  2. `docs/rules.md`, "Site brief decisions - 25 September 2026" ->
     "Out of scope": `/how-it-works` and `/what-is-aeo` were listed as "not
     on the canvas - leave them alone." That line stands for every other
     page still listed there (the four tier pages, `/compare`, blog posts,
     case studies, about, contact, legal, `/coverage-check`) - only these
     two routes are now in scope, because only these two boards exist.
  Treat this the same way Q16-Q22 treated their boards: read
  `docs/boards.md` for tokens/type scale/motion/placeholder-brand rules and
  how to translate a `.dc.html` before touching either page, then rebuild
  each route's layout, copy structure and beat (if the board shows one) to
  match its board - `docs/inbox.md`'s "deliberate differences" list still
  applies (EngineLogo not tiles, real tempo not clock time, real data not
  Tallyroo figures, `[VERIFY]`/`[CONFIRM CLAUSE WORDING]` gaps stay open,
  no white-label sentence, no "Most taken" badge). The launch video on
  `/how-it-works` (Q23, `1cc49b1`) is a fixed beat already verified against
  `src/config/video.ts` - keep it and its position unless the board places
  it somewhere specific; do not touch its prices or re-render it for this
  item. Same for any price or tier-name text on either page - it still
  comes from `pricing.ts` / `TierName`, never hand-typed.
  Verify: `npx tsc --noEmit`, `npm run check`, `npm run build`; shoot both
  boards against both live routes at 1280 and 390 with
  `node docs/parity/shoot.mjs`, matching beat states where either board
  animates; confirm the video block and its JSON-LD are unchanged if kept
  in place. Log what changed and what (if anything) still differs, the same
  way Q16-Q22 did.

- [x] R19 -> 2fc757c (live 1280/390/js-off/reduced read back; card height unchanged). /about "Why agencies only" contradicts selling direct to brands
  (Danny, docs/danny.md - filed 2026-09-26). `src/app/about/page.tsx`
  lines 129-136, the card headed "Why agencies only": "Selling direct would
  put us in front of the clients our partners already have. That is a
  short-term revenue decision with a long-term cost, so we do not make it.
  Every engagement runs through an agency, under their name." This is flatly
  false today: `src/components/home/HomeFaq.tsx` line 48 says "If you are
  the brand rather than the agency, the same prices apply and there is
  nothing to mark up." Rewrite the About card agency-first rather than
  agency-only - explain why the agency channel is the default without
  claiming every engagement runs through one or that selling direct is
  refused. Do not touch the FAQ line; that is the one that is already true.
  Verify: re-read both sentences together and confirm they no longer
  contradict; shoot `/about` at 1280 and 390 to confirm the card's height
  survives shorter copy.

- [x] R20 -> c07f1dd (live HTML 0 markers on both pages; to-confirm census exact-empty, dated; blocked.md item 3 annotated). Remove the two visible [TO CONFIRM] markers (Danny, docs/danny.md -
  filed 2026-09-26). Drop the unconfirmed sentence each one sits in rather
  than inventing wording, until Danny confirms it. Both still at the lines
  he gave: `src/app/white-label/page.tsx:78` - "Written into the agreement.
  <ToConfirm>the clause wording</ToConfirm>"; `src/app/case-studies/vibe-
  retail/page.tsx:291` - "<ToConfirm>how many prompts were in the set, and
  the dates each reading covers</ToConfirm>". Read each sentence in its
  full paragraph first so the cut reads clean rather than leaving an
  orphaned clause.
  This overrides two settled positions, in Danny's favour as the newer word:
  `docs/inbox.md`'s deliberate-differences list ("[VERIFY],
  [CONFIRM CLAUSE WORDING] and missing-evidence gaps stay as they are"),
  and `docs/queue.md` Q14's "[CONFIRM CLAUSE WORDING] stays". It also bears
  on `docs/blocked.md`'s open item 3 (Vibe Retail dates/tracker/prompt
  count): the prompts/dates half of that item is being dropped rather than
  filled in, so re-read it after this ships, but leave the call on whether
  to move it to Settled to Danny, not the builder.
  Both usages removed drops `src/app/to-confirm.test.mts`'s `USERS.length`
  (currently asserted `>= 2`, with a comment recording it moved 3 -> 2 on
  25 Sep when `/legal` came off) to 0. Move that floor deliberately, the
  same way the file's own history does - do not delete the test or weaken
  it silently. Record the new count with a dated reason ("Danny, dropped
  rather than confirmed, 26 Sep 2026") in the same comment.
  Verify: `npx tsc --noEmit`, `npm run check` at the new (lower, recorded)
  count; shoot both pages at 1280 and 390 to confirm no broken sentence
  remains.

- [x] R21 -> ce3f352 (live 200 text/plain; 21/21 URLs 200; 21/21 lines equal the live meta description). Add /llms.txt (Danny, docs/danny.md - filed 2026-09-26). Does not
  exist today (checked `public/llms.txt` and `src/app/**/llms.txt*` -
  neither present). List the main pages with a one-line description each,
  built from the route list (`src/app/**/page.tsx`) and each page's
  existing `metadata.description` - do not hand-type new descriptions that
  could drift from the meta tags. Follow the plain-text llms.txt convention
  (markdown headings and a linked list). Verify: fetch `/llms.txt` on
  production and confirm it 200s as `text/plain` (or `text/markdown`) and
  every URL listed resolves; spot-check a couple of lines against their
  page's actual meta description to confirm it was derived, not typed.

- [x] R22 -> 4fce52f (live HTML names it; 'unnamed'/'agency request' 0 in case-studies). Name Vibe Retail on its own case study (Danny, docs/danny.md -
  filed 2026-09-26). `src/app/case-studies/vibe-retail/page.tsx` line 165:
  "Client unnamed at the agency request. The position below is the account
  owner's own reading, over the window stated beside it." This is the one
  place on the site that still withholds the name - it is already named on
  the homepage (`src/components/home/Results.tsx` line 86), the blog
  (`src/app/blog/how-llms-pick-which-brands-to-recommend/page.tsx` line
  112) and `/what-is-aeo` (line 424). Cut "Client unnamed at the agency
  request." and name it "Vibe Retail" instead, keeping the rest of the
  sentence ("The position below is the account owner's own reading...")
  as is - naming it adds no new claim, so do not add any figure or detail
  beyond what is already attested. The `/case-studies` index card
  (`src/app/case-studies/page.tsx` line 92, "US retail SaaS - eight weeks")
  names no client either way, so it is not inconsistent - naming it there
  too is optional, builder's call. Verify: grep "unnamed" and "agency
  request" across `src/app/case-studies` afterward and confirm nothing
  remains; shoot the page at 1280 and 390.

- [x] R23 -> 137402d (live: old sentences 0 on all three pages; aeo + tier pages clean). Fix sentences claiming every placement links to the chosen page
  (Danny, docs/danny.md - filed 2026-09-26). The rule, overriding any board
  or existing page copy: every alwaysmentioned placement carries at least a
  brand link; not every placement carries a contextual link to a chosen
  page; the contextual link is what moves Google rankings most. Three
  places currently say otherwise (grepped across `src`, `/what-is-aeo` and
  the tier pages hold no violation today):
  1. `src/app/how-it-works/page.tsx:92` - "Every placement carries a link
     to the page you want ranked, not only the homepage. That is what lets
     one article move a citation and a position at once."
  2. `src/components/home/HomeFaq.tsx:33` - "An unlinked mention can get a
     brand named in an answer. A link does that and moves the Google
     position. Every placement we run carries one, which is why the two
     measures move together rather than separately."
  3. `src/app/seo-agencies/page.tsx:47` - "An unlinked mention can get a
     brand named. A link does that and moves the Google position, so every
     placement we run carries one."
  All three read as "every placement carries the Google-moving link."
  Rewrite each so it says what `src/app/alwaysmentioned/page.tsx` already
  says correctly (lines 34, 48-49): a placement can win the citation
  without a link, coverage and links do different jobs, and the tracker
  reports which happened for which placement - do not just delete the
  sentences, since the underlying point (visibility and ranking are
  measured separately) is still true and worth keeping. Verify: `npx tsc
  --noEmit`, `npm run check`; re-grep the three files plus `/what-is-aeo`
  and all four tier pages for "carries one", "carries a link" and "every
  placement" to confirm no violation remains anywhere in scope.

- [x] R24 -> b939129 (live: both tracked CTAs carry ?tier=alwaystracked; /contact note renders; no reply time - the form's two existing 'same working day' lines removed). No Stripe: the alwaystracked CTA and /contact (Danny,
  docs/danny.md - filed 2026-09-26). Today every tier's primary CTA
  (`src/components/PackagePage.tsx` line 125-126, `href={CONTACT_URL}`,
  `CONTACT_URL = "/contact"` in `src/config/pricing.ts` line 26) already
  goes to `/contact` with no Stripe or checkout anywhere in the tree
  (checked) - but it is generic ("Start a client" for every paid tier) and
  `/contact` (`src/app/contact/page.tsx`, `src/components/ContactForm.tsx`)
  has no tier field, no query-param read and no wording about how the $99
  tier gets set up. Danny wants the $99 alwaystracked tier specifically
  marked as hand-set-up-via-contact: its CTA (the homepage staircase,
  `src/components/home/Packages.tsx` line 40, `tracked: { label: "Start
  tracking" }`, and its own tier page, `/alwaystracked` via `PackagePage`)
  should carry the tier through to `/contact` (a query param is the
  obvious route - there is no existing pattern to match, so pick one and
  use it consistently) so the form/page can preselect or at least
  acknowledge it, and the page should say plainly that alwaystracked is
  set up by hand for now - do not add or imply a reply-time promise
  anywhere (none exists today; keep it that way). Verify: `npx tsc
  --noEmit`, `npm run check`; visiting the tracked tier's CTA end to end
  and confirming `/contact` reflects the tier and states no reply time;
  grep the changed files for "hour", "day" or "business day" near the new
  copy to confirm no reply-time promise crept in.

- [x] R25 -> 2e0a790 (live 7s matches board beat; js-off/reduced settled; other three tier pages byte-identical before/after). LAST ITEM - do not start until every other open R item and queue
  item is ticked (Danny, docs/danny.md - filed 2026-09-26). A new beat for
  `/alwaystracked` only. Board `docs/boards-2026-09-25/TrackedBeat.dc.html`
  now exists, sitting directly under that tier's header - build it there via
  `PackagePage.tsx` / whatever `/alwaystracked` uses for its header today.
  Engine tiles on the board become `EngineLogo`, the real SVGs (the
  inbox.md deliberate-difference rule, same as every other beat). Keep the
  board's "Illustrative" labelling exactly as it reads. The other three tier
  pages (`/alwaysmentioned`, `/alwayscited`, `/alwayseverywhere`) are
  unchanged - this beat is `/alwaystracked` only, do not generalise
  `PackagePage.tsx` in a way that adds it to the other three.
  Verify: `npx tsc --noEmit`, `npm run check`, `npm run build`; shoot
  `TrackedBeat.dc.html` against the live `/alwaystracked` route at 1280 and
  390 with `node docs/parity/shoot.mjs`, matching beat states; confirm the
  other three tier pages are pixel-unchanged (diff their live shots against
  the last time they were shot, Q16/R-whatever last touched them).

- [x] R26 -> 42b9e89 (live 200 image/png 91KB 1200x630, looked at; alt live). Rebuild the share card (Danny, docs/danny.md - filed 2026-09-26).
  `src/app/opengraph-image.tsx` (and `src/app/twitter-image.tsx` if it does
  not simply re-export the same image) currently draws a light card: white
  background, `always` + accent `cited` wordmark, "Be the brand AI
  recommends", a rule, and the four free engine names as a text row - none
  of that is the homepage hero. Rebuild it to mirror the homepage hero
  instead, at 1200x630: dark ink ground (`T.bg`/`T.ink` dark variant - read
  `HomeHero.tsx` for the exact dark ground token) with the purple glow, the
  `alwayscited` wordmark small, top left, the headline "Every AI tool shows
  you the gap." with "We close it." in the lifted purple beneath it (same
  two-line structure and accent colour as `HomeHero.tsx`), the subline "We
  find the pages the answers are built from, then get you named inside
  them.", and the four engines' own marks (not text labels) along the
  bottom - `EngineLogo` is a React component, so read how Satori/`next/og`
  can render it here (inline SVG paths, most likely, not the component
  directly) rather than inventing a new mark. Update the `alt` export to
  describe what the card now draws (`og-card.test.mts`'s "alt describes
  what the card draws" test reads every word in the JSX against it, so a
  stale alt fails the suite, not just looks wrong). Keep `og-card.test.mts`
  passing - it also holds the brand-mark rule and the page's own claims
  against `PRICE_EXEMPT`/verbatim-claims censuses, so if the new card prints
  a price anywhere it needs the same exemption `video.ts` has, not a
  loophole.
  Verify: `npx tsc --noEmit`, `npm run check`, `npm run build`; fetch
  `/opengraph-image` on production with `node`+`fetch`, save the PNG and
  look at it, and confirm `content-type: image/png` and the byte size is
  sane (not a broken/blank render).

- [x] R27 -> 4e6d276 (two cycles watched locally at 1280 + 390, no empty frame; live reduced/no-JS settled). Homepage four-tier section: no empty frame between beats (Danny,
  docs/danny.md - filed 2026-09-26, restates the note filed 25 Sep as R1-R10
  covered it then; Danny is re-raising it, so treat as open again).
  `src/components/ProcessSequence.tsx` (used on `/` at `HOME_TEMPO` and on the
  waiting screen at `WAITING_TEMPO`): each tier's card and its bridge card
  share one grid cell (`globals.css` "proc-beats"/"proc-beat", ~line 1011-1020)
  and only the one with `data-on="1"` gets `visibility: visible`. The
  candidate cause: the cycle effect (~line 483-502) calls `setBridging(false)`
  and then `setBeat(n => ...)` as two separate state updates inside one
  `setTimeout` callback; if those ever commit as two renders instead of one
  batched render, the outgoing tier's own stage briefly re-satisfies
  `on && !bridging` (line 618) between the bridge clearing and the beat
  advancing - a flash back to the tier that just finished, or a frame with
  neither the next stage nor the next bridge on screen, depending on timing.
  Do not fix this by reasoning about React's batching guarantees alone -
  Danny's ask is to *watch* it: open `/` (and the waiting screen, mid-scan) in
  a real browser tab at 1280 and at 390, watch at least two full cycles
  (79s home / ~40s waiting) end to end rather than screenshotting single
  instants, and note every point - beat-to-bridge, bridge-to-next-beat, and
  the last tier back to the first with no bridge - where nothing legible is
  on screen. Fix whatever is actually seen (likely: force the two state
  updates into one, e.g. a single `setState` with a reducer, or advance `beat`
  and clear `bridging` in the same call). Verify: `npx tsc --noEmit`,
  `npm run check`; re-watch the same two cycles at both widths and confirm a
  tier or bridge card is visible at every point; also check with
  `--reduced`/`--js-off` that the settled (all-four-stacked) state is
  unaffected.

- [x] R28 -> 1516c7f (live 390: cue visible, fade 56px -> 0px at end). Mobile pricing table at 390: give the horizontal scroll a visible
  cue (Danny, docs/danny.md - filed 2026-09-26). Read
  `src/components/home/Packages.tsx` (the `.pkg-scroll` wrapper, ~line 132)
  and `src/app/globals.css` `@media (max-width: 860px)` (~line 250-256): the
  table already scrolls sideways below 860px (`.pkg-scroll { overflow-x: auto
  !important }`, `.pkg-table { min-width: 820px }`), so all four tiers are
  already technically reachable - Danny's complaint is that at 390 it reads
  as "one tier of four" because nothing on screen says there is more to the
  right. There is no fade edge, arrow, "swipe" label or scrollbar affordance
  anywhere near `.pkg-scroll` today (grepped `Packages.tsx` - nothing).  Add a
  visible cue: the cheapest is a right-edge gradient fade (`mask-image` or a
  pseudo-element) on `.pkg-scroll` that only shows while there is more to
  scroll, or a small "scroll for all four ->" label above the table at
  <=860px. Do not change the desktop table. Verify: shoot `/` at 390 with
  `docs/parity/shoot.mjs`, confirm the cue is visible on load, and confirm it
  disappears (or the scroll position is clearly at the end) once scrolled all
  the way right; confirm no change at 1280.

- [x] R29 -> fbd3ba2 (live: header none, footer yes). Take /compare out of the main nav, footer only (Danny, docs/danny.md
  - filed 2026-09-26). `src/components/Header.tsx` line 27,
  `{ href: "/compare", label: "Compare" }` in `navLinks` - remove this entry.
  The page and its footer link stay: `src/components/Footer.tsx` line 29,
  `["Compare", "/compare"]` in `FOR` (or wherever it lives), is unaffected.
  Update the doc comment at `Header.tsx` lines 12-17 ("The board's nav,
  complete: Packages, Compare, White label, Blog...") so it no longer claims
  Compare is in the header nav. Verify: `npx tsc --noEmit`, `npm run check`;
  grep `Header.tsx` for "compare" (should be gone); shoot `/` header at 1280
  and 390 and confirm Compare is absent from the topbar and still present in
  the footer.

- [x] R30 -> 2eef1c2 (live HTML: old sentence gone, new present). Own-site work: make the homepage agree with /how-it-works (Danny,
  docs/danny.md - filed 2026-09-26, restates the note filed 25 Sep; the
  earlier item evidently missed this surface - it is still contradicted
  today). `src/components/home/TwoWays.tsx` line 43: "Both are placements on
  sites we do not own. Neither is content on your own site, because that is
  not where the answers come from." This flatly contradicts
  `src/app/how-it-works/page.tsx` lines 86-89, whose second pillar is
  "On-site pages built for the question" ("The questions closest to a buying
  decision get pages of their own..."), `src/config/video.ts` line 48 ("the
  on-site work and the link insertions"), and the case study's "On-site
  content written for the question, not the keyword"
  (`src/app/case-studies/vibe-retail/page.tsx` line 237). Danny's rule:
  follow what /how-it-works says. Rewrite the `TwoWays.tsx` sentence so it
  stops claiming we never touch the client's own site - the two cards below
  it are about third-party placements specifically, so the fix is narrowing
  the claim to that (e.g. "Both are placements on sites we do not own" can
  stand; cut or rewrite "Neither is content on your own site, because that is
  not where the answers come from", which is the false-for-alwayscited part).
  Verify: `npx tsc --noEmit`, `npm run check`; re-grep `src/components/home`
  and `src/app/how-it-works`, `src/app/what-is-aeo`,
  `src/app/case-studies/vibe-retail` for "on-site"/"own site" and confirm no
  sentence anywhere claims on-site work never happens; shoot `/` at 1280 and
  390 around `TwoWays`.

- [x] R31 -> b598b96 (live / and /legal: number + office verbatim, no ICO). Company details in the footer and /legal (Danny, docs/danny.md -
  filed 2026-09-26). This restates the note filed 25 Sep that was later
  cancelled the same day ("Cancel the company details line... do not show the
  company name, number or registered office anywhere") - this is Danny's
  newer word (26 Sep) and overrides that cancellation. Show "Nomada Digital
  Ltd, company number 12869202, registered office 11 Heworth Hall Drive,
  York, YO31 1AG" - not the ICO number, it is still unconfirmed
  (`docs/blocked.md` item 1). Two sites carry only "Nomada Digital Ltd, York"
  today and need the fuller line: `src/components/Footer.tsx` line 139,
  `<span>&copy; {new Date().getFullYear()} Nomada Digital Ltd</span>`; and
  `src/app/legal/page.tsx` line 220, `Nomada Digital Ltd, York`. Read
  `src/app/legal/page.tsx` lines 40-50 first (the comment about "an invented
  company number is worse than an absent one") - this item supplies the real
  number, so that comment's caution no longer applies and can go once the
  number is in. Verify: `npx tsc --noEmit`, `npm run check`; fetch `/` and
  `/legal` on production with `node`+`fetch` and confirm both the company
  number and the registered office string appear verbatim; confirm no ICO
  number is shown anywhere.

- [x] R32 -> 9d8938c (live, start call intercepted: lock/dim/ring/pulse/steps/error-in-one-line on / and /scan, 1280+390, reduced; third step "Reading your site" - see parity log). Homepage domain field: busy state on submit (Danny, docs/danny.md -
  filed 2026-09-27). Both surfaces that take a domain today go through the
  same two components, so one fix covers both - confirmed by reading
  `src/components/scan/HeroSection.tsx`: it has no field of its own, line 130
  renders `<LiveScanChecker initialDomain={initialDomain} />` (light) exactly
  as `HomeHero.tsx` line 49 renders `<LiveScanChecker dark />` (dark). "if it
  has its own field" in Danny's note is therefore answered - it does not; do
  not fork the logic per page.
  Where the work is:
  1. `src/components/scan/LiveScanChecker.tsx` lines 24-62: `busy` already
     exists and already disables the button (screens.tsx `disabled={p.busy}`),
     but nothing else changes while it is true. Add a step index driven by a
     timer started in `onDomain` (line 29) alongside `setBusy(true)`: three
     phases only, in order, holding on the last one rather than looping back -
     `Checking ${domain}`, `Working out your market`, `Writing your
     questions`. Before wiring the third phrase verbatim, check it against
     what `/api/scan/start` (`src/app/api/scan/start/route.ts`) actually does
     in this call: reading `route.ts` today, the market is picked at lines
     137-141 and the site/brand read (which produces `topic_variants`, not the
     14 buyer questions - those are written later, post-confirm, by
     `src/app/api/scan/[token]/questions/route.ts`) happens at lines 236-239.
     No step in this route writes the question set. If "Writing your
     questions" cannot be made true of what actually happens inside this one
     call, say so in the log and pick the nearest honest phrase for the third
     step instead of shipping a false one - AGENTS.md's rule on publishing
     only what can be stood behind applies to functional copy, not only
     marketing claims. Clear the timer and reset the step on both the success
     path (`router.push`, line 57) and every error exit (lines 49 and 59) -
     it must not keep stepping, or reappear at step one, after the request
     has already resolved.
  2. Field lock: while `busy`, pass the domain through
     `normalizeDomain` (`src/lib/scan/domain.ts` - a pure function, safe to
     import client-side, already used server-side in `start/route.ts` line 98)
     as the field's displayed value, and mark it read-only. `screens.tsx`
     already has a `readOnly` prop and an `ro()` helper (line 31) for this
     shape, used elsewhere for a locked-but-styled-live field - reuse it
     (`p.readOnly || p.busy`) rather than inventing a second lock mechanism.
     "Dims slightly" is a new style on the field wrapper (`.hero-field` in the
     dark variant, screens.tsx line 47; the plain `field` style object,
     line 24, for the light one) gated on `busy`, e.g. `opacity: 0.75` -
     there is no existing disabled/dim rule on either to copy.
  3. Button: `screens.tsx` lines 53-55 (dark) and 74-76 (light) already swap
     the label to "Checking" when busy. Add a small spinner glyph before that
     text, and a soft pulse on the button's own glow - `.btn-primary`'s
     `box-shadow: 0 4px 20px rgba(124,58,237,0.28)` at `globals.css` line 122
     is the glow Danny means; animate it (or the button's opacity) on a ~1.6s
     cycle while busy. Read `docs/rules.md`, "If you are adding motion to
     something new" before writing the keyframes - `motion-script.test.mts`
     derives its `SEL` census from `motion-script.ts`, not from grepping a
     class name, and `transform` does not apply to a non-replaced inline
     element, so keep the spinner a block/inline-block element if it needs to
     move. Scope the pulse and the spinner's own animation under
     `html[data-motion="on"]`, the same pattern already in `globals.css`
     (e.g. lines 236-239) - do not run either under
     `prefers-reduced-motion` or with `data-motion` absent (no-JS).
  4. Status line: one line under the field that is empty when idle, shows the
     stepping text while busy, and shows the error message in the same slot on
     failure - not an additional line. Today `screens.tsx` renders the error
     as its own `<p role="alert">` (dark: line 57, light: line 84); fold the
     stepping text into that same element rather than adding a second one,
     switching its content (and, if useful, its `role`/`aria-live`) by state.
  5. Reduced motion: the stepping TEXT still advances (it is information, not
     decoration) - only the pulse and the spinner stop, per
     `motion-rest-state.test.mts`'s existing pattern for the settled state.
  Verify: `npx tsc --noEmit`, `npm run check` (no census weakened - if a new
  motion selector needs registering, add it, do not shrink an existing cap);
  `npm run build`; shoot `/` and `/scan` at 1280 and 390 with
  `docs/parity/shoot.mjs` mid-submission (a local harness / fixture is fine,
  Danny's rule against submitting a form is about production) to see the
  spinner, the pulsing glow, the dimmed locked field showing the normalised
  domain, and the stepping line; confirm with `--reduced` that the pulse and
  spinner are absent but the text still steps; trigger a failure path (bad
  domain, e.g. "not a domain") locally and confirm the button resets and the
  reason appears in the status line, not a second line. Log which third-phase
  wording shipped and why, if it differs from Danny's exact words.

- [x] R33 -> 703fce7 Confirm screen: make cluster and intent editable on a visitor's own
  question (Danny, docs/danny.md - filed 2026-09-27). `src/components/scan/
  ConfirmScreen.tsx`: `add()` (line 331-334) stamps a new row `{ question: "",
  kind: "custom", cluster: topic.trim() }`, and every row - own or written -
  renders cluster and intent as plain text (line 598 `<div>{q.cluster}</div>`,
  line 599 `<div>{INTENT[q.kind] ?? INTENT.custom}</div>`). Danny wants both
  editable, but only on a row the visitor added themselves.
  1. `isOwn` (line 276) currently reads `q.kind === "custom"` - the moment a
     visitor picks a real intent for their own question, `kind` stops being
     `"custom"` and `isOwn` would flip to false, which changes how `kept`
     (line 277) treats the row: an own row is never dropped by a cluster chip
     today (that guarantee is what `9733e4d` fixed - "dropping a cluster
     silently dropped the questions you wrote yourself", and the comment at
     lines 265-275 documents why). Do not let picking an intent silently
     remove that guarantee. Add an explicit `own: boolean` to the
     `PreviewQuestion` type (line 25), set `true` only in `add()`, and change
     `isOwn` to read `q.own === true` instead of the `kind` check - then
     `kind`/`cluster` can change freely on an own row without it becoming
     droppable.
  2. Cluster: for a row where `isOwn(q)`, render a `<select>` instead of the
     plain div, options = the `clusters` state array (line 152) plus the
     current category (`topic.trim()`), value = `q.cluster`, onChange calls a
     new `setCluster(i, value)` (mirror `edit()`, line 323-325, updating only
     `cluster`). Non-own rows keep the plain-text cell unchanged.
  3. Intent: for a row where `isOwn(q)`, render a `<select>` with the five
     real kinds only - `category`, `positioning`, `sector`, `outcome`,
     `comparison` (via the `INTENT` map, line 28-35, excluding `custom`/
     "Yours" as an option since that is the unset state, not a pick) - value
     = `q.kind`, onChange calls a new `setIntent(i, kind)` updating only
     `kind`. Non-own rows keep the plain-text cell.
  4. Both selects store what is picked in the `questions` state (already the
     source `run()` reads from, line 290-296), so it reaches
     `/api/scan/[token]/confirm` unchanged.
  Verify: `npx tsc --noEmit`, `npm run check`; on a local harness (Q07's
  approach, not a live Turnstile-gated token) add a question, confirm cluster
  and intent are two selects with the right options and default values, pick
  new ones, and confirm the row is still present (not droppable) after
  toggling every cluster chip off; confirm a written (non-own) row is
  unchanged (plain text, still droppable by its chip).

- [x] R34 -> 703fce7 Confirm screen: "Remove" turns red on hover and focus (Danny,
  docs/danny.md - filed 2026-09-27). `src/components/scan/ConfirmScreen.tsx`
  line 116-128, `quietBtn` - an inline style object, so it cannot carry a
  `:hover`/`:focus-visible` rule directly; it is used at exactly one call site
  (line 603, the per-row Remove button). Add a class alongside the existing
  inline style (e.g. `className="q-remove"` next to `style={quietBtn}`) and,
  in `src/app/globals.css` near the confirm-flow rules (~line 862-930), add
  `.q-remove:hover, .q-remove:focus-visible { color: var(--bad-fg); }`. There
  is no `--bad-fg` CSS var yet - `src/config/tokens.ts` line 80 has
  `badFg: "#b3372f"` as a JS-only value; add `--bad-fg: #b3372f;` to the
  `@theme` block in `globals.css` (line 3-28) the same way `--accent`/
  `--accent-hover` (lines 22-23) already mirror `T.accent`/`T.accentHover` -
  same value, not a new colour, so `palette.test.mts` (which audits hex values
  written outside `tokens.ts`) should treat it the same way those two are
  treated. Do not use `warnFg` (`#a95912`, amber) - Danny said "red", and
  `badFg` is the token already used for errors on this same screen (line 458,
  the alert paragraph). Verify: `npx tsc --noEmit`, `npm run check`; on a
  local harness, tab to a Remove button and confirm it reads red on
  keyboard focus, and hover with a mouse confirms the same colour.

- [x] R35 -> f1746dc (superseded by R42; its link and FaqHashOpen removed there) SUPERSEDED by R42 below (Danny, docs/danny.md - filed 2026-09-27,
  reversed same day). Do not build this item as written - the sentence it
  targets is being replaced outright, "here is why" link and all. Read R42
  first; if R42 is already done, tick this one too with a note pointing at
  R42's commit rather than building the fix below. Original text kept for
  provenance: Confirm screen: "here is why" links to /#faq and lands on the FAQ
  section, not the specific answer (Danny, docs/danny.md - filed
  2026-09-27). `src/components/scan/ConfirmScreen.tsx` line 611-618, the
  footer sentence ends with a `<Link href="/#faq">here is why</Link>` next to
  the search-volume disclaimer ("No search volume against them,
  deliberately - "). Grepped `#faq` across `src`: this is the only link to it
  on the whole site, so there is nothing else to check once this is fixed.
  The matching FAQ answer is `src/components/home/HomeFaq.tsx` line 51,
  `q: "Why is there no search volume anywhere in this?"` - today none of the
  `FAQS` entries (the `Faq` type, line 22) carry an `id`, and the `<details>`
  rendering them (line 109, `<details key={f.q} ...>`) has none either, so
  `/#faq` can only land on the section (`id="faq"`, line 99), never the row.
  Add an optional `id` field to the `Faq` type, set it only on the
  search-volume entry (e.g. `id: "faq-search-volume"`), and pass
  `id={f.id}` on its `<details>` element. Point `ConfirmScreen.tsx`'s link at
  `/#faq-search-volume` instead of `/#faq`. A modern browser auto-expands a
  `<details>` whose id is the fragment target, so no extra JS is needed -
  confirm that is actually true in the browser used to verify, and if it
  is not, open the details manually via the existing `open` prop keyed off
  `location.hash` instead of assuming it. Verify: `npx tsc --noEmit`,
  `npm run check`; load `/#faq-search-volume` directly and confirm the page
  scrolls to and opens that row; click "here is why" on the confirm screen
  (local harness) and confirm the same.

- [x] R36 -> 703fce7 Confirm screen above the fold is misaligned against
  `ConfirmScreen.dc.html`/`Flow1Confirm.dc.html` (Danny, docs/danny.md -
  filed 2026-09-27). Read `docs/boards-2026-09-25/Flow1Confirm.dc.html`
  first. The likely root cause, to check before changing anything else:
  `src/app/globals.css` line 866-871, `.confirm-top` is a **two-column**
  grid (`grid-template-columns: 7fr 5fr`, one 24px gap), while the section
  headings below it - `.confirm-head` (line 874-884) and the same pattern
  used for the clusters intro (`ConfirmScreen.tsx` line 487, `className=
  "board-head confirm-head"`) - are a **twelve-column** grid
  (`repeat(12, minmax(0,1fr))`, `GRID12` in `src/config/tokens.ts` line
  95-100, same 24px gap). A 2-column 7fr/5fr split and a 12-column span-7/
  span-5 split do not land on the same pixel edges at the same container
  width (the 12-column version has eleven internal 24px gaps counted into
  its track sizing, the 2-column version has one) - which is exactly Danny's
  symptom: "the 'Which clusters matter to you' intro starts at neither the
  left column nor the card column." Change `.confirm-top` to the same
  `repeat(12, minmax(0,1fr))` system, with the left content block at
  `grid-column: span 7` and the card at `span 5`, so every section on this
  screen shares one set of column edges. Separately check, against the
  board: the headline block (`ConfirmScreen.tsx` lines 356-379 - domain
  micro label, h1, intro `<p>`, optional "From the site" `<p>`) each carry
  their own `maxWidth: "62ch"` (lines 370, 375) rather than a shared
  container width, which is the likely cause of each wrapping at a different
  point - put them under one shared max-width instead of three independent
  ones. And check the card's top (`CARD` styled div, line 381,
  `alignSelf: "start"`) against the domain label's top (line 356-357) at
  1280 and 390 once the grid fix lands - `align-items: start` on
  `.confirm-top` should already line them up; if it still does not, that is
  a second, separate defect to log rather than assume fixed by the grid
  change. Verify: `npx tsc --noEmit`, `npm run check`; shoot a local harness
  of the confirm state against `Flow1Confirm.dc.html` at 1280 and 390 with
  `docs/parity/shoot.mjs`, confirm the three paragraphs wrap at one width,
  the card top aligns with the domain label, and the clusters intro starts
  at the same column as both.

- [x] R37 -> 703fce7 (verified, no change) Confirm screen: verify the primary button's question count always
  matches the footer's live count (Danny, docs/danny.md - filed
  2026-09-27). Danny describes a screenshot reading "Run 5 questions" on the
  button while the footer read "4 of a possible 5" after a removal.
  Read `src/components/scan/ConfirmScreen.tsx` lines 336-351 first: today
  the button label (`primaryLabel`, line 342, `"Run " + kept.length + ...`)
  and the footer text (`footerText`, line 344-351, `kept.length + " of a
  possible " + MAX_QUESTIONS + ...`) both read the same `kept` array (line
  277) in the same render, so on the current tree the two cannot disagree by
  construction - this may already be fixed by an earlier item (`9733e4d`,
  `97a2a38`, or `1408c89` per `git log -- ConfirmScreen.tsx`) rather than
  something this item needs to change. Do not assume that from reading
  alone - Danny's ask is to *verify* it, the same standard as R27. On a
  local harness (no live Turnstile token needed - Q07's approach), load the
  confirm state, remove a question from a cluster with more than one row,
  and read both the button label and the footer line at that moment. If
  they already agree, log that as a live-verified negative (screenshot in
  `docs/parity/`) rather than leaving Danny's report unanswered. If they
  actually disagree, find the real cause (a stale closure, a state update
  that does not batch with the other, or a `kept` computed twice from
  different inputs) and fix it there. Verify: `npx tsc --noEmit`,
  `npm run check`; the local harness screenshot above at the moment right
  after a removal, both numbers read together.

- [x] R38 -> rules.md section written 27 Sep (docs untracked; migration file in c82fa07, not applied - see blocked.md) Record the search-volume reversal in docs/rules.md (Danny,
  docs/danny.md - filed 2026-09-27, supersedes the 20 Sep 2026 decision to
  drop search volume from the scan). The old decision was never written into
  `docs/rules.md` itself - it lives only as a code comment
  (`src/lib/scan/pipeline.ts` ~line 1126-1152, "The search volume step was
  here, and it came out on 20 September 2026 on Danny's instruction") and as
  two censuses in `src/lib/scan/request-shape.test.mts` (~line 255-322,
  "nothing in the tree calls the search volume endpoint" and "nothing writes
  scan_questions.search_volume"). Add a new dated section to `docs/rules.md`
  (follow the pattern of the other reversal sections, e.g. "Four-tier sequence
  tempo (Danny, 25 Sep 2026 - reverses the single 16s pace)" at line 470):
  title it something like "Search volume returns, at keyword level (Danny, 27
  Sep 2026 - reverses the 20 Sep 2026 removal)". State plainly: the questions
  stay the AI prompts, unchanged; each question additionally gets one derived
  Google head keyword, its monthly search volume and the scan domain's SERP
  rank for that keyword; the old reason for removal - "long-tail questions
  return no volume" - does not apply to a derived head keyword, which is why
  this is a reversal and not a re-litigation. Cross-reference R39-R43 below,
  which are the code/copy/storage halves of the same reversal, so a reader of
  `rules.md` alone can find all of it. This item is docs-only - no `tsc`/
  `build`/`check` gate applies to it in isolation, but do not push it as a
  bare commit with nothing else; land it in the same push as R39 or R41 so
  the rule and the code it describes move together.

- [x] R39 -> 2c56710 Keyword derivation: one derived Google head keyword per question
  (Danny, docs/danny.md - filed 2026-09-27, part of the R38 reversal). For
  each of the scan's questions, have Claude propose 3-5 candidate head
  keywords. Rule for a candidate to pass: drop filler words
  (best/top/who offers/which/the year/the country word); every candidate must
  keep a supplier noun (providers, companies, lenders, software, agency, etc.)
  - if the question has none, add the category's own supplier noun; the bare
  category alone is never allowed (e.g. "business cash flow finance" is
  rejected, "business cash flow finance providers" is allowed). Example from
  Danny's note: "best business cash flow finance providers uk" ->
  "business cash flow finance providers". Read `src/lib/scan/anthropic.ts`
  (already the home of `generateQuestions`, called from
  `src/app/api/scan/[token]/questions/route.ts`) for the existing pattern of
  one batched Claude call per scan - the candidate-keyword call should follow
  the same shape, one call for the whole question set, not one per question.
  Once candidates exist, make ONE batched DataForSEO Google Ads search-volume
  call for every candidate across every question, in the scan's market - this
  is a deliberate, narrower reinstatement of the endpoint `request-shape.test.mts`
  currently forbids by name (`keywords_search_volume`, and the helpers
  `readSearchVolumes`/`collectVolumes`/`volumeKey` named in the comment at
  `src/lib/scan/dataforseo-request.ts` line 214-223, which were deleted on 20
  Sep and can be resurrected or rewritten). Pick, per question, the
  highest-volume passing candidate; if every candidate for that question reads
  zero, pick the shortest passing candidate. Where in the flow: the read
  candidates for this hook is `src/app/api/scan/[token]/confirm/route.ts`
  ~line 217-260, where `scan_questions` rows are inserted today (currently
  `{ scan_id, idx, question, kind }`, no keyword) - add the chosen keyword to
  that insert (needs R41's migration first). Verify: `npx tsc --noEmit`; a
  local harness call confirming candidates are generated and filtered per the
  rule above (reject "business cash flow finance" alone, accept "... providers");
  update (never silently delete) the two `request-shape.test.mts` censuses
  named above with a dated reason ("Danny, reversed 27 Sep 2026, R39") so they
  assert the narrower shape - one batched volume call scoped to derived
  keywords, not the old per-question-text call - rather than forbidding the
  endpoint outright.

  Builder note, 27 Sep (dbcbb27, f78ff27, c4863a9): every piece exists but
  none is wired. The rule is `target-keyword.ts`, the model call is
  `keywordCandidates` (anthropic.ts), and the batched volume request/reader is
  `keywordVolumeRequest`/`keywordVolumes` (dataforseo-request.ts). The volume
  census now holds the new path to that one file. When the call is wired in
  confirm/route.ts via dataforseo.ts, add dataforseo.ts to that census list
  and update "nothing writes search_volume" with a dated reason. Note that
  `pickKeyword` takes Map<string, number> and `keywordVolumes` returns
  number | null, so drop the nulls at the join. Wiring waits on R41.

- [x] R40 -> 2c56710 (measured per-scan cost still to log on the first live scan after it; builder cannot run one) Keyword rank: one Google organic SERP read per chosen keyword
  (Danny, docs/danny.md - filed 2026-09-27, part of the R38 reversal). This is
  separate from the existing per-question `google_rank`, which comes free off
  the `google_aio` engine's own SERP read for the question text itself
  (`src/lib/scan/pipeline.ts` ~line 596-615, `a.googleRank`) - Danny's note
  says explicitly to keep that one stored as it is. The new read is one
  additional organic SERP lookup per chosen keyword (from R39), depth 20 (the
  existing `SERP_DEPTH` constant, `src/lib/scan/dataforseo-request.ts` line
  52), in the scan's market, checking whether the scan's own domain appears -
  `readRankingFootprint` in `src/lib/scan/dataforseo.ts` (~line 101-119) is the
  closest existing pattern for a standalone DataForSEO Labs/SERP call outside
  the per-question engine loop, though it reads domain rank overview rather
  than a keyword SERP, so this is a new function alongside it, not a rename.
  Add the new call's cost into the same `dfs_cost` accumulator pipeline.ts
  already threads through (`p_dfs_cost: spend.dfsCost`, ~line 298), and
  register the new call as a paid door with a true reason in whichever census
  enumerates them - `src/app/api/spenders.mts` /
  `src/app/api/spend-gates.test.mts` is where `/api/scan/[token]/confirm`'s
  paid-door status already lives (see docs/blocked.md item 22's table) if the
  read happens there, or the pipeline's own accounting if it happens later -
  pick whichever matches where R39 hooked in. Log the measured per-scan cost
  of the combined new calls (volume + rank) on the first live scan that runs
  after this ships, in `docs/parity/log.md` or this item's own tick line.
  Verify: `npx tsc --noEmit`, `npm run check` (spend-gates census updated with
  a true reason, not weakened); a local harness or the first live scan
  confirming a rank is stored per question with a keyword.

  Builder note, 27 Sep (392c318): pure half built, not ticked. The request is
  `keywordRankRequest` (dataforseo-request.ts), the parser is `parseOrganic`,
  and `rankOf` has moved to engines.ts. Left to do: the call site, the
  dfs_cost accounting, the spend census registration and the measured cost.
  All of it waits on R41.

- [x] R41 -> 2c56710 (Danny applied 20260927000000; read back live 27 Sep: GET /api/scan/57520fc7.../full returned 200 with target_keyword, search_volume, keyword_rank present and null on every question of that pre-ship scan) Storage: target_keyword and keyword_rank columns, additive migration
  (Danny, docs/danny.md - filed 2026-09-27, part of the R38 reversal).
  `scan_questions.search_volume` already exists as a column - it has been
  written on no row since 20 Sep 2026 (kept deliberately per the comment in
  `src/lib/scan/pipeline.ts` ~line 1126-1140: "dropping it is destructive...
  rows written before today carry real measurements") - so writing into it
  again needs no DDL, only a call site. Add `scan_questions.target_keyword
  text` and `scan_questions.keyword_rank integer` as one additive migration
  under `supabase/migrations/`, following the existing naming convention
  (`YYYYMMDDHHMMSS_description.sql`, next after `20260925000000_...`) and the
  carve-out Danny authorised 19 Sep 2026 (additive only - add column, no
  destructive DDL). Apply it and read the new columns back on a real row
  (`select target_keyword, keyword_rank from scan_questions limit 1` via
  whatever read path is already used to verify prior additive migrations, e.g.
  a route whose select runs ahead of its not-found branch, per the pattern
  `docs/blocked.md` item 34 records) before pushing any code that writes them.
  If the migration cannot be applied and verified this run, log it to
  `docs/blocked.md` per the inbox's own rule and do NOT push R39/R40's writer
  code ahead of it - an unapplied column breaks the writer, not just leaves it
  inert. Also add both new fields to the `ScanQuestion` type in
  `src/lib/scan/contract.ts` (near `google_rank: number | null;` at line 130)
  and to `scan_teaser` in the relevant migration if that RPC needs to carry
  them to the client (see the "NEW: q.google_rank" pattern already in
  `20260919210000_teaser_question_google_rank.sql` for exactly this shape).
  Verify: `npx tsc --noEmit`, `npm run check`; the read-back above, stated as
  what was read and its value, not just "migration applied".

- [x] R42 -> f1746dc Confirm screen and homepage FAQ: rewrite the "no search volume" copy
  (Danny, docs/danny.md - filed 2026-09-27, part of the R38 reversal,
  SUPERSEDES R35's "here is why" link fix - do not build R35 as written, build
  this instead). `src/components/scan/ConfirmScreen.tsx` ~line 348-352,
  `footerText` currently ends "... No search volume against them,
  deliberately - " followed by a `<Link href="/#faq">here is why</Link>` at
  line 611-618. Replace the whole clause: no more "no search volume,
  deliberately" and no more "here is why" link to the FAQ - say instead that
  each question also gets a Google keyword, its monthly searches, and the
  scan domain's ranking for it, in the report (match R43's actual display
  format so the promise and the delivered thing agree). If nothing on this
  screen still needs a link to the FAQ, drop the `<Link>` entirely rather than
  leaving a link with nowhere honest to point. Also rewrite
  `src/components/home/HomeFaq.tsx` line 51's entry, `q: "Why is there no
  search volume anywhere in this?"` (hint at line 52, "Because it is zero on
  the questions that matter") - this question no longer has a true answer once
  R39-R41 ship, so change the Q, the hint and the answer body to describe what
  now happens (a derived keyword per question, not per raw prompt, and why
  that keyword can carry real volume where the question text could not).
  Finally, grep case-insensitively for "search volume" across `src` and check
  every other hit (docs/danny.md line 42 names this explicitly) for a stale
  claim that "the scan has no search volume" - fix each one found. Verify:
  `npx tsc --noEmit`, `npm run check`; re-grep "search volume" and "here is
  why" and confirm no orphaned link or contradicted claim remains; shoot the
  confirm screen and `/#faq` at 1280 and 390.

  Reviewer note, 27 Sep (post-703fce7): despite the "do not build R35 as
  written" instruction above, `703fce7` built R35 anyway - `ConfirmScreen.tsx`
  now links `/#faq-search-volume`, `HomeFaq.tsx` has that `id` on the
  search-volume row, and a new `FaqHashOpen.tsx` opens it on load/hashchange.
  Live-verified, both present in production. It is not wrong today (the "no
  search volume, deliberately" copy is still true until R42 ships), but it is
  work this item now has to account for rather than build fresh: when you
  replace `footerText` and drop the `<Link>`, decide whether `FaqHashOpen.tsx`
  and the row `id` still earn their keep (something else may still deep-link
  to `/#faq-search-volume`) or are dead code to remove in the same push -
  don't leave them stranded.

- [x] R43 -> 9bdd513 + 2c56710 (no new code; teaser migration 20260927010000 applied per danny.md 27 Sep. Live 27 Sep 08:41Z on /scan/6839484c... (crunch.co.uk): "online accounting firms - 90/mo - Google #1", "accountants with bookkeeping software - not in top 20" (null volume drops the clause), "limited company accountants - 1,000/mo - Google #16", keyword-less rows keep "Google #9" / "Not in Google top 20"; pre-R41 scan 57520fc7... unchanged. 1280 and 390, stacks under the question at 390. Under-10 covered by result-figures tests, no live row under 10 yet) Result page: question-by-question Google column shows keyword,
  volume and rank (Danny, docs/danny.md - filed 2026-09-27, part of the R38
  reversal - depends on R41's columns existing on the row being rendered).
  `src/components/scan/ResultView.tsx` lines 201 and 258 currently render
  `typeof q.google_rank === "number" ? "Google #" + q.google_rank : "Not in
  Google top " + SERP_DEPTH` - this stays exactly as it is for any scan whose
  `q.target_keyword` is absent (every scan before this ships; Danny is
  explicit: no backfill). For a question that DOES carry a `target_keyword`
  (R39/R41), render instead: `<keyword> - <volume>/mo - <rank phrase>`, e.g.
  "business cash flow finance providers - 480/mo - not in top 20" - reuse the
  existing rank phrasing (`"Google #" + rank` or `"not in top " + SERP_DEPTH`,
  lowercased to fit the new sentence) rather than inventing new wording for
  the same fact. Volume formatting: a value under 10 reads "under 10/mo",
  never "0/mo" or "0" - DataForSEO's Google Ads volume endpoint is banded at
  the low end, so an exact single-digit figure is not a real measurement and
  must not be printed as one. Must fit at 390 without breaking the row layout
  - stack the keyword/volume/rank line under the question text if it does not
  fit beside it, the same responsive approach other question-row facts on
  this page already use. Verify: `npx tsc --noEmit`, `npm run check`; shoot
  `/scan/[token]` result screen at 1280 and 390 with both a pre-R41 fixture
  scan (old display, unchanged) and a fixture carrying `target_keyword` +
  `search_volume` + `keyword_rank` (new display); confirm a volume of 3 or 7
  reads "under 10/mo".

  Builder note, 27 Sep (9bdd513): display half built, not ticked. `googleLine`
  in `result-figures.ts` drives both the row and the drawer header; 3 tests
  cover the old line, the keyword line and "under 10/mo" for 0/3/7/9. The row
  cell wraps only when a keyword is present. It stays open until R41 is
  applied and the teaser/unlock reads carry the three fields.

  Builder note, 27 Sep (2c56710): the unlock payload carries the three fields
  live; the teaser needs `20260927010000_teaser_question_keyword.sql` applied
  (DANNY, blocked.md). Tick once it is and a fresh scan shows the line. Neither
  fixture-scan shot has been taken, because `/scan/[token]` 404s locally
  without a DB row.

- [x] R44 -> c82fa07 Result page secure card: reword the CTA sentence (Danny,
  docs/danny.md - filed 2026-09-27, unrelated to the R38 search-volume
  reversal - a plain copy change). `src/components/scan/ResultView.tsx` line
  614: `Want us to secure the hard ones?` becomes `Want us to secure these
  placements for you?`. Grepped already: this exact string appears at exactly
  this one line in `src` - no other surface (`result-figures.ts`, any test
  fixture, the emailed report) carries it today, so this is a single-line
  change, but re-grep after editing to confirm nothing was missed, per
  Danny's own instruction to check. Verify: `npx tsc --noEmit`, `npm run
  check`; grep `"secure the hard ones"` case-insensitively across `src` and
  confirm zero hits; shoot the result page's secure card at 1280 and 390.

- [x] R45 -> 2c56710 (wiring landed in 2c56710; blocked.md R41 line already marked resolved with it. Read back live 27 Sep 06:52Z: /api/scan/57520fc7.../full 200, target_keyword/search_volume/keyword_rank keys present, null on a pre-ship scan) R41 migration confirmed applied - unblock R39/R40/R41 wiring
  (Danny, docs/danny.md - filed 2026-09-27, lines 45-46, the same instruction
  pasted twice; line 47 says file it once). `supabase/migrations/
  20260927000000_question_target_keyword.sql` is applied in production:
  `scan_questions.target_keyword text` and `scan_questions.keyword_rank
  integer` both exist, both nullable - read back and confirmed by Danny
  directly, 27 Sep. This clears the open DANNY line in `docs/blocked.md`
  (near the end of the file - "apply `supabase/migrations/
  20260927000000_question_target_keyword.sql` (R41, 27 Sep 2026)... The
  builder has no apply path... R39/R40/R42/R43 ... held until it is
  applied"). Move that line to Settled with today's date, Danny's
  confirmation, and the commit that lands this item, in the same push.
  R39, R40 and R41 above are each already fully specified, and each already
  carries a "Builder note" recording exactly which pure piece exists unwired
  (`target-keyword.ts`'s rule, `keywordCandidates` in `anthropic.ts`,
  `keywordVolumeRequest`/`keywordVolumes` and `keywordRankRequest`/
  `parseOrganic` in `dataforseo-request.ts`, `rankOf` in `engines.ts`) and
  exactly what is left (the call site in `confirm/route.ts` ~line 217-260,
  the `dfs_cost` accounting, the two census updates named in R39/R40, the
  `ScanQuestion`/`contract.ts` fields, and the teaser/unlock reads R43's own
  note names as still missing). None of that needs restating here - the only
  thing that changed is the premise every one of those notes was written
  against ("no call site until the R41 migration is applied"), which is no
  longer true. Proceed with all three now, in the order R41 (verify the
  read-back live) -> R39 -> R40, so R43's already-built display finally gets
  real data to render. Per Danny's 27 Sep instruction: a null `keyword_rank`
  shows "not in top 20" the same as no keyword at all, whether the SERP read
  failed or the domain genuinely ranked outside depth 20 - do not distinguish
  the two states in the copy.
  Verify: `npx tsc --noEmit`, `npm run check`; read `target_keyword` and
  `keyword_rank` back off a real `scan_questions` row - a fresh scan if one
  runs this session, otherwise the route's-own-select-list trick
  (`docs/rules.md`, "a route can validate its own select list from outside")
  against a nonsense token on a route that selects the column ahead of its
  not-found branch; confirm the blocked.md DANNY line is moved to Settled
  with this item's commit.

- [x] R46 -> 33c7d33 Mobile hero line break, and engine names to logos in three spots
  (Danny, docs/danny.md - filed 2026-09-27, line 48). Two unrelated fixes in
  one note - do both in one push, they touch different files, but it is one
  queue item.
  1. Mobile hero line break: `src/components/home/HomeHero.tsx` (~lines
     38-41, the painted headline `<p>`: "Every AI tool shows you the gap."
     `<br/>` `<span>We close it.</span>`) and `src/components/scan/
     HeroSection.tsx` (~lines 72-74, the same two-line `<h1>`): below 640px,
     drop the `<br/>` so "We close it." runs straight on after "gap." on the
     same line, and give "We close it." `white-space: nowrap` so it never
     splits mid-phrase. Desktop keeps the existing break. Both boards paint
     the desktop break and the phone board does not, so this is very likely a
     `@media (max-width: 640px)` rule in `globals.css` (`display: none` on
     each `<br/>`, `white-space: nowrap` on the accent span) rather than a
     JSX change - read `docs/boards.md`'s breakpoint convention before
     picking the mechanism, and confirm both files' current line numbers
     before editing, since either may have drifted since this note was
     written. Verify at 390 and 1280 with a shoot: at 390 "gap. We close it."
     reads as one unbroken run (it may still wrap naturally at a narrower
     width, but "We close it." itself must never split across two lines); at
     1280 the break is unchanged.
  2. Engine names to logos, engine word dropped throughout - leave every spot
     that already shows logo plus name alone (`ScanProgress` chips,
     `EngineDemo` cards, `ResultView`'s sidebar and its chips - Danny named
     these explicitly as out of scope):
     - `src/components/ProcessSequence.tsx` (~lines 241-247, the
       `/alwaystracked` weekly-report panel's column headers):
       `FREE_ENGINES.map((e) => <span>{ENGINE_SPECS[e].label}</span>)`
       becomes `EngineLogo` only, centred over its dot column -
       `ENGINE_SPECS[e].label` moves to the logo's `title` and an `sr-only`
       text node rather than disappearing, so the column stays identified
       for a screen reader. Check it fits at 390 (four columns over dot rows
       is already tight).
     - `src/app/pr-agencies/page.tsx` (the `ANSWERS` array ~lines 46-49,
       `engine: "ChatGPT · brand question"` etc., rendered at ~line 162 as
       `<span>{a.engine}</span>`): split the string into a logo (mapping the
       engine name in the string to `EngineLogo`) plus the question-type half
       ("brand question" / "category question" / "objection question"),
       engine word dropped from the visible text.
     - `src/app/seo-agencies/page.tsx` (~line 189, `<span>ChatGPT</span> ·
       best invoicing software for freelancers`): the `ChatGPT` span becomes
       `EngineLogo` for ChatGPT specifically - this is one fixed mock, not a
       map over all four engines like the other two sites.
  Verify: `npx tsc --noEmit`, `npm run check`; shoot `/`, `/scan`,
  `/alwaystracked`, `/pr-agencies` and `/seo-agencies` at 1280 and 390,
  confirming each of the three sites now shows a logo with no adjacent
  engine-name text, and that the untouched surfaces (ScanProgress, EngineDemo,
  ResultView) are unaffected.

- [x] R47 -> 8b22dfe (live read 27 Sep 08:41Z, GET https://alwayscited.com/api/scan/6839484caa0505c044ba3d43dc17a97b: every question object carries target_keyword, search_volume, keyword_rank - e.g. "online accounting firms"/90/1, "limited company accountants"/1000/16. R43 ticked, blocked.md line marked resolved in place) Teaser migration confirmed applied - unblock/close R43 (Danny,
  docs/danny.md - filed 2026-09-27, line 49). Danny's word: "Applied
  20260927010000_teaser_question_keyword.sql (Claude via Chrome, read back
  true, live teaser carries target_keyword/search_volume/keyword_rank on the
  crunch.co.uk scan)." This is the exact migration `docs/blocked.md`'s open
  DANNY line (near the end of the file, `supabase/migrations/
  20260927010000_teaser_question_keyword.sql`) has been waiting on since 27
  Sep 06:52 - four run notes under it each read the live teaser as still
  missing the three keys. R43 itself (`src/components/scan/ResultView.tsx`,
  `googleLine` in `src/lib/scan/result-figures.ts`) is already built per its
  own builder notes (9bdd513, 392c318, 2c56710) - this item is the
  verification-and-close step, not new display code.
  1. Read the live teaser back yourself before touching anything: `GET
     /api/scan/57520fc70f3cf9dced06f60186ae059e/full` (the standing .co.uk
     inbox URL) or, if reachable, the crunch.co.uk scan Danny named, via
     `node`+`fetch`, and confirm the question objects now carry
     `target_keyword`, `search_volume` and `keyword_rank` keys (not just the
     six from before: `idx`, `kind`, `named`, `answered`, `question`,
     `google_rank`). If the standing .co.uk scan predates R39-41 and so has
     nulls, that is expected (no backfill) - the keys existing at all is what
     this checks, not their values.
  2. If confirmed: move the `docs/blocked.md` DANNY line for
     `20260927010000_teaser_question_keyword.sql` to Settled, with today's
     date, "Danny, 27 Sep" and this item's commit, in the same push. Tick R43
     in this file too, pointing at this item's commit, since its only
     remaining blocker was this migration and the display code is already
     shipped.
  3. If NOT confirmed (the keys are still the old six): do not close
     anything. Log exactly what was read, the same way the four prior run
     notes under the blocked.md line did, and leave R43 and the blocked.md
     line open - Danny's note may describe a different scan/environment than
     what this session can reach, and a live read that disagrees with his
     word is itself something to report, not to override.
  Verify: the live read in step 1, quoted (URL, keys present/absent) in this
  item's tick line or docs/parity/log.md; `npx tsc --noEmit`, `npm run check`
  if any file changes (there should be none beyond the two docs).

  Reviewer note, 27 Sep 08:50 UTC: step 1 done, so the builder can go
  straight to step 2. `GET https://alwayscited.com/api/scan/
  57520fc70f3cf9dced06f60186ae059e` (the `scan_teaser` RPC route,
  `src/app/api/scan/[token]/route.ts`) now returns question objects with
  keys `idx,kind,named,answered,question,google_rank,keyword_rank,
  search_volume,target_keyword` - all three new keys present, all null on
  every row of this pre-ship scan (expected, no backfill). Confirmed
  separately: `/api/scan/<token>/full` (the unlock payload) already carried
  them, unchanged by this. Danny's word is verified live.

- [x] R48 -> e1d523a (live 27 Sep: crunch.co.uk and the US scan read "It would be difficult for you to place these yourself.", the .co.uk inbox scan "You could place 3 of these yourself.", 1280 and 390; the "all" case only by test, no live scan has every row Easy) Result page placement line: word the count's three cases
  separately (Danny, docs/danny.md - filed 2026-09-27, line 50).
  `src/components/scan/ResultView.tsx` lines 583-587, `selfServeLine`:
  ```
  function selfServeLine(r: RunScanResponse): string | null {
    const { easy, scored } = selfServeCount(r.opportunities ?? []);
    if (!scored) return null;
    return "You could place " + easy + " of these yourself.";
  }
  ```
  Change the return so three cases read differently, in this order:
  `easy === 0` -> `"It would be difficult for you to place these yourself."`;
  `easy === scored` -> `"You could place all of these yourself."`; otherwise
  keep the existing `"You could place " + easy + " of these yourself."`. Do
  not touch `!scored` (still `null`, still nothing drawn). `HardOnes` (line
  596) and the "Want us to secure..." card below it are explicitly to stay as
  they are - Danny's note says so - so leave that function and everything it
  renders untouched; only `selfServeLine`'s return changes.
  There is no dedicated test for this string today (grepped
  `selfServeLine|of these yourself` across `src` - only the function itself
  and its doc comment in `placement-difficulty.ts` line 98, no fixture test).
  Add one alongside the existing `placement-difficulty.test.mts` or as a new
  case in whichever result-copy test renders `ResultView`/`selfServeLine`
  against a fixture, covering all three bands: `easy: 0, scored: N` (N>0),
  `easy: N, scored: N`, and `easy: k, scored: N` (0<k<N).
  Verify: `npx tsc --noEmit`, `npm run check`; the new test cases; shoot the
  result page's "Where to get placed" heading line at 1280 and 390 with
  fixture opportunities producing each of the three cases and confirm the
  right sentence renders for each.
