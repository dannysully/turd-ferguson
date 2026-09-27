# Parity log

Baseline: **845 tests, 845 passing, 0 failing, 0 skipped** at `3ac41a6`, 2026-09-25T10:30:28Z.

Recorded after `rm -rf .next && npm run build && npm run capture && npm run check`.
**The capture is part of the baseline, not an optional extra.** On a clean build
without it the same tree reports 840/845 with 4 failing and 1 skipped: the
contrast, canonical, sitemap and dynamic-render sweeps read the captured output
and a clean build wipes it. A skip reads exactly like a pass, so a run that
builds and checks without capturing will believe it has a clean baseline and
will not notice it broke one of those four.

## Q01 - the four tiers, live - `bd6d2e7`, `3545dd8` - board `Journey.dc.html`

**Found:** production at `3ac41a6` served that commit's HTML with a stale stylesheet.
`/_next/static/chunks/0ny167djlbgig.css` (27,530 B, `immutable`, no `?dpl=`) had
none of `.proc-head/.proc-stage/.proc-qrow/.proc-headline`; a local build of the same
tree makes a 30,024 B sheet with them. Live, the tiers were one unstyled column with the
question grid run together. `supportsImmutableAssets: false` had not been enough.
**Fix:** `outputHashSalt: VERCEL_GIT_COMMIT_SHA` in `next.config.ts`, so each deploy
gets asset names no earlier deploy used. Verified by reading the served CSS at
`bd6d2e7` (`035s2aikdvi2s.css`): the rules are there, including this commit's 46px headline.
Also: active tab ringed as on the board; headline 40 -> 46px at >=900px; at 390 the
rail scrolls inside itself instead of running off the page.

**Now matches:** two columns (claim left, panel right), heading/standfirst split,
ringed active tab with filling bar, bridge card ("Found the gaps. Want to be in them?"
-> alwaysmentioned), price and basis from `pricing.ts`.

**Still differs, deliberately or deferred:**
- Panel contents are the repo's, not the board's: mentioned shows three cited pages +
  engine pills (board: four placements with Placed/Next month and a ChatGPT answer
  card); cited has no source-to-page connector drawing and a light schema block (board
  dark); everywhere shows `[Client A-C]` with engine marks (board: named brands,
  sparklines, markets). Placeholder clients are deliberate. The rest is panel redesign,
  not drift - candidate for its own item.
- Board's price basis ("You run the outreach", "Includes everything in ...") differs
  from `pricing.ts` `priceBasis`; `pricing.ts` wins.
- Timings: 16s + 5s bridges vs the board's 10s review loop (deliberate).
- At 390, "Google AI Overviews" wraps to three lines in the question grid header.

**Denominator:** homepage only. Beat states tracked/mentioned/cited/everywhere
(board 5/15/25/35s vs site 8/29/50/71s) and one bridge (site 18.5s) at 1280, local
and live; live at 390 (tracked), `--js-off`, `--reduced` - both show all four tiers
settled and stacked with bridge cards. The scan waiting screen was **not** shot: it
needs a running scan and there are no tokens in the inbox. Same component and CSS.
Build note: `rm -rf .next` was refused by the session's permissions, so builds ran
over the existing `.next`; check was 845/845 after build + capture both times.

Shooter additions (docs/parity/shoot.mjs, untracked): `--wait load` (production never
reaches networkidle - the live run timed out at 30s on it), `--board-scroll` /
`--site-scroll "<css>"` to shoot a section below the fold. The four-tier section is
`section:has(#proc-tab-tracked)`. `docs/parity/poll.mjs <sha>` polls /api/version.
**Every live check from now on should also read the served stylesheet for a rule the
commit added** - the HTML and /api/version both said 3ac41a6 while its CSS was absent.

### Q02 scoping, not started (10:53Z, 21 min into a 35 min run)

Left open: the item is roughly an hour of work (dark header variant, dark form,
new demo component, two censuses) and starting it at minute 21 means overrunning the
run by most of that, or pushing it half-built. What the next run needs to know:
- `Main.dc.html` hero is **dark** (#111218 with two purple radial washes, 1040px tall)
  and the header sits on it (links #a1a1aa, lockup accent #a78bfa). The live hero and
  header are light. `Header` is sitewide in `layout.tsx`, so this needs a dark variant
  on `/` only.
- Field on dark: #1b1c23 / #2a2b33, "Run a free scan", sub-line "Five buyer questions,
  four engines, around two minutes. No card, no email." - check that copy against
  `scan-shape.ts` before using it. `LiveScanChecker` + Turnstile are drawn for light.
- Demo: pill-shaped typed question, four dark cards (#17181f / #262730) with a ranked
  list and a "Tallyroo not named" pill, then "Four AI engines. Not one named Tallyroo."
  12s loop. **The board does not show the brand arriving** - the queue line says it
  does; the board (later read) wins, so it ends on the miss.
- New off-palette values to register in `palette.test.mts` with board counts:
  #111218, #1b1c23, #2a2b33, #17181f, #262730, #24252d, #8b8b95, #6f7480, #fca5a5,
  rgba(239,68,68,.14), rgba(124,58,237,.22/.16). The contrast census will measure
  #8b8b95 and #6f7480 on #111218 - check both before choosing.
- `AnswerExplorer.tsx` (455 lines) carries one `#fbfbfc` site in the palette census;
  deleting it in Q03 moves that count.

### Q02 hero and engine demo - 15710d1, 1fcc17c (11:22Z)

Board `Main.dc.html`, top section (dark hero, 0-1040px), route `/`.

**Now matches:** dark ground #111218 with both purple washes, painted continuously
under the header (header dark on `/` only, via `usePathname`); 64px/700/-0.04em h1
with the #a78bfa accent line; standfirst copy, size and colour; the scan field as
one dark 520px pill with "Run a free scan"; the line under it (counts from
`scan-shape.ts`); the typed-question pill; four dark engine cards with ranked
lists and "Tallyroo not named" pills; the verdict, counted from `FREE_ENGINES`;
the "Illustrative..." line. The board's 12s loop (type, cards at .15s stagger,
pills, verdict), all under `html[data-motion="on"]`. AnswerExplorer is off the
page (file deleted in Q03).

**Still differs, and why:**
- Engine marks are `EngineLogo`, labels are the real ones ("Google AI Overviews").
- The Turnstile widget sits under the field (dark theme now); the board omits it.
- Nav links: kept the sitewide set. The boards disagree page to page (Main draws
  Packages / For agencies / Compare / Blog; others draw other sets), and Q25 needs
  one identical header.
- List numbers and the illustrative line use `T.faint`, not the board's #6f7480,
  which measures 3.99 on #111218 (under AA). `T.faint` is 7.36.
- The board ends on the miss; the queue line said the brand arrives. Board wins.
- Phone: the wash is sized to the 1040px board box, so on the taller phone hero it
  stops with a faint edge near y=1040. Mobile board draws a light hero; left to Q06.
- The demo loop's phase on the site trails page load, not the board's clock -
  compare states, not times.

**Found on the live check:** 15710d1 shipped a freshly-salted stylesheet that
still lacked every rule the commit appended to globals.css (cards stacked in one
column). Next 16.3's Turbopack filesystem build cache, restored by Vercel from
.next/cache, is the only source of an earlier build's work; 1fcc17c turns
`turbopackFileSystemCacheForBuild` off. Verified: the served sheet at 1fcc17c has
every class the local build has (`docs/parity/css-diff.mjs`), bar Tailwind utilities
local builds pick up from untracked scratch files.

**Census changes:** contrast walk fixed - a closing `</line>`/`</path>` popped the
ground under an inline svg, so everything after a mark was measured one level up
(self-test added). Palette census: fifteen hero values registered, one site each in
`components/home/dark.ts`, counts from `docs/boards-2026-09-25/`. Suite 845/845
after build + capture (built over the existing `.next`).

**Denominator:** `/` only. Local and live at 1280, demo states 1.5s/4s/7s (typing,
cards, settled); live at 390, `--js-off` and `--reduced` (both settled: all four
cards, pills and verdict visible). Served CSS read for `.demo-grid` at 1fcc17c.

### QF1 result copy and CTA - c3120d1 (11:30Z)

Board `ScanResult.dc.html` (placement rows and the "secure the hard ones" card),
`ResultView.tsx`, plus every TierName-in-a-link site in `src`.

**Now matches / done:**
- (a) Placement rows no longer print the difficulty basis. Under each page: "Cited
  by N of M engines", from a new `cited_by` in `deriveOpportunities` (distinct
  engines over that page's citation rows; M is the scan's `engines` list). The
  board's "Names ..." brands are **not shown**: `scan_brands` is per scan and per
  engine, so which brands a page names is not derivable, and the item says show
  nothing rather than invent it. `difficulty_basis` stays stored (difficulty.ts)
  and is out of the `/api/scan/[token]/full` payload and the `ScanOpportunity` type.
  New census `src/components/scan/result-copy.test.mts`: no "marketplace", "listed
  on" or dollar figure in ResultView, unlock, contract or the full route, the basis
  stays server-side, and no tier name inside a link.
- (b) The card is the board's dark ink card: "Want us to secure the hard ones?",
  "That is alwaysmentioned: placements in the pages the engines cite, links
  included." (TierName under `.on-dark`), white "See how it works" button to
  /alwaysmentioned.
- TierName inside `<a>`/`<Link>`, all five found: `Footer.tsx:109` (plans column -
  lockup now beside a "Details" link), `PackagePage.tsx:212` (upgrade line - lockup
  in the sentence, "See how it works" link), `PackagePage.tsx:250,255` (tier cards
  were whole-card links - now cards with a "See the plan" link, none on the current
  tier), `Header.tsx:45` (the logo: kept, the one allowed site, pinned by the census).

**Not verified:** the result page on real scans. Both inbox scan URLs are still
pending, and `/scan/[token]` 404s locally with no database. Verify on the tokens
when they arrive (Q11 covers the same pages).

**Denominator:** live `/alwaysmentioned` at 1280 and 390, full page (footer and
tier cards). Result page: 0 of 2 scans. Suite 848/848 after build + capture.

### QF2 waiting-screen tempo - b93d148 (11:33Z)

Board `Journey.dc.html`; `ProcessSequence.tsx`, `ScanFlow.tsx`.

**Done:** beat, bridge and step timing are a `tempo` prop. `WAITING_TEMPO` (8s beat,
2.7s bridges, 0.8s first step then 0.6s) on the scan waiting screen - about 40s
round, matching the board's 40s loop. `HOME_TEMPO` (16s / 5s / 1.6s / 1.2s, ~79s)
is the default, so the homepage is unchanged. Reversal recorded in `docs/rules.md`.

**Not verified:** the waiting screen's beat states against the board at matching
times. It only renders during a running scan; there are no inbox tokens and
Turnstile blocks a headless scan. Do it on the first real scan (Q08 covers the same
screen). Live homepage checked at 8s on the tracked beat: still the 16s pace.

**Denominator:** homepage, 1280, one beat state live. Waiting screen: 0 states.
Suite 848/848 after build + capture.

## Q03 - two ways into an answer, homepage order - `9536e10` - board `Main.dc.html`

**Now matches:** the board's lower section. 34px heading beside the standfirst on one
baseline; two 28px-padded cards, 20px titles, the round-up with Tallyroo placed at 3
and Pennywell renumbered 4, the drawn page with "Google #4" and "Now cited by ChatGPT";
the "Illustrative" line. Board's 9s loop under `html[data-motion="on"]`; the settled
frame is unscoped (live `--js-off` and `--reduced` both show placed + cited, a single
"4." on Pennywell). Order is now hero, two ways, four tiers, packages, results, FAQ.
**Removed:** `ScanFacts` (off the page), `AnswerExplorer` (already unimported), and
`worked-example.ts` + its test, whose only reader was AnswerExplorer. The listOf /
pickEngines test moved to `scan-shape.test.mts`. Censuses updated: palette (#fbfbfc
site list loses AnswerExplorer), verbatim-claims comment floor 18 -> 17 (the deleted
config held one comment mention). "3 of 4 engines" reads FREE_ENGINE_COUNT (copy census).
**Baseline moves:** 840/840, down from 845 at Q00 / the pre-Q03 count - the nine tests
in worked-example.test.mts went with the file they tested; one kept, moved.

**Still differs:** second card border is `T.washLine` (#e3d8fd), board #c9b5f7 -
not in the palette; lighter on screen. Board card title is a div, site uses h3. Phone
top padding 56px (board 88px, desktop only). At 390: cards stack, no board for it.

**Denominator:** homepage section only. Board and site at 6s (settled) 1280, local and
live; live 390, `--js-off`, `--reduced`. Build ran over the existing `.next` -
`rm -rf .next` is still refused by the session's permissions; build + capture + check
840/840.

## Q04 - packages, the tier staircase - `529d3eb` - board `Packages.dc.html`

**Now matches:** dark band with its own wash, 34px "Packages" beside the standfirst,
the drawn staircase (board path and step positions, scaled by percentage) with
each lockup and its price label; the light "What each tier adds" table - four tier
columns with lockup, 24px price, basis, CTA (dark button on the emphasised tier,
tinted column), eleven rows of ticks, dashes and You/Us; "Every tier is
white-label. How the line sits" and the Nomada line under it. Board 10s draw loop
under `html[data-motion="on"]`; live `--js-off` and `--reduced` show the stair drawn,
all four steps. No "Most taken" badge. The four cards and the white-label card are gone.

**Still differs, deliberately:** prices/basis are pricing.ts's - "Book a call" not
"Talk to us"/"Priced on volume"; tracked basis is the full priceBasis (four lines,
makes the header taller); mentioned/cited/everywhere show `positioning` where the
board has lines pricing.ts does not hold. The everywhere button reads "Talk to us"
(-> /contact) so it does not repeat the price cell. Row copy: "four AI engines" ->
"across the AI engines" (copy census forbids a typed engine count, and tracking's
engine set is not asserted to be the free scan's); "on-page work" dropped from the
link-insertions row - pricing.ts lists schema and link insertions for cited, not
on-page work. Emphasis tint is `T.wash` (#f4f0fe), board #faf7ff - not on the
palette. Stair steps are not links (no tier name inside a coloured link).
Phone: stair becomes a two-up list; the table keeps 760px and scrolls in its card.

**Censuses:** palette - `rgba(124,58,237,.2)` registered (dark.ts PACKAGES_WASH),
`rgba(17,18,24,0)` 2 -> 3 sites, `#e8e8ea` entry removed with the white-label card
that was its only site. `id="white-label"` kept on the line under the table as the
end marker price-surfaces reads. 840/840.

**Denominator:** homepage packages section. Board 7s vs site 7s at 1280, local and
live; local and live 390; live `--js-off`, `--reduced`.

## Q05 - FAQ, closing scan, footer - `fb0d01b`, `ac32322` - board `HomeFaq.dc.html`

**Now matches:** FAQ card, eight questions and hints, rows at the board's height
(summary line-height 1.3); closing card with the board's line - "Five buyer
questions, four engines, every answer and every source it cited. It takes around
two minutes, or we email you the result." - counted from `QUESTIONS` and
`FREE_ENGINE_COUNT` the way the hero counts; footer with the board's three columns
(Product in board order with "Coverage checker", For, Company) - the Plans column
the board never had is gone. One 44px gap above the footer on `/`, not 88px.
**Live fix (`ac32322`):** at 390 the footer was a `.board-head`, whose phone rule
sets `display:block` and dropped the grid's 24px row gap, so the columns ran
together. Removed; re-shot live on /compare at 390.

**Still differs, deliberately:** FAQ hints in `T.soft`, board `#9ca3af` (2.5 on
white, under AA). No Terms link - terms are not drafted. Footer year from the clock.

**Denominator:** `/` FAQ to footer at 1280 local and live, live `--js-off`,
`--reduced`, 390; footer checked on /about (1280, and `--js-off`), /blog (1280),
/compare (390, before and after the fix). 840/840.

## Q06 - phone - `b47a671` - board `Mobile.dc.html`

**The board only covers the first screen**, and it predates the dark hero: it draws
the light hero, a "Free scan" header button and ScanFacts ("What the scan tells
you"), which Q03 removed as the queue asked. So the first screen was compared for
layout, not palette: headline, standfirst, full-width field + button, the counts
line - all present live; the live checker's button runs full width (the local
build draws the fallback form, as it has no scan credentials, so the first-screen
comparison was taken from production).

**Below the fold (full-page 390, live):** no horizontal scroll (scrollWidth 390).
Fixed: FAQ question and hint ran together as inline text ("client?No, and it is...")
under `.board-head`'s phone `display:block` - one line each now. Packages table
label column 35.5% -> 26% on phone (min-width 760 -> 680) so the tier headers are
not seven lines deep; it still scrolls sideways inside its card. (Footer row gap
was fixed in Q05.)

**Still differs:** h1 at 34px (board 25px, on a light hero the canvas has since
replaced); header shows the menu button, not "Free scan"; the four-tier rail
scrolls inside itself (Q01). Full-page shots show scroll-reveal rows faded - that
is the reveal waiting for a scroll, not a defect; `--js-off` shows them settled.

**Denominator:** `/` only, 390. Board vs live first screen at 6s; live full page;
live FAQ at 390 with JS, `--js-off`; live `--reduced` first screen. 840/840.

## Q07 - confirm - `f4c9ce7` - board `Flow1Confirm.dc.html`

**How it was compared:** production has no reachable confirm state (it needs a scan row
that has not been confirmed, and starting one is a paid call behind Turnstile). So a
local-only harness page mounted `ScanFlow` at status `pending` for edge45.co.uk with
`fetch` stubbed to return that scan's five real questions and three clusters. The
harness was never committed; it is kept at `docs/parity/harness-page.tsx.txt` for Q08/Q10.
`docs/parity/measure.mjs` reads row, cell and legend boxes.

**Fixed:** 0px -> 14px between the category input and "Market" (a legend's top margin is
ignored in a fieldset); body rows 47px -> 42px (board 39) - the textarea's baseline and the
Remove cell's 16px line strut were both setting the row; "We found N." opens the clusters
standfirst, N interpolated (copy census refuses spelled counts); step label "Step 1 of 3 ·
Confirm" (and · Running, · Result) as on the board; at 390 the five row cells scrambled
across two columns - now named areas, question across the top, cluster/intent/Remove under it.

**Now matches:** 7/5 split, card, heading and standfirst, chip on/off styling and counts,
table header and columns, footer count sentence, Add a question. Drop a cluster: shot with
"ecommerce seo agency" off - button "Run 4 questions", footer "4 of a possible 5, across 2
clusters", row faded with a dash, rest renumbered.

**Still differs, deliberately:** sitewide header above the step bar (board: logo-only bar;
Q25 wants one header on every route); market is a UK/US toggle with the reason line
("Set from the .co.uk ending.") not a text field; button uses the sitewide `btn-primary`
gradient; "The result is free in full." not "Nothing on the result is gated" (the report has
an email unlock); questions standfirst ends "A free scan runs up to 5." - the board's "on a
paid plan you track as many as you want" contradicts `TRACKED_QUESTIONS = 20`; dropped rows
fade rather than vanish, so they can be restored; Remove column; real questions not the
board's.

**Live:** `/api/version` served f4c9ce7 at 12:31:07Z. Served CSS `3j59m4mj5c8dy.css` has the
row rule and the 390 areas; `/scan/57520fc7...` shows "Step 3 of 3 · Result". Shots of that
result at 1280, 390, `--js-off`, `--reduced` in `Q07-live-*`. Confirm itself not shot live.

**Denominator:** confirm state at 1280 (board vs harness), 1280 with a cluster dropped, 390
full page (harness; board is 1280-only). Builds were over the existing `.next` - `rm -rf
.next` was refused by the session's permissions. Suite 840/840 after build + capture.

## R12 - Turnstile interaction-only - `afedaa9` - no board

`appearance: "interaction-only"` on the one `window.turnstile.render` call, so all three
mounts change (LiveScanChecker, CoverageForm, RerunButton). The holder's 14px top margin
now applies only between `before-interactive-callback` and `after-interactive-callback`,
so no empty gap is left under the field when nothing shows. Server check untouched.
`/legal` cookies line said "the box that checks you are not a robot"; with no box it now
reads "which checks you are not a robot before a scan runs - usually without showing
anything". **Live:** served chunk `33crqmtp8m970.js` contains the option and both
callbacks. Headless Chromium on `/` is challenged - the widget appears with the 14px gap,
which is interaction-only working as designed for a suspected bot - so the invisible,
human path and a real scan start are not verified here; filed as a DANNY line in
`docs/blocked.md`. Suite 840/840.

## R13 - packages CTA label - `f2aaad0` - board `Packages.dc.html`

`cited` CTA "Go for first" -> "Go for position #1", only that string. Measured, it wrapped
to two lines at 390: 112px of text in an 89px tier column (table min-width 680 below
860px). Table min-width 820, label column 24%, `.pkg-btn { white-space: nowrap }`; the
table already scrolls sideways there. **Live** (f2aaad0 at 12:42:02Z), measured by range
rects, not by eye: 1 line at 390 (button 119px) and at 1280 (145px); the other three CTAs
1 line at 390 locally. Shots `R13-live-390`, `-jsoff`, `-reduced`. Denominator: the four
CTAs at 390, the changed one at 1280. Suite 840/840.

## R14 - cut the white-label-for-agencies line - `25b5d27` - boards `Main.dc.html`, `Mobile.dc.html` (deliberate difference)

Cut: homepage hero second sentence; `/scan` desktop paragraph from "Built white-label"
on; `/scan` phone paragraph's second sentence; homepage OG description ("Free scan, then
get placed in the sources they cite. Prices on the page."). Also, as variants of the same
line: the homepage meta description's closing "white-labelled", and the `/scan` phone
eyebrow "AI search visibility, white-labelled" -> "AI search visibility". Left alone, as
product facts rather than the positioning line: nav/footer "White label" links, Packages
"Every tier is white-label" and its row, tier-page feature bullets, `/compare` row,
`/white-label` itself (Q14). Deliberate-difference line added to `docs/inbox.md`.
**Live** (12:45:51Z): "same if you are the brand" absent from `/` and `/scan`, OG served as
above. Shots at 1280/390 local for both heroes (no orphaned line), live 390, `--js-off`,
`--reduced`. Suite 840/840.

## R15 - homepage title and sr-only h1 - `94d237f` - board `Main.dc.html` (deliberate difference)

`metadata.title` and `openGraph.title` -> "AI SEO agency | AI visibility tools - alwayscited"
(the root layout's `%s | alwayscited` template does not apply to the root page - read live
before and after, no doubling). `<h1 class="sr-only">AI SEO agency</h1>` first in the hero;
the painted headline is now a `<p>` with the same style object. **Live** (12:49:58Z), read by
fetch: exactly one h1, `class="sr-only"`, text "AI SEO agency"; title and og:title as above.
Pixel check: hero region (1280x370, JS off) from production before the push and after it
are byte-identical PNGs (`cmp`); 390x335 before vs local after also byte-identical.
`page-head` one-h1 census green. Suite 840/840.

## Q08 - running - `b2342ed` - board `HeroSequence.dc.html`

**How it was compared:** production has no running scan to shoot (starting one is a paid
call behind Turnstile). A local-only harness (the Q07 one, status `running`, `/status`
stubbed: questions step, then reading, ChatGPT landing at 6s) mounted `ScanFlow`; deleted
before the final build. Board keyframes read first: 40s loop, beat 1 settled 0.8-9.2s.
Shots `Q08-running` (board 7s / site 7.5s, 1280x1160) and `Q08-running-390` (full page).

**Fixed / now matches:** top section rebuilt to the board - two columns (`1fr 440px`, gap
48, stacks under 860); h1 "Scanning <domain>" 30/700; "This usually takes around two
minutes." 15px soft, plus "N questions, E engines, N×E answers." in figures when the page
knows N (after a confirm on the page; not after a reload mid-run - then omitted, not
guessed); four engine cards (12px radius, EngineLogo 16, 12.5/600 name, 3px fill) in a
4-up grid, 2-up under 560; the email offer as the board's white card, "Would rather not
wait?" / body / inline 44px input + dark "Email me" button, label visually hidden;
"While you wait: what happens after the scan" centred 13/600 over the sequence.

**Still differs, deliberately:** each card's fill is the real pipeline step (full once that
engine lands, with the report's verdict words under it and an accent border) - the board
fills on a timer, and the bar is the scan, not the story; the step caption stays under the
cards; the offer body keeps "You can close this tab and the scan keeps running." (the
email-offer test requires it) and the privacy line + /legal link ships with the address
collection; "Google AI Overviews" wraps to two lines where the board says "AI Overview";
sitewide header and step bar above; the tier sequence is QF2's 8s/2.7s tempo, so at 7.5s
the site is on a bridge where the board is still on beat 1 (compare beat states - Q01/QF2).

**Denominator:** running state at 1280 (board vs harness) and 390 (harness full page; board
is 1280-only). Censuses: `.run-mail-btn` registered in contrast CSS_COLOURS/CSS_GROUNDS
(white on ink 18.66). Build + capture, suite 840/840.

**Q08 live** (`/api/version` served b2342ed at ~13:05Z): the served stylesheet carries
`.run-top` and `.run-mail-btn`; one served chunk carries "Would rather not wait?" and
"While you wait: what happens after the scan". Production has no running scan, so the
running state itself was not shot live. The `/scan/[token]` route was shot live at 390,
`--js-off` and `--reduced` on the .co.uk token (`Q08-live-*`): the result settles, and
nothing on it has moved. One live shot taken during the deploy swap came back unstyled
(serif, bare table); a re-shoot a minute later was styled, so it was the asset swap and
not a defect.

## Q09 - result, top half - `3fa5502` - board `ScanResult.dc.html`

**How it was compared:** board at 2.5s against a local harness mounting `ScanFlow` at
`complete`, served the US scan's real public payloads (`/api/scan/5e572d37...` and
`/full`, fetched from production into local-only fixtures, deleted with the harness).
Also shot production before the change (`Q09-result-before`). Shots `Q09-result`
(1280x1000) and `Q09-result-390` (390x1800).

**Fixed / now matches:** headline block is the board's `1fr 520px` grid, bottom-aligned,
stacking under 860; h1 50/700/-0.04em (36px under 480); standfirst "5 buyer questions,
each put to 4 engines. Everything below is free." - new `standfirst()` in
`result-figures.ts`, counts from the scan's own lists, in figures; engine pills 12.5/600
ink with 16px logos; figures as three separate white cards (16 radius, 12.5 label, 30/700
value, bold 15px soft unit), labels "Answers naming you", "Questions, no mention", "Best
Google position" shown "#4" as the board does; 64px down to "Question by question";
section heads 26/700 with the description inline at 14.5 (shared `Head`, so the lower
sections match too); question rows with no header row - question 15/600, marks as 26px
7-radius tiles (named full with an accent border, others faded), "Google #N" / "Not in
Google top 20" in its own column, "Named 3 of 3" purple or "Not named" quiet pill,
chevron. At 390: question across the top, marks and pill under it, position on a third
line (it ran into the pill on the first try).

**Still differs, deliberately:** headline sentence is `headline()`'s ("4 of 17 AI answers
did not name you.") not the board's "named" phrasing - the copy is a settled figure
sentence, not re-derived here; EngineLogo marks, not colour tiles; the domain · read-date
line sits above the h1 because the page keeps the sitewide header rather than the board's
bar; the metric notes (denominator in words) are kept visually hidden for screen
readers; only two cards when there is no Google position; `#fbfbfc` palette count for
ResultView 3 -> 2 (header row gone), recorded in `palette.test.mts`.

**Denominator:** result top half at 1280 (board vs harness on real data) and 390
(harness). Build + capture, suite 840/840.

**Q09 live check (25 Sep, 13:21 UTC):** `/api/version` serves `3fa5502`. Shot production
against the board: US token at 1280 full (`Q09-live`), 390 full (`Q09-live-390`), `--js-off`
(`Q09-live-jsoff`), and the .co.uk token with `--reduced` (`Q09-live-reduced-uk`). All four
show the settled result: headline beside the figure cards, standfirst, engine pills, question
rows with marks, Google column and Named pill, same as the harness. JS-off renders the full
top half server-side. The .co.uk scan has no Google position, so it shows two cards, as noted
above. The bottom half still uses the old layout; that is Q10.
**Denominator:** top half, 2 tokens, 1280 / 390 / js-off / reduced, on production.

## Q10 - result, bottom half and the sidebar - `18ea030` - board `ScanResult.dc.html`

**How it was compared:** board at 2.5s against a local harness (a temporary `/q10h` page
mounting `ScanFlow` at `complete` with the US scan's real `/api/scan/<token>` and `/full`
payloads, deleted before commit), then production. Shots `Q10-result` (1280 full),
`Q10-result-390`, `Q10-sidebar` (`--click` on the first question row); live `Q10-live`
(1280 full, US), `Q10-live-390-uk` (390 full, .co.uk), `Q10-live-jsoff`, `Q10-live-reduced`.
`docs/parity/drawer-keys.mjs` opened a row, pressed next and previous and then Esc, on the
harness and on production: "Question 1 of 5" -> "2 of 5" -> "1 of 5", focus on Close, and
the drawer gone after Esc.

**Now matches:** heading line with "Pages feeding answers you are missing from, where an
article can run." and "You could place N of these yourself." at the right (15/700); the first
three as white 18-radius cards with the 92x56 dial (score 19/700 under the arc, animated only
under `data-motion="on"`), "Difficulty, out of 100" over the band 16/700, page 15/700, sub
line, "Feeds N answers you miss" purple pill; the rest in a table with a white header (Page,
Cited by, Answers you miss, Difficulty) and a 56x6 bar plus band; the dark alwaysmentioned
card sits under the table; leaderboard with 10px rounded bars, 14/600 names, bold counts, you
in purple; alwaystracked as the dark 24-radius card with the upper-right wash, lockup, 38px
"This was one reading. See it every week.", four dark tiles, the price line (priceLabel and
TRACKED_QUESTIONS from `pricing.ts`), and a white "See it on your own report" card; the
walkthrough switch is the board's grey track ("Loom walkthrough" / "Demo with Danny") with
the chosen note under it and a `you@company.com` placeholder; sidebar 540px, "Question N of
M · Google #N / Not in Google top 20", 44px bordered buttons with chevrons, 22px question,
answer cards with no grey head band, purple "Names X" / quiet "Does not name X" pills, and the
cited pages as chips (still linked).

**Still differs, deliberately:** the board's "Names Ledgerbird, Stackbill" pill and "Names
instead" column show "Cited by N of E engines", because which brands a page names cannot be
derived (scan_brands is per scan, not per page); leaderboard counts have no "/ 20", because
mention counts go over the answer total (39 against 17 on the US scan); the leaderboard keeps
its longer description and caption, for the same reason; the board's "Thirty minutes with
Danny", "Book the demo" and "Danny replies himself. Nothing automated." are not used, since
none of them has a source - the demo note, "Request a demo" and the privacy line stay; tile
copy is reworded from the existing alwaystracked points, and "20 questions on four engines"
is "20 questions, checked every week" with no engine count; the "Illustrative" line is
dropped because this is real data; the per-row question list and question count have gone,
as the board has neither; the footnote under the placements has gone too - the dark card
covers it. Build note: `rm -rf .next` was denied in this session, so the builds ran over the
existing `.next`; the stale harness type file was regenerated by the final build before tsc.

**Censuses moved:** `palette.test.mts` - `#fbfbfc` in ResultView 2 -> 0 (entry removed), new
`rgba(124,58,237,.25)` (TRACKED_WASH) and `rgba(0,0,0,.08)` (switch lift), `rgba(17,18,24,0)`
in dark.ts 3 -> 4; `contrast.test.mts` - `.wt-toggle`/`.wt-option`/`.wt-option--on` grounds
and colours recorded (soft on chip 4.72).

**Denominator:** bottom half and the open sidebar, 1280 (harness and live, US), 390 (harness
US, live .co.uk), js-off and reduced (live US). Build + capture, suite 840/840.

## Q11 - the journey on real scans - no code change, verified on `18ea030`

**How it was checked:** production, both inbox tokens (.co.uk `57520fc7...`, edge45.co.uk;
US .com `5e572d37...`, slack.com). Shots `Q11-uk-result` (1280 full), `Q10-live-390-uk`
(390 full), `Q11-uk-sidebar` and `Q11-uk-sidebar-390`, `Q10-sidebar` equivalent live for US
via `Q11-us-sidebar-390`, plus the Q10 live set for US at 1280. `docs/parity/journey-check.mjs`
recomputes the figures by hand from the teaser's per-question named/answered counts (not
through `result-figures.ts`), then reads the live DOM and walks every question's sidebar with
Next, testing each answer's text for raw markdown (`**`, `#` headings, table rules, `](http`,
leading `- `/`* ` bullets, backticks).

**Results:** market UK for the .co.uk scan and US for the .com one. Headline "16 of 17" and
"4 of 17", naming "1 of 17" and "13 of 17", no mention "4 of 5" and "1 of 5", best Google
position absent (UK, so no card) and "#4" (US) - all match the payload. Placement rows 16/16
and 8/8 rendered, 3 dials on each. Markdown hits in the sidebars: 0 of 10 questions. Prev,
next and Esc work live (`drawer-keys.mjs`).

**Not checked:** confirm state and its market reason line. Both scans are complete, so
production has no confirm screen to shoot for them; the reason line was compared on the
local harness in Q07. A fresh scan is still the DANNY item. Answer tables wider than the
390 drawer scroll sideways inside their own box (`overflowX: auto`), which was left as is.

**Denominator:** 2 tokens x (result 1280, result 390, sidebar 1280/390), 10 sidebars
text-checked, 4 figures x 2 tokens.

## Q12 - PR agencies - `fc23e69` - board `PRAgencies.dc.html`

**How it was compared:** board at 6s (its 10s loop holds the drawn state from 34% to 92%)
against the local build at 4s, then production: `Q12-pr-before` (live, before), `Q12-pr`
(local hero), `Q12-pr-390` (local, full), live `Q12-live` (1280 full), `Q12-live-390`,
`Q12-live-jsoff`, `Q12-live-reduced`.

**Now matches:** dark hero below the header with the board's upper-left wash (`WASH_PR`),
"For PR agencies" 13/600, 54px h1 in the board's words, 17px standfirst; the fan-out at
340 / 1fr / 380 - four coverage cards (accent edge, the regional one dimmed on the card line),
the board's four wire paths in its 460x330 box, the grey stub and "Read by no engine" pill,
three white answer cards with engine · kind and "Client named"; the Illustrative line; "What
changes for a PR team" 28px with the 15px line beside it; three cards with 16/700 h3; the
alwaystracked and alwaysmentioned cards (prices from `pricing.ts`, the second on a wash-line
border); the dark "Already have a campaign?" card to /coverage-check. At 390 the wires go and
the dead piece says "read by no engine" in its own line.

**Still differs, deliberately:** the sitewide light header rather than the board's dark bar and
its "Check your coverage" button (the dark card at the foot is that door); the wires draw once
on the homepage charts' `.flow-line` trigger instead of looping every 10s, and the pills do not
fade - nothing that holds text starts invisible, and with JS off or reduced motion everything
is drawn (checked live); "Named in 8 of 20" is computed from FREE_ANSWERS, where the board
types 9; "up to 5 coverage links" comes from MAX_COVERAGE_URLS in digits; the mentioned card
border is `T.washLine` rather than the board's `#c9b5f7`, to avoid a new off-palette value.
Removed with the rebuild: the free-scan form card, the wash coverage-check band, the light
"What a campaign looks like" diagram, "Where we fit" and the "See all packages" line - none of
them is on the board.

**Censuses moved:** `scan-form.test.mts` floor 5 -> 4 (this page's form went; reason and date
in the file); `palette.test.mts` - `#d6d8dd` entry removed (its only site went), `#fbfbfc`
loses pr-agencies, `rgba(124,58,237,.22)` 1 -> 2 and `rgba(17,18,24,0)` 4 -> 5 in dark.ts.

**Denominator:** the whole page at 1280 (local and live) and 390 (local and live), plus the
hero with js-off and reduced, live. One state compared (drawn), as the beat has one settled
state. Build + capture, suite 840/840.

## Q13 - SEO agencies - `d5bc3fa` - board `SEOAgencies.dc.html`

**How it was compared:** board at 6s (its loop holds the after state from 48% to 92%)
against the local build at 5s, then production: `Q13-seo-before` (live, before), `Q13-seo`
(local 1280 full), `Q13-seo-390` (local full), live `Q13-live` (1280 full), `Q13-live-390`,
`Q13-live-jsoff`, `Q13-live-reduced`. `docs/parity/probe-lines.mjs` on production: both link
lines carry `.in-view` with `stroke-dashoffset: 0` 4s after load. The JS-on full-page shot
caught them before the draw finished; the js-off and reduced shots show them drawn.

**Now matches:** hero at 7fr / 4fr on one bottom line - 13/600 eyebrow, 50px h1, the
board's 17px standfirst, the white 18-radius "Scan a client you already rank well for" card
with a visually hidden label, `clientdomain.com` and 44px Check; "One placement, two jobs"
28px with its 15px line; the beat at 1fr / 260 / 1fr - the Google card (five rows at a 44px
step, Tallyroo #3 on the wash with "was #10"), the dark solodesk.io placement card between
two accent link lines, the dark ChatGPT card with two skeleton bars, "2. Tallyroo" picked
out, Sources and the solodesk.io chip; the three notes under it; "The three questions you are
about to ask" as three h3 cards in the board's words; the packages line (priceLabel and
TRACKED_QUESTIONS from `pricing.ts`).

**Still differs, deliberately:** the beat runs once, not on the board's 10s loop - the
settled state is painted, and under `data-motion="on"` the climb (+132px), the two rows
pushed down (-44px) and the answer settling are keyframes cued by
`:has(.flow-line.in-view)`, so nothing is hidden or out of place at rest, with JS off or with
reduced motion; the "…" / #10 placeholder rows of the before state are not drawn; "2.
Tallyroo" is picked out with `D.card` and an accent edge rather than the board's
`rgba(167,139,250,.22)` fill, and the source chip is `D.card` rather than `.16`, to add no
off-palette values; the packages line says "questions checked weekly" rather than the
board's "a week" (the pricing basis, per the existing comment); the sitewide header, not
the board's bar.

**Censuses moved:** none. `.seo-notes` first set `color` in the stylesheet, which the
contrast census flagged; it moved inline, where the page sweep measures it.

**Denominator:** the whole page at 1280 (local and live) and 390 (local and live), plus the
hero and beat with js-off and reduced, live. One settled state. Build + capture, suite 840/840.

## Q14 - white label - `a5277d1` - board `WhiteLabel.dc.html`

**How it was compared:** board at 6s against the local build, then production. Shots
`Q14-white-label` (local 1280 full), `Q14-white-label-390` (local full), live `Q14-live-1280`,
`Q14-live-390`, `Q14-live-jsoff`, `Q14-live-reduced`. The previous run pushed and shot but
stopped before logging. This run confirmed `/api/version` serves `a5277d1` (11:05Z, 26 Sep) and
read the live shots again. In the JS-on full-page shots the second card row and the terms cards
look faded. That is the sitewide below-fold `.in-view` reveal (`motion-script.ts`) caught before
the page was scrolled, the same thing noted on Q13. The js-off and reduced shots show every card
settled.

**Now matches:** 13px eyebrow and 52px h1 beside the reskin at 5fr / 7fr. The Northlight
Digital report card (15%, "12 of 80 answers name Tallyroo", Up from 4%, the teal line, three
placement rows with "Cited by N engines" pills) sits settled on the agency's skin. That is the
board's reduced-motion state. The Illustrative line is under it. "Who sees what" is 28px with
its 15px line, over six 3-up cards with Yours / Ours / Publisher / Ours, to you pills in the
board's words. Below them are three dark terms cards (Monthly, One, to you, None) and the "See
what it costs" line.

**Still differs, deliberately:** the terms card keeps `[TO CONFIRM: the clause wording]`
where the board prints the clause. The reskin loop (9s, teal wipe) runs only under
`data-motion="on"`. The header is the sitewide one, not the board's bar.

**Censuses moved:** palette - `#0f766e` and `#e6f4f1` registered as the made-up agency's
colours, and the `#fbfbfc` site removed (in `a5277d1`).

**Denominator:** the whole page at 1280 (local and live) and 390 (local and live), plus
js-off and reduced, live. One settled state.

## Q15 - coverage check - `f735c68` - board `CoverageCheck.dc.html`

**How it was compared:** the board at 3s (its idle state; its confirm, running and result
blocks are all painted in the canvas). The landing page was shot local and live. The reading
page was shot against the board's result block. No real reading token exists, so the reading
was rendered locally from a temporary fixture branch in the page, which was removed before the
final build (`Q15-reading`, `Q15-reading-390`). Live shots: `Q15-live-1280`, `Q15-live-390`,
`Q15-live-jsoff`, `Q15-live-reduced`. A dead reading link still returns 404 on production.

**Now matches:** on the reading, the baseline is stated as the board's three cells in one
accent-edged card: Named N of M, Your coverage cited (accent figure), Reading taken. It
replaces the "Where the brand stands" side card once a reading is complete; the side card
stays for running, failed and stalled. Each question row carries a "named n of m" pill in the
board's green, amber and red for every engine, some and none. That figure is counted by
`countNamed` over the row, so its denominator is the headline's. Kinds are capitalised as on
the board, and the news question is flagged in warn colours as on the landing page. On the
landing page the coverage upload is now the board's dashed drop zone. It is a `<label>` over the
native file input, so drop, click and keyboard all still work, and it gives the input the
accessible name it never had. The focus ring is on the zone.

**Still differs, deliberately:** the product is ahead of the board, and the queue says to take
its visual language only. The form keeps its five URLs, context box, market, agency prompts
and no email. There is no confirm step and no running block on the landing page. The reading
keeps its per-engine chips, the piece-by-piece list with its three states, the sources list,
the alwaystracked walkthrough and the re-run. "Your coverage cited" counts pieces cited as a
page (not "answers where a page you uploaded was in the source list", which the reading does
not count). The board's "What the engines say it does" prose and dark "This is reading one"
card are not built: there is no stored summary to fill the first, and the second would be a
second CTA beside the walkthrough. The drop zone's dashed edge is `T.soft`, not the board's
`#d6d8dd`, so no off-palette value is added.

**Also in `f735c68`:** `public/video/alwayscited-tiers-720.mp4` and the poster. The inbox's
`git add src supabase public` swept them in, and the unstage was refused by the sandbox.
Nothing links to them; Q23 wires them up. The audio is still unauditioned (the DANNY line
stands).

**Censuses moved:** none. `rm -rf .next` was refused again; builds ran over the existing
`.next`, then `npm run capture`, suite 844/844.

**Denominator:** `/coverage-check` whole page at 1280 (local and live), 390 (live), js-off and
reduced (live). `/coverage-check/[token]` complete state at 1280 and 390 from the local
fixture only. Its running, failed and stalled states are unchanged and were not shot.

## Q16 - tier pages - `736180b` - board `PackageDetail.dc.html` (template)

**The canvas has a template for these, not four boards.** `PackageDetail.dc.html` is drawn
for alwaysmentioned and applied through `PackagePage.tsx` to all four.

**How it was compared:** board at 2s against `/alwaysmentioned` (local, full), and against
`/alwaystracked` (local, first screen). `/alwayscited` and `/alwayseverywhere` were shot local
at 1280. Live: `Q16-live-1280` (mentioned, full, vs board), `Q16-live-390` (tracked, full),
`Q16-live-jsoff` (cited, full), `Q16-live-reduced` (everywhere, full).

**Now matches:** the price card sets its qualifiers the board's way: a 36px figure with
"from" and "/mo" at 15px/600 in the soft ink beside it. It was "$995/mo" all at 36px. The
split goes through `splitPriceLabel`, the site's one price-label reader, and "Book a call"
stays whole. The first attempt judged "from" by hand, and `price-schema.test.mts` tripped on
it, correctly. Header grid, "All packages", Package micro, 36px lockup, 15.5px standfirst,
white card with two buttons, "What lands each month" as a 4/8 deliverables table, "Where it
sits" as the four-cell ladder with the current tier on the wash, and the closing scan line
were already the board's.

**Still differs, deliberately:** "per client" after "/mo" is not printed, because
`pricing.ts` does not say it. Deliverables copy is each tier's own, not the board's
alwaysmentioned example. The ladder cells are cards with a plain "See the plan" link, not
links around a tier name (QF1). The primary button keeps the sitewide `.btn-primary`
gradient. The header is the sitewide one.

**Found, not fixed here:** `/alwayscited`'s standfirst ends "This is the one most agencies
buy." That is an unsourced claim of the kind Q14 removed. It comes out in the next push.

**Censuses moved:** none. Suite 844/844 after build + capture.

**Denominator:** four routes at 1280 (local; one live full vs board), one at 390 (live), one
js-off, one reduced (live). One settled state; the pages have no beat beyond the `.ac-row`
entrance.

## Q17 - compare - `7facdf3` - board `Compare.dc.html`

**How it was compared:** board at 2s against `/compare` local (full, then first screen after
the fix), 390 local reduced. Live: `Q17-live-1280` (full vs board), `Q17-live-390`,
`Q17-live-jsoff`, `Q17-live-reduced`.

**Fixed:** the table never had a value column. `.cmp-row` was `2fr repeat(auto-fit,
minmax(0, 1fr))`, and every row rendered as a single column, so each "Yes" wrapped under its
feature at 1280. That was live before this item. The grid is now `2fr repeat(var(--cmp-cols),
minmax(0, 1fr))`, and the page sets `--cmp-cols` from `COLUMNS.length`, so a column added
later still gets its track. At 390 the existing `1fr auto` rule holds.

**Now matches:** header grid (Comparison micro, 36px h1, 15px standfirst, 5-col side card), the
table card with its washed head row and 12px rows, the two-up closing cards with the
accent-edged "When we are".

**Still differs, deliberately:** no Peec, Profound or Brand Radar columns. All 24 of those
board cells are `[VERIFY]`, and the page's standing decision (header comment in
`compare/page.tsx`) is not to put three companies' names over an empty grid until the cells
are read from their own material and dated. No cell about another tool is filled in, which is
the queue's rule. The side card explains the gap instead of the board's "Last checked
[DATE]". **`VsTool.dc.html` has no route; it is parked and skipped, so the three "vs" chips
are not built.** The better-buy card drops the board's `[CONFIRM - name which]`, because it
names no tool. With one value column, "Yes" sits at 2/3 of the row, not at the board's 1/3.

**Also in this push:** "This is the one most agencies buy." removed from `/alwayscited`'s
standfirst (found on Q16; confirmed absent from the live HTML).

**Censuses moved:** none. Suite 844/844 after build + capture.

**Denominator:** one route at 1280 (local and live), 390 (local and live), js-off and
reduced (live). No beat.

## Q18 - evidence - `6405ed8` - boards `CaseStudies.dc.html`, `CaseStudy.dc.html`

**How it was compared:** each board at 2s against its route, local full, then production:
`Q18-live-1280` (index, full vs board), `Q18-live-390` (index), `Q18-live-jsoff` (Vibe Retail,
full vs board), `Q18-live-reduced` (index). Local: `Q18-index`, `Q18-index-390`,
`Q18-index-1280`, `Q18-vibe`, `Q18-vibe-390`.

**Fixed (both were live before this item):** the index h1 set one word per line. The micro and
h1 share a `<div>`, and `.confirm-head` only sized its `h2` and `p`, so the div got one twelfth.
`.confirm-head > div` now spans 4 as the board's does. That also fixes `/blog`'s head, which has
the same shape (`Q18-blog-check`). The study card used `.confirm-top`'s 7/5, where the board
is 5/7, so the stat panel was too narrow for "#83 to #4". It now uses `.study-top` at 5fr/7fr and
stacks below 860px. At 390 the stat cells wrap at a 150px basis; with a zero basis they never
wrapped. The h1 line-height is 1.2.

**Now matches:** the index head at 4/8, the study card's sector micro, 23px h2, standfirst and
washed three-cell stat panel, and the closing line. On Vibe Retail, "All evidence", the micro,
the h1, the At a glance card, the three stat cells, the Method card and the Run the same scan
card were already the board's.

**Still differs, deliberately:** one study, not the board's three `[CASE STUDY TITLE]` rows.
The stat cells are the attested figures (the #83 readings with their windows, and ChatGPT brand
visibility 25%, both recorded in `rules.md` as Danny's attestation) in place of the board's "AI
Overview citations 3", which is not restored. At a glance has no Package, Placements count or
Read date (not sourced). The body is the study's real copy, not the board's placeholders, and
the Method card keeps its `[TO CONFIRM]`. At 390 the stacked stat cells still carry their
`border-left` as a short edge line; cosmetic, left as is.

**Censuses moved:** none. Suite 844/844 after build + capture.

**Denominator:** two routes at 1280 (local and live), 390 (local both; live index), js-off
(live Vibe Retail), reduced (live index). No beat.

## Q19 - blog - no code change of its own; verified live on `6405ed8` - boards `BlogIndex.dc.html`, `BlogPost.dc.html`

**How it was compared:** boards at 2s against `/blog` and
`/blog/how-llms-pick-which-brands-to-recommend` locally (`Q19-index`, `Q19-post`), then
production: `Q19-live-1280` (index, full vs board), `Q19-live-390` (aeo-vs-seo),
`Q19-live-jsoff` (why-most-aeo-audits), `Q19-live-reduced` (how-llms-pick). All three posts
were looked at, one per state.

**The one defect was fixed under Q18:** the index head set its h1 into one twelfth of
`.confirm-head`, and `.confirm-head > div` fixed it in `6405ed8`.

**Now matches:** the index has the Writing micro and h1 at 4/8 beside the standfirst, the
filter pills, the featured card (micro, 23px title, summary, date and read time), and the
list card with kind, title and standfirst, and date on the right. The post has Back to
writing, the kind micro, the h1, the standfirst, the hairline, the date line, the 68ch body at
16px with h2s, and the sticky Run it yourself card and On this page list at 390 and 1280.

**Still differs, deliberately:** the board's `[METRIC LABEL] [N] of [N]` panel on the featured
card, and the `[MEASURE]` cards on the post, are not built. No post has a sourced figure to put
in them. Without the panel, the featured title stays in the card's left column and wraps
earlier than on the board. There is no `[AUTHOR]` in the meta line. The board's "Running an
agency" filter and its fourth `[NEW POST TITLE]` are not built, because the post does not
exist. Post h2s end in a full stop where the board's do not; that is the posts' copy, left for
a copy pass.

**Denominator:** four routes (index and three posts): the index at 1280 local and live, one
post at 1280 local, one post each at 390, js-off and reduced, live. Still pages.

## R16 + R17 - classifier notes naming a marketplace, a listing or a price -> f609043, 0863386

**Board:** `ScanResult.dc.html` (no layout change; copy/data only).

**Fixed:** `publicNote()` (`src/lib/scan/opportunities.ts`) drops a whole note that names a
marketplace, listing, directory, sponsorship, guest post, price or a currency figure. It is
applied where rows are built - `deriveOpportunities` (feeds both `PlanCards` and
`PlacementTable`) and the `unlock.ts` sources list - so neither render site has to remember.
The live check on f609043 found a third door: `scan_teaser`'s `top_sources` / `all_sources`
still carried six such notes on the .co.uk scan. `publicTeaser()` now filters those in both
readers (`/scan/[token]` page and `/api/scan/[token]`), shipped as 0863386. Fixture tests in
`opportunities.test.mts` (the live mayple.com note verbatim) and a census in
`result-copy.test.mts` pinning every note path through the filter.

**Live, 0863386:** both inbox scans re-fetched: page payload notes 89 / 109, sale-word notes 0 / 0;
`/api/scan/<token>` sale-word notes 0 / 0; mayple.com row on the .co.uk result reads the domain
alone. Shots `R16-live-1280`, `R16-live-390`, `R16-live-jsoff`, `R16-live-reduced`.

**Still differs:** nothing new. Engine answer text (`response_text`) can still say "directory"
or "pricing" inside the sidebar transcripts - that is what the engine said, quoted, not a
claim of ours beside a placement.

**Note:** `rm -rf .next` was refused by the sandbox this run; builds ran over the existing
`.next`, then `npm run capture`, suite 844/844 (baseline 840 + 4 new).

## Q20 - About -> 74d4948

**Board:** `About.dc.html`, `/about`.

**Fixed:** "Scope every claim" printed `"AI visibility: 24%" ... We write 24% of 20 answers` -
24% of 20 is 4.8 answers, a figure no reading produces. It now takes the board's worked example,
`"AI visibility: 30%" ... We write "6 of 20 answers, across 5 questions and 4 engines, read 18 Sep"`,
with the count, the percentage and the denominators all derived from `scan-shape.ts`, so they
can't drift apart. The team strip is now `.team-row` (globals.css): five equal hairline cells in one row at
1280. On a phone they stack with rules between the rows. The old flex-wrap went 2-up at 390, which
left a stray left rule on Luke and no rule between rows.

**Matches:** header grid 7/5, micro, 36px h1, lede with the Nomada link, the Why agencies only
card, How we measure 4/8 head, four rule cards 2-up, Who you deal with head and strip.

**Still differs, deliberately:** sitewide header nav (more links than the board draws); the
team strip carries five first names and no roles (Danny, 24 Sep - the board's four roles were
placeholders, and inventing roles would be a claim about real people); no `[CONFIRM names]` line,
since the names are confirmed; "Store the whole answer" keeps the repo's retention sentence
(kept for as long as the reading, not purged on a schedule) over the board's shorter copy.

**Denominator:** one route. Local 1280 and 390 (reduced); live 1280, 390 with JS off (settled,
every row visible), 1280 reduced. Still page. Suite 844/844. `rm -rf .next` refused by the
sandbox again; built over the existing `.next`, then `npm run capture`.

## Q21 - Contact -> 2ca7ac6

**Board:** `Contact.dc.html`, `/contact`. The form was not submitted on production.

**Fixed:** the form's inputs, textarea and button take `line-height: normal`, as the board's
native controls do. Inheriting the body's 1.6 made each field about 6px taller and the 4-row
textarea about 22px taller. Send is the board's flat accent with no glow. That is an inline
override of `.btn-primary`'s gradient and shadow, the same approach as `screens.tsx`, and the
class's hover stays.

**Matches:** 6/6 split, micro, 36px h1, 56ch lede, three route cards (14px radius), form card
with four labelled fields, full-width Send and the privacy note linking to /legal.

**Still differs, deliberately:** sitewide header nav; "comparison page" is singular where the
board says "pages", because the site has one `/compare`. Labels sit about 3px lower each because
body line-height is 1.6 sitewide, where the board's body is normal.

**Denominator:** one route. Local 1280 and 390 (reduced); live 1280, 390 JS-off, 1280 reduced.
Still page. Suite 844/844.

## Q22 - Legal -> 4b516a8

**Board:** `Legal.dc.html`, `/legal`.

**Fixed:** no drafting markers on the public page. The sidebar's "Drafted as a structure, not
as legal advice. It needs a solicitor..." line (the plain stand-in for the board's
`[DRAFTED BY CLAUDE ...]`) is gone. The owed solicitor check is now a `- [ ] DANNY` line in
`docs/blocked.md`, so it is tracked but not published. "How long we keep it" now says scan
results are kept **indefinitely**, and so is what each engine said, as they are (Danny,
24 Sep; the purge route clears nothing). Live HTML: 0 markers (`Drafted as`, `DRAFTED`,
`[CONFIRM`); "kept indefinitely" is present.

**Matches:** 3/9 grid, Legal micro and five-document switcher with Privacy policy on the white
pill, Privacy policy micro, 32px h1, sectioned white card at 22/28 padding with 16px h2s and
76ch 14.5px body, and the ICO line with the email link.

**Still differs, deliberately:** sitewide header (the board draws "Back to the site"). The four
other documents carry "not yet published" rather than links, because none of them exists. The
meta line reads "Nomada Digital Ltd, York", without the board's `[DATE]`, `[COMPANY NUMBER]` and
`[REGISTERED ADDRESS]`, because nobody has given those facts. The copy is the site's
census-held privacy facts (Anthropic, Cloudflare, the IP hash, cookies), which is longer than
the board's draft. There is one extra section, Cookies and tracking.

**Denominator:** one route. Local 1280 and 390 (reduced); live 1280 reduced, 390 JS-off. Still
page. Suite 844/844.

## Q23 - The launch video on /how-it-works -> 1cc49b1

**Board:** none. The queue spec is the reference.

**Built:** `#video` section directly under the hero, as the page's one beat. `<video controls
playsinline preload="none" poster>`, 16:9, 18px radius, hairline border, no shadow, no
autoplay. It has an h2 ("The 60-second version") and one line in DOM text, and a
visually hidden summary (`.sr-only`, `aria-describedby`) walking the four tiers with the prices
the video shows. `VideoObject` JSON-LD: name, description, poster, contentUrl, uploadDate
2026-09-26, duration PT1M2S (62.315s, read from the file's mvhd box), 1280x720, publisher → org.
The homepage has "Watch the 60-second version" under the four tiers, linking to
`/how-it-works#video`.

**The video's prices, verified by eye:** frames read out of the file at 0:10, 0:17, 0:25, 0:41,
0:49, 0:57 and 1:01 (`docs/parity/_frames.mjs`). The 0:57 staircase paints from $99/mo, $995/mo,
$2,495/mo and Book a call, which all equal `pricing.ts` today. The queue listed three; the video
also shows $2,495 (0:41 and 0:57).

**Census:** `src/config/video.ts` is the one record. `video.test.mts` (4 tests) holds
`shownPrices` equal to pricing.ts's price labels, checks that the files exist with the same
duration as the record and moov before mdat (faststart), checks that the summary says every
shown price, and checks the built page has the video, no autoplay, preload none, #video and
exactly one VideoObject agreeing with the record. `structured-data.test.mts`'s own-URL rule
now accepts a file that exists in `public/`, pinned to the video's two files. `PRICE_EXEMPT`
registers video.ts for `$99`, `$995` and `$2,495` only. Suite 848/848 (844 + 4). Staleness rule
in `docs/rules.md`.

**Flagged, not changed:** the closing card (1:01) says "White-label for agencies, and the same
if you are the brand." R14 keeps it off the homepage and /scan hero. This is /how-it-works, so
it is not covered, but a re-render should drop it. The audio has never been auditioned (DANNY
item), so the page does not mention sound.

**Live, 1cc49b1:** VideoObject in the served HTML; homepage link present; shots `Q23-live`
(1280), `Q23-live-390` (JS off: poster and heading visible), `Q23-live-reduced`.
`/video/alwayscited-tiers-720.mp4` serves 200, video/mp4, 3,377,699 bytes.

## Q24 - /how-it-works and /what-is-aeo -> no change, verified live on 1cc49b1

**No board - judged against the built pages.** Both pages were restyled onto the token system
earlier (SHELL, GRID12, CARD, MICRO, H2, `.board-head` 4/8 section heads, `.ac-row` entrance,
`CtaSection`). Each is built from the same parts as /seo-agencies, /about and the blog post:
hero 7/5 with a side card, prose in one white card per section, `.two-up` and `.seq-three`
grids, the FAQ rows, and the white closing CTA with the accent and outline buttons. Nothing in
either page is off-token or a pattern of its own. At 390 everything stacks: the three-column
"At a glance" table on /what-is-aeo becomes labelled rows, and there is no horizontal scroll.

**Left as is:** prose cards cap text at 72ch inside a full-width card, so at 1280 the right
third of each card is empty. That is the same measure-over-width choice as the blog post body.
Fixing it would need a new layout (a side column), which Q24 rules out.

**Denominator:** two routes. Local 1280 full and 390 full (reduced) for both; live 1280
reduced and 390 JS-off for /what-is-aeo, live 1280, 390 JS-off and reduced for /how-it-works
(under Q23).

## Q25 - Every route, live -> no change, swept on 1cc49b1

**How:** `docs/parity/_sweep.mjs` against https://alwayscited.com, one pass. For each route:
1280 and 390 with JS on, 390 with JS off (full page), and 1280 reduced motion. Horizontal
overflow is `scrollWidth - innerWidth`, measured at 1280, 390 and 390 JS-off. Header and footer
identity is a sha1 of their markup with per-route state removed, so it is a comparison rather than
an impression. JS-off also counts leaf text left at opacity < 0.1 (a reveal stuck at its start
state). Shots and `results.json` are in `docs/parity/Q25-sweep/`. The contrast census is green:
`contrast.test.mts` inside the 848/848 run on this tree.

**Denominator: 31 routes, 22 boards.** 30 rendered routes plus `/admin/scans` as a 401 check:
the 25 `page.tsx` routes, with `/scan/[token]` taken twice (both inbox tokens), plus the
404 page, `/scan?domain=`, `/scan?verify=failed`, and `/blog?kind=Method` and `?kind=Findings`.
`/coverage-check/[token]` is **not reachable**: no reading token exists. It was compared on a
local fixture under Q15. Of the 22 boards, 20 map to routes below; `VsTool.dc.html` is parked
(no route) and `Journey.dc.html` is the tier sequence inside `/` and the waiting screen.

**Results:** every route is 0px overflow at 1280, 390 and 390 JS-off. The footer is `d98f802d01`
on all 30. The header is `51fff83c36` on 29. On `/` it is the dark-hero variant from
`Main.dc.html`: the markup is the same apart from styles and the logo stroke (#a78bfa vs
#7C3AED), which is deliberate. JS-off hidden text: 0 on 29 routes. On `/` there is 1, the
`aria-hidden` "3." in TwoWays (`.ways-was3`), which is the pre-animation rank; the settled state
shows "4." by design. HTTP: 200 on every route, 404 on the not-found probe, 401 on
`/admin/scans`. The sweep logged "error" for `/scan`, `/scan?...` and `/coverage-check` only
because Turnstile keeps a connection open past `networkidle`; curl confirms 200 on all four.

| Route | Board | Verdict | Open differences |
|---|---|---|---|
| `/` | Main, Journey, Packages, HomeFaq, Mobile | pass | deliberate: EngineLogo, hidden h1, no white-label hero line, tempos (inbox list) |
| `/scan` | Main (hero field) | pass | Check button keeps the `.btn-primary` gradient (Contact's is now flat) |
| `/scan?domain=` | Flow1Confirm | pass | confirm needs a token issued after Turnstile; confirm compared on a local harness (Q07) |
| `/scan?verify=failed` | no board | pass | - |
| `/scan/57520fc7...` (.co.uk) | ScanResult | pass | real data, not Tallyroo (deliberate) |
| `/scan/5e572d37...` (.com) | ScanResult | pass | same |
| `/coverage-check` | CoverageCheck | pass | board predates the rework; visual language only (Q15) |
| `/coverage-check/[token]` | CoverageCheck | not reachable | no token; local fixture under Q15 |
| `/pr-agencies` | PRAgencies | pass | - |
| `/seo-agencies` | SEOAgencies | pass | - |
| `/white-label` | WhiteLabel | pass | `[CONFIRM CLAUSE WORDING]` kept |
| `/alwaystracked` | PackageDetail (template) | pass | - |
| `/alwaysmentioned` | PackageDetail (template) | pass | - |
| `/alwayscited` | PackageDetail (template) | pass | - |
| `/alwayseverywhere` | PackageDetail (template) | pass | - |
| `/compare` | Compare | pass | no competitor columns (no dated source) |
| `/case-studies` | CaseStudies | pass | - |
| `/case-studies/vibe-retail` | CaseStudy | pass | attested #83 readings only |
| `/blog` | BlogIndex | pass | no `[METRIC]` panel (no sourced figure) |
| `/blog?kind=Method` | BlogIndex | pass | - |
| `/blog?kind=Findings` | BlogIndex | pass | - |
| `/blog/aeo-vs-seo-...` | BlogPost | pass | no `[MEASURE]` cards |
| `/blog/how-llms-pick-...` | BlogPost | pass | same |
| `/blog/why-most-aeo-audits-...` | BlogPost | pass | same |
| `/about` | About | pass | five first names, no roles |
| `/contact` | Contact | pass | "comparison page" singular |
| `/legal` | Legal | pass | four documents "not yet published"; no company number |
| `/how-it-works` | no board | pass | launch video (Q23) |
| `/what-is-aeo` | no board | pass | 72ch prose in full-width cards |
| 404 | no board | pass | - |
| `/admin/scans` | - | 401 | check only |

**One inconsistency noted, not changed:** the `/scan` hero's Check button still has the
`.btn-primary` gradient and glow, while Contact's Send is now the boards' flat accent (Q21). No
board for that surface says which is right, so it is left for a scan-flow item rather than
changed in a sweep.

## R18 - /how-it-works and /what-is-aeo -> 9e3fec6 (26 Sep 2026)
Boards: HowItWorks.dc.html, WhatIsAeo.dc.html (docs/boards-2026-09-25/).
Now matches: both pages rebuilt to their boards - hero splits (7/4, 7/5), 50/48px h1s, the hiw scan box, the video section (real <video> + poster, 18px radius, lift; VideoObject JSON-LD unchanged), the three-step diagram, two jobs with footers, numbered three-up, derived entry price, the aeo results-page beat, white-header table, contents rail + sectioned card + three clocks, FAQ (first open), and the dark closing scan on both.
Still differs, deliberately: header/footer are the site's shared ones; "20 questions checked weekly" not "a week" (seo-agencies ruling); the aeo beat is one pass that settles with both marks on, not the 12s loop; near-board colours mapped to tokens (T.wash for #f3eefe, T.accentHover for #5b21b6, T.chip for #eef0f3, T.bg for #f7f7f9, #3f4451 for #3f434c); FAQ price answer keeps the pricing.ts derivation.
Denominator: local 1280 full page for both; live 1280, live 390, live --js-off 1280 (both), live --reduced 390 (aeo). The 390 full-page shot without scrolling shows the aeo beat at its pre-entrance opacity, as every .ac-row does; js-off and reduced show it settled. Build was incremental (rm -rf .next was permission-denied this run); check 848/848 after npm run capture.

## R19 - /about "Why agencies only" -> 2fc757c (26 Sep 2026)
Board: About.dc.html (docs/boards-2026-09-25/).
Now matches: the card keeps the board's place, micro label and four-line height at 1280 ("Why agencies first"); the copy is agency-first, with a brand able to come direct at the same prices, so it no longer contradicts HomeFaq's "If you are the brand rather than the agency, the same prices apply". FAQ untouched.
Still differs, deliberately: label and copy differ from the board's "Why agencies only" text, by Danny's ruling (docs/danny.md, 26 Sep); team strip shows five first names (settled, Q20).
Denominator: local 1280 full (vs board), local 390 full; live 1280 (vs board), live 390, live --js-off 1280 (settled, card reads "Why agencies first"), live --reduced 390. Check 848/848 after npm run capture; build incremental (rm -rf .next permission-denied).

## R20 - the two visible [TO CONFIRM] markers -> c07f1dd (26 Sep 2026)
No board governs the change (copy removal); pages: /white-label, /case-studies/vibe-retail.
Now matches Danny's ruling (docs/danny.md, 26 Sep): /white-label's "Contact with your client" note reads "Written into the agreement." with no marker; the vibe-retail Method card is its one paragraph, the prompts/dates marker paragraph dropped with it. Live HTML of both pages: 0 occurrences of "TO CONFIRM". to-confirm.test.mts: users floor >= 2 became an exact empty census with a dated reason; component rules unchanged. blocked.md item 3 annotated, not moved.
Still differs: the inbox's "[CONFIRM CLAUSE WORDING] stays" and Q14's position are overridden by this item, as it states.
Denominator: local --js-off 1280 and 390 for both pages; live 1280 (/white-label), live 390 and --js-off 1280 (vibe-retail), live --reduced 390 (/white-label). Check 848/848 after capture.

## R21 - /llms.txt -> ce3f352 (26 Sep 2026)
No board (plain-text route). src/app/llms.txt/route.ts (force-static) + pages.ts, which imports each sitemap page's own `metadata`.
Now true: live /llms.txt 200s as text/plain; charset=utf-8; h1, blockquote summary (the homepage's meta description), six h2 sections, 21 linked lines. All 21 URLs fetched live: 21 x 200. Every line's description compared against the live page's <meta name="description">: 21 of 21 identical (entity-decoded), so derived rather than typed. llms.test.mts (3 tests) holds the path set equal to sitemap.ts both ways and each entry to its own route's import.
Still differs: nothing to a board; titles are each page's own title before the layout template, so the homepage line carries its absolute title with "- alwayscited" in it.
Denominator: all 21 listed pages, live. Check 851/851 (848 + 3 new) after capture.

## R22 - name Vibe Retail on its own case study -> 4fce52f (26 Sep 2026)
Board: CaseStudy.dc.html (docs/boards-2026-09-25/).
Now matches Danny's ruling: the hero line reads "The client is Vibe Retail. The position below is the account owner's own reading, over the window stated beside it." Live HTML: "unnamed" 0, "agency request" 0; src/app/case-studies grep for both: 0. No figure or detail added. /case-studies index card left unnamed (it names no client either way; builder's call).
Still differs, deliberately: the board's hero line is a template ("Client unnamed at the agency's request. Figures are our own run...") and its glance/stats/body are [SECTOR]/[TIER]/[N]/[DATE] slots; the page carries the attested #83 readings only (settled, parity sweep).
Denominator: local --js-off 1280 (vs board) and 390; live 1280 (vs board, mid-entrance), live 390, live --js-off 1280, live --reduced 390.

## R23 - sentences claiming every placement links to the chosen page -> 137402d (26 Sep 2026)
No board governs the change (copy); pages: /how-it-works, / (FAQ), /seo-agencies (FAQ).
Now true to Danny's rule: each says every placement carries at least a brand link, some carry a contextual link to a chosen page and that is what moves the Google position most, a placement can win the citation without it, and the two are reported separately (the last from /seo-agencies' own "we report the two separately"). Live HTML: the three old sentences 0 on all three pages; new copy present (homepage also in its FAQPage JSON-LD). Live /what-is-aeo and the four tier pages: no "carries one"/"carries a link to the page you want ranked" at all. Source grep of src for carries one / carries a link / every placement / each placement / contextual link: remaining hits are code comments, the three-part screen, reporting rows, and vibe-retail's past-tense "Every external placement carried two contextual links" - a statement about that one attested campaign, left as is.
Noted, not changed: /alwaysmentioned says "Across our own coverage, the citations came from pieces with no link in them", which sits oddly beside "every placement carries at least a brand link"; the reviewer names alwaysmentioned as the correct copy, so it is left for Danny to rule on.
Denominator: live HTML of /, /how-it-works, /seo-agencies, /what-is-aeo and four tier pages. Check 851/851.

## R24 - no Stripe: the alwaystracked CTA and /contact -> b939129 (26 Sep 2026)
Board: Contact.dc.html (docs/boards-2026-09-25/).
Now true: contactUrlFor(tier) in pricing.ts is the one pattern (/contact?tier=<TIER_PLAIN>). Live HTML: homepage staircase "Start tracking" -> /contact?tier=alwaystracked (1), /alwaystracked price card -> same (1); other tiers unchanged. /contact?tier=alwaystracked shows a wash note above the form, "Setting up alwaystracked - It is set up by hand for now, with no checkout. Tell us the client and the topic below and we will set the tracking up with you." ContactTier reads useSearchParams inside Suspense, so /contact stays static (build: o /contact); without JS the note is absent and the form is as before. The action and the mail are untouched: the tier is acknowledged, not sent.
Found and changed: the item said no reply-time promise existed, but ContactForm carried "usually answered the same working day" twice (success panel and footnote). Both came off under the item's own rule; live "same working day" count 0. Grep of the changed files for hour/day/business day: one hit, a code comment in pricing.ts unrelated to replies.
Still differs, deliberately: the board's footnote keeps "usually answered the same working day"; the note box is not on the board (added by this item).
Denominator: local 1280 (vs board, JS, settled 3s), local 390 --reduced full; live 1280 (vs board), live 390, live --js-off 1280, live --reduced 390, all with ?tier=alwaystracked. Check 851/851.

## R26 - share card mirrors the homepage hero -> 42b9e89 (26 Sep 2026)
No board; source is HomeHero.tsx (Main.dc.html hero). src/app/opengraph-image.tsx (twitter-image re-exports it, unchanged).
Now matches the hero: D.ground with the hero's own WASH (imported, not re-tinted - Satori draws the sized radial gradients), the wordmark small top left (lockup spans kept, join re-scaled to -3.5px at 30px), "Every AI tool shows you the gap." over "We close it." in D.accent, the hero subline in D.muted, and the four FREE_ENGINES marks along the bottom from engineMarkSvg() - EngineLogo's own paths as data-URI SVG images (ChatGPT's mono mark in white). alt + config/og.ts rewritten to describe it. og-card.test.mts: HomeHero's painted literals registered as the second quotable source (dated), beside the layout title.
Live: /opengraph-image 200, image/png, 91,075 bytes, 1200x630 read from the IHDR; PNG saved to docs/parity/R26-og-live.png and looked at - renders fully. Live /about og:image:alt carries the new alt.
Still differs from the hero: headline in next/og's bundled Geist Regular, not Hanken at 700 - only woff2 Hanken is installed and Satori cannot read it; the old card had the same limit. Centred like the hero; no scan field or demo.
Denominator: local render twice (first with re-tinted washes, failed the palette census; second with WASH), live render once. Check 851/851.

## R25 - the weekly-report beat on /alwaystracked -> 2e0a790 (26 Sep 2026)
Board: TrackedBeat.dc.html (docs/boards-2026-09-25/). src/components/TrackedBeat.tsx, passed to PackagePage's new optional `beat` slot by /alwaystracked only; .tb-* in globals.css.
Now matches, at the board's settled beat (7s of 10, lens on row 5): 8/4 split under the tier header; report card with header (Weekly report, tallyroo.com · 20 questions · week 14, Illustrative), column heads, six rows at 54px, the lens ring on the moved row with its after line (Named this week, 2 of 4, #7 was #9), others dimmed and blurred; "Cited this week for that question: solodesk.io"; the argument column (micro, h2, paragraph, three bullets); the "Illustrative. Tallyroo and every brand and figure shown are made up." line. The walk runs 10s under data-motion with the board's keyframes; reduced motion and no-JS show the settled frame (checked live).
Still differs, deliberately: engine tiles are EngineLogo marks, dimmed + greyscale where not naming (inbox rule); the board's "Engine tiles are placeholders for EngineLogo" note is dropped, being a note about that; h2 reads "20 questions a week" (TRACKED_QUESTIONS; word() stops at ten) and counts read "of 4" from FREE_ENGINE_COUNT; alwaysmentioned in the last bullet is not a link (no tier name sits inside a link - lockup census); the after line is inset 2px so the settled ring shows whole; lens has no outer glow (off-palette rgba, not registered); #f3eefe/#5b21b6/#6d28d9 mapped to T.wash/T.accentHover. At <=640px the meta, pill and "was #9" hide and columns narrow so each row stays one line.
Other three tier pages: live --js-off 1280 full shots taken before and after the deploy - /alwaysmentioned, /alwayscited, /alwayseverywhere all byte-identical PNGs.
Denominator: board 0s + 7s vs local and live at 7s (1280); local --js-off 1280 full and 390 full (twice, after the wrap fix); live 390 full at 7s, live --js-off 1280 full, live --reduced 390 full. Check 851/851.

## R27-R31 - built 26 Sep, pushed 27 Sep -> 4e6d276, 1516c7f, fbd3ba2, 2eef1c2, b598b96 (27 Sep 2026)
Five commits, one push. The previous run built all five as one uncommitted diff; only that combined tree went through tsc / clean build / capture / check (851/851), so the intermediate commits were not deployed separately. globals.css was split by hand between R27 and R28; the restored file hashes to the tested blob (8f5e441). Last run's two /blog check failures were a stale capture: gone after a clean build + `npm run capture`. The clean build came from moving .next aside to `.next-old-0927` (rm -rf is denied by permissions); that directory is still in the repo root, untracked.
Boards: Main.dc.html / Mobile.dc.html (R27-R30); none for R31 (footer, /legal).
R27 now true: two full home cycles watched locally at 1280 and at 390 (watch-proc.mjs, 100ms, ~1476 samples each): one card on screen with legible text at every sample, including everywhere -> tracked with no bridge. Eight flagged spans per width, ~0.4s each, are the tier label alone (11-16 chars, under the script's bar of 20) - readable, not empty. Live: reduced motion and JS off both show all 4 beats + 3 bridges stacked and visible at 390. A live cycle watch got only 16 samples in 82s (headless is challenged by Turnstile and the page is slow under it), so the cycle itself is verified locally on the same build, not live. Waiting screen (WAITING_TEMPO) not watched: it needs a scan running.
R28 now true: live 390 with JS - "Swipe for all four tiers ->" visible, --pkg-fade 56px on load, 0px scrolled to the end; shot looked at (R27-31-live-390/pkg-cue-live.png). Local 1280: cue hidden, mask none.
R29/R30/R31 now true: live HTML of / and /legal - no /compare in the header, /compare in the footer; old TwoWays sentence 0, new one present; "company number 12869202" and "11 Heworth Hall Drive, York, YO31 1AG" on both pages; no ICO number pattern on either.
Still differs: the board has no scroll cue (added by R28); the TwoWays standfirst wording is R30's, not the board's.
Denominator: local 1280 + 390 (JS, two cycles each; check-r28-31.mjs); live 1280 full vs Main at 3s, live 390 --js-off full vs Mobile, live --js-off 1280 full, live 390 JS (waiting for load, not networkidle), live 390 reduced + no-JS by script. shoot.mjs --reduced and check-r28-31.mjs timed out on networkidle against production (4 tries), so they were replaced by the scripted load-based checks. Check 851/851.

## R32 - domain field busy state -> 9d8938c (27 Sep 2026)
No board for the busy state; the field is Main.dc.html's (dark, /) and the /scan hero's (light), both LiveScanChecker -> DomainScreen, so one change covers both.
Third step shipped as "Reading your site", not Danny's "Writing your questions": /api/scan/start does Turnstile, the domain check and ceilings, the market pick, the cache, then readSite + readBrand. No step in it writes questions (those come after confirm, from /questions), so the phrase would have been false.
Now true, on production (check-r32.mjs; /api/scan/start intercepted inside the browser, held 5s then answered 400, so nothing reached the server): / and /scan at 1280 and 390 - field shows the normalised domain (typed "  https://WWW.Example.com/about " -> "example.com"), readOnly, opacity .75; button "Checking" with the ring, disabled, animation btnPulse, ring btnSpin; one status line steps "Checking example.com" -> "Working out your market" -> "Reading your site" (1.5s, 3.5s) and holds; one <p> in the form throughout. Reduced motion: the text steps, both animations none. Failure: button back to "Run a free scan"/"Check", field back to the typed value and editable, the reason in the same line (still 1 <p>). Shots looked at: R32/home-390-2000.png, R32/scan-1280-failed.png.
Not checked locally: without service keys scanReady() is false, so both pages render RequestScanForm, and a placeholder-env build needs approval this run could not get. So the busy state was first seen on production after the push; the step-4 bar (tsc, clean build, 851/851) was met before it.
Denominator: / and /scan x 1280/390 x motion/reduced, 3 busy samples + the failed state each, live (scan-390-reduced was still running when this was written). Check 851/851.

## R33-R37 - confirm screen, Danny's 27 Sep notes -> 703fce7 (27 Sep 2026)
One commit, one push for five items: four of them edit ConfirmScreen.tsx and hunks cannot be split without interactive staging. tsc, clean build (.next moved aside to .next-old-0927f; rm -rf is denied), `npm run capture`, check 851/851 on the exact tree pushed. Board: Flow1Confirm.dc.html. Local harness /q33h (Q07's, with a positioning line so both paragraphs show) built, checked, then removed before the clean build; kept at docs/parity/q33h-harness-removed. Script: docs/parity/r33-37-check.mjs.
R33 now true (harness): an added row shows two selects - cluster [b2b seo agency, technical seo agency, ecommerce seo agency] defaulting to the category, intent [Yours, Category, Positioning, Sector, Outcome, Comparison] defaulting to Yours; "Yours" leaves the list once a real intent is picked. After picking ecommerce seo agency / Comparison and switching every chip off: the four written rows are "-" at .4 opacity with plain-text cells, the own row is still "1" at full opacity, and it reads "Run 1 question" / "1 of a possible 5, across 1 cluster". isOwn now reads `own === true`, set only in add().
R34 now true (harness): Remove rgb(104,109,121) at rest, rgb(179,55,47) on hover and on keyboard focus (:focus-visible true). --bad-fg added to @theme at T.badFg's value; the rule is registered in contrast.test CSS_COLOURS (5.99:1 on white).
R35 now true: id faq-search-volume on the FAQ row. Chrome scrolled to the targeted <details> but left it shut (checked: open false), so FaqHashOpen (client) opens it on load and on hashchange. Local: direct load open, and via "here is why" on the harness open, row at the top. Live: open at 1280, 390, and reduced motion; with JS off it scrolls to the row and stays shut (the no-JS fallback). No other /#faq link on the site.
R36 now true (harness, 1280): confirm top on repeat(12) span 7/5. The section heads on this screen use 7/5 too (confirm-75), so both intros start at 748px, the card's x. Danny asked for this; the board draws 4/8, which put the intro at 459px, on neither column. One 62ch measure (read at 14.5px) on the whole left column: both paragraphs 503px wide, and the h1 wraps within it too (two lines, "This is what we read off the site. / Correct it before we run."). Card top 156 = domain label top 156. 390: single column, everything at x 24.
R37 verified, no change needed: after removing row 2 (a two-row cluster) the button read "Run 4 questions" and the footer "4 of a possible 5, across 3 clusters". Shot: R33-37/r37-after-remove.png.
Still differs from the board: the section-head split is 7/5, not 4/8 (Danny's instruction wins); the h1 wraps at 62ch where the board ran it across seven columns; the rest is real data and the inbox's deliberate differences.
Denominator: harness at 1280 (confirm, after removal, hover/focus, own row with all chips off, board compare R36-confirm) and 390 (full); /#faq-search-volume local direct + via link; live at 1280, 390, JS off and reduced. The confirm screen itself was not seen live: it needs a Turnstile-issued token.

## R44 - secure card sentence -> c82fa07 (27 Sep 2026); R41 migration file committed, not applied
R44 now true, live: "Want us to secure these placements for you?" server-rendered and visible on both real scans (57520f... .co.uk, 5e572d... US) at 1280 and 390; "secure the hard ones" 0 in src and 0 in either page's HTML. Wraps to two lines at 390 without breaking the card (R44/57520f-390.png). No board change; copy only.
Seen in passing, not fixed: the source list reads "1 answers you miss" (plural on 1), same shot.
R41: supabase/migrations/20260927000000_question_target_keyword.sql (target_keyword text, keyword_rank integer 1-100, if not exists) is in c82fa07 but NOT applied - no supabase CLI or psql in this environment, and the last migration (20260925) was applied by Danny in the SQL editor. Filed as a DANNY line in docs/blocked.md. R39, R40, R42 and R43 are held behind it: R41 says not to push writer code ahead of the columns, and R42's copy would promise a keyword the product does not yet give. R38's rules.md section is written (docs are untracked, so there is no push for it).
Denominator: live, two real scans x 1280/390, plus SSR HTML. Check 851/851 on the tree pushed (clean build + capture).

## Unqueued fix - "1 answers you miss" -> 07fff66 (27 Sep 2026)
Seen in the R44 live shot. The placement rows' phone label now agrees with the count. Live on the .co.uk scan's HTML: 13 "answer you miss" (count 1), 3 "answers you miss" (count >1). Check 851/851, clean build + capture.

## R39 (part) - keyword rule, unwired -> dbcbb27 (27 Sep 2026)
src/lib/scan/target-keyword.ts: stripFiller / normaliseCandidate / pickKeyword, 7 tests. Danny's example passes ("best business cash flow finance providers uk" -> "business cash flow finance providers"). The bare category is refused unless the category's supplier noun can be added, and a lone supplier noun is refused. Pick is the highest volume, else the shortest. No call site, no spend, no DB: the candidate-writing Claude call, the batched volume call, the confirm-route insert and the request-shape census update wait on R41's migration being applied. R39 stays open. Live: production serves dbcbb27 (no page changes to shoot). Check 858/858.

## R43 (part) - googleLine, the result page's Google fact -> 9bdd513 (27 Sep 2026)
A new pure function, `googleLine` in src/components/scan/result-figures.ts, now renders the question row's third cell and the drawer header's rank. Without a target_keyword it gives "Google #N" / "Not in Google top 20", exactly as before. With one it gives "<keyword> - <volume>/mo - <rank>". Any volume under 10 reads "under 10/mo" (tested at 0, 3, 7 and 9). A null volume drops that clause. The cell wraps only when a keyword is present. ScanQuestion has three new optional fields. Nothing sends them to the client until R41 is applied, so every live row still takes the old path.
Live: production serves 9bdd513. On the .co.uk scan at 1280 and 390 (R43-live/, R43-live-390/) the rows still read "Not in Google top 20" and the layout is unchanged. The US scan's HTML has 1 "Google #4" and 4 "Not in Google top 20", the same shape as before.
Not compared: a fixture carrying a keyword. /scan/[token] needs a DB row, so none can be served locally. R43 stays open.
Denominator: live .co.uk scan at 1280 and 390 (full page), US scan HTML. Check 861/861 on a clean build with capture.

## R40 (part) - keyword-rank read, unwired -> 392c318 (27 Sep 2026)
Added three pure pieces. keywordRankRequest in dataforseo-request.ts is the same Google organic path as google_aio, at SERP_DEPTH, in market, without load_async_ai_overview. parseOrganic is in engines.ts. rankOf moved from pipeline.ts to engines.ts with its body unchanged, so the question rank and the keyword rank come from one function. Two tests: rank with a subdomain, absent domain gives null, empty SERP gives undefined, and the request shape in both markets.
No call site, no spend, no spenders/spend-gates change yet. The door gets registered when the call is wired, which waits on R41. Production serves 392c318. No page changed, so nothing was shot. The pipeline's rankOf call site was not exercised live, because a scan needs Turnstile.
Check 863/863 on a clean build with capture.

## R39 (part 2) - keyword volume request/reader, unwired -> f78ff27 (27 Sep 2026)
Added keywordVolumeRequest (KEYWORD_VOLUME_PATH = /v3/keywords_data/google_ads/search_volume/live) and keywordVolumes in dataforseo-request.ts. One task a scan, deduplicated and lowercased, with a 1000-keyword ceiling. Keywords are keyed and read lowercased, and a missing or negative volume is null. The volume census was updated with a dated reason: the old endpoint is still refused by name, and the new path is held to exactly ["src/lib/scan/dataforseo-request.ts"]. dataforseo.ts joins that list when the call is wired. "nothing writes search_volume" is unchanged, because nothing writes it yet. Production serves f78ff27. No page change. Check 866/866 on a clean build with capture.

## R39 (part 3) - keywordCandidates, unwired -> c4863a9 (27 Sep 2026)
Added keywordCandidates(category, market, questions) to anthropic.ts. It is one messages.parse for the whole set and returns the supplier noun plus 3-5 candidates per idx. Its ceiling is min(8000, 400 + 150 x questions), and idx values the model invents are dropped. The model-call census (retry-policy.test.mts rule 1) went from 5 to 6, with the reason recorded. The copy census flagged the typed 3 and 5, so they became CANDIDATES_MIN/MAX. No caller. Production serves c4863a9. No page change. Check 866/866 on a clean build with capture.
Every pure and model piece of R39/R40/R43 is now in the tree. What remains is the wiring in confirm/route.ts (candidates, then volume, then pickKeyword, then insert target_keyword + search_volume), the keyword-rank reads with dfs_cost and spend-census registration, carrying the fields through scan_teaser and unlock, and R42's copy. All of it waits on the R41 migration being applied.

## R39/R40/R41 -> 2c56710, R42 (+R35) -> f1746dc - 27 Sep 2026
- R39-R41: keyword step wired into runScan (deriveKeywords, parallel to the engine reads, never fatal). No board: pipeline work. Verified live: `/api/scan/57520fc7.../full` 200 with the three keys present (null, pre-ship scan) - proves the columns exist and the unlock select holds. Not verified: a scan actually writing them (no paid scan from the builder), and the per-scan cost of the new calls (R40 asks for it on the first live scan).
- R42: confirm footer and homepage FAQ rewritten; "here is why" link, FaqHashOpen and the row id removed. Confirm screen not shot (needs a harness state). Denominator: copy only, no layout change.
- Still differs: free result shows the old Google line until 20260927010000 (scan_teaser) is applied - DANNY in blocked.md.

## R46 -> 33c7d33 - 27 Sep 2026
- Hero: at 390 `/` and `/scan` read "the gap. We close it." as one run, "We close it." unsplit (nowrap); at 1280 the two-line break is unchanged (vs Main.dc.html). Mobile.dc.html paints no break at 390 - matches.
- Logos: homepage four-tier tracked panel column headers (EngineLogo, label as title + sr-only), `/pr-agencies` answer cards (logo + "brand/category/objection question"), `/seo-agencies` ChatGPT mock (logo only). No engine word next to any of the three.
- Untouched by the diff: ScanProgress, EngineDemo, ResultView.
- Still differs: the `/seo-agencies` Google card still reads "Google · ..." - not in R46's list, left alone.
- Denominator: local and LIVE, 1280 and 390, JS on and `--js-off` (settled), homepage hero also `--reduced`. Clips in docs/parity/R46-spots and R46-live, hero comparisons in R46-hero-* and R46-live-hero-*.

## R43 - result page Google column: keyword, volume, rank (27 Sep 2026, 08:41Z)

- Commit: no new code; display 9bdd513, data 2c56710, teaser migration 20260927010000 (applied by Danny's Chrome). Checked on production ec87486.
- Board: none for this line (Danny's copy, docs/danny.md).
- Matches: `/scan/6839484c...` (crunch.co.uk, post-2c56710) rows read "online accounting firms - 90/mo - Google #1", "accountants with bookkeeping software - not in top 20" (null volume, clause dropped), "limited company accountants - 1,000/mo - Google #16"; its two keyword-less rows keep "Google #9" / "Not in Google top 20". Pre-R41 scan `/scan/57520fc7...` unchanged ("Not in Google top 20"). 390 stacks the line under the question inside the row card.
- Still differs: at 1280 the Google column is narrow, so a long keyword line wraps to three lines - the row grows, layout holds. Under-10 formatting only covered by the result-figures tests; no live row under 10 yet.
- Denominator: LIVE, two scans, 1280 and 390, JS on. Shots in docs/parity/R43-keyword-line.
