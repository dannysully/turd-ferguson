# Project state and build spec

Written 18 September 2026 by the Claude session that did the design work, for
whichever session picks this up next. Read `AGENTS.md` first for the rules;
this is the state and the spec.

**The design lives in a Claude Design canvas you cannot see** - 29 artboards,
owned by Danny. Everything in "The design, in words" below is the spec derived
from it. Build from that. Where it is ambiguous, ask Danny rather than guessing,
because he can see the artboards and you cannot.

---

## Where this got to on 18 September

Thirteen commits. The site refresh groundwork is live; the redesign is not.

**Shipped and live:** sentence case throughout; the wordmark fixed on the dark
comparison block; AI search volume removed from the report; Hanken Grotesk
self-hosted via `@fontsource-variable`; every heading dropped to 700; source
kinds and Google position rendered on the scan result; the placement
opportunity derivation; `on_topic` on the classifier; brand spellings merged
before the leaderboard; source classification batched; Next 16.3.5 clearing all
nine advisories; the pricing basis beside the number.

**Designed, not built:** the homepage (hero sequence, four-tier journey,
packages, FAQ), the scan flow rework, the gated placement table, the vertical
landing pages, the campaign benchmark tool, and most content pages.

---

## The design, in words

### Tokens

Taken from Nomada's client-dashboard system, with the accent swapped to the
alwayscited purple. These are exact - do not re-derive them.

```
--bg      #f6f6f7    page background
--surface #ffffff    panels
--chip    #f4f4f6    quiet fills
--hair    #f2f2f4    internal rules
--line    #ececee    panel borders
--wash    #f4f0fe    accent tint (purple at ~6%)
--ink     #0f1115    primary text
--soft    #6f7480    secondary text
--faint   #9ca3af    tertiary / metadata
--accent  #7C3AED    brand purple
good      #0f7b45 on #edf6f1
warn      #c96a15 on #fbf1e6
bad       #b3372f on #faeceb
```

Engine colours, used for the logo tiles: ChatGPT `#10a37f`, Perplexity
`#20808d`, Gemini `#4285f4`, Claude `#d97757`, AI Overviews `#ea4335`.

### Type

Hanken Grotesk, 400 to 700, **never 800**. h1 27px/700/-0.03em. h2
19px/700/-0.022em. Body -0.005em. Metric value 36px/700/-0.035em. Micro-labels
12px/600/0.002em **in sentence case** - uppercase micro-labels were removed
deliberately and must not come back.

### Layout rules

- Hairline borders at 16-18px radius. **No box shadows anywhere.**
- Near-monochrome. Purple on the asterisk, the primary button, and one accent
  per block. Never accent-on-accent.
- A section heading and its description share a line, on a 12-column grid:
  heading `span 4`, description `span 8`.
- The homepage hero is centred. **Every other page is left-aligned.**
- One gradient per page at most.

### The brand lockup

`always` in ink, the suffix in purple: alwaystracked, alwaysmentioned,
alwayscited, alwayseverywhere. Render with the `TierName` component - never
hand-colour spans. On dark grounds the accent lifts to `#a78bfa` because
`#7C3AED` is unreadable on near-black. Email addresses stay one colour.

### Motion

One rule: **the hero sequence is the only multi-act animation on the site.**
Every other page gets exactly one beat, using the same vocabulary - staggered
`.in` reveals, a drawn line, a bar that grows, a listing that climbs. The test
before building one: remove the motion, and does the page lose an argument or
just some sparkle? Sparkle means do not build it. Blog, About, Legal and
Contact get no motion at all, and that restraint is what makes the rest mean
something. Everything respects `prefers-reduced-motion`.

### The homepage, in scroll order

**Hero.** Centred. `Every AI tool shows you the gap.` in ink, then
`We close it.` in purple, 46px/700/-0.032em. Below it the domain field as the
only call to action - no button pair - max-width 400px. Sub-copy: "Up to 14
questions across the clusters you keep."

**The waiting sequence.** Plays while a scan runs. Eight acts, autoplaying every
5.2s, with a clickable rail. A four-chip band across the top of the stage lights
the tier the current act belongs to, and under it the tier is stated at 21px
with its price and a one-line gloss - so a change of package is never something
you have to notice in 12px type. Engine logo tiles sit in the running strip,
visible throughout.

The eight acts: prompt data · open a prompt · the competitive gap · the
opportunity list · the placement and the link · both measures move (#10 to #5) ·
alwayscited, insertions and on-site (#5 to #1) · alwayseverywhere.

**Ranking is shown as a real Google results page**, not a chart: favicon, site
name, breadcrumb, blue title, snippet on your own row only. The client's listing
physically climbs, carrying a "was #10" badge. Two different journeys on
purpose - alwaysmentioned is a placement strategy whose links move rankings as a
consequence (#10 to #5); alwayscited is the aggressive tier that goes after the
top of the page (#5 to #1).

**The four-tier journey.** One tier animates at a time on a 3.6s cycle, rail
above is clickable. Nothing is hidden at rest.

**Packages, FAQ, closing scan, footer.**

### The scan flow

Four screens, not one page that changes.

1. **Confirm what we read.** Show the category and market read off the site and
   let them correct it *before* anything runs. Get this wrong and everything
   after it is wrong, and they will not say so unless asked. Cluster toggles;
   the question count moves with them.
2. **Running** - the sequence above.
3. **Free result.** Nearly everything is free: the questions, the per-question
   tallies, the verbatim answers, every source page with its kind and volume,
   and the competitive share of voice.
4. **The gate, and this is the change.** What is gated is **the placement
   opportunities** - source pages that feed answers the brand is absent from and
   that a client could realistically be placed into. Email, then a verification
   link, then the page reopens with the list unblurred. The list includes the
   "create" rows - pages that should exist and do not - because half of what
   alwaysmentioned sells is writing the page that should exist.

The derivation already exists in `lib/scan/unlock.ts` as `opportunities`. The
verification machinery already exists and is idempotent. **Neither needs
writing - the table needs building and the gate needs pointing at it.**

### Other pages designed

PR agencies (with a coverage-to-answers beat), SEO agencies, white label,
comparison, vs-[tool] template, packages, package detail, case studies index and
template, blog index and post, about, contact, legal, a phone layout, and a free
campaign benchmark tool for PR teams.

---

## Work queue, in the order I would do it

1. **Brand extraction is measuring the wrong population.** On an analytics
   consultant scan it ranked Shopify, Meta, Upwork, WordPress, LinkedIn,
   Screaming Frog and Tealium as brands - platforms, marketplaces and tools, not
   competitors. The headline reads "13th of 124 brands" and 124 is the count of
   proper nouns. Fix the same way the source classifier was fixed: judge whether
   each name supplies this category. Note the two halves disagree today - the
   source classifier knows a tool domain, the brand extractor does not.

2. **Verify `on_topic` actually works.** It has shipped but never successfully
   run. Read `/api/scan/<token>/full` for a recent scan and check nothing
   obviously off-topic survived into `opportunities`. Before the fix, a ski
   retailer's list contained `racingpost.com`, whose own note read "Horse racing
   news, unrelated category".

3. **Build the gated placement table** and move the gate onto it. This is the
   last piece of stage 2 and the screen a prospect trades an email for.

4. **Then the homepage**, which is the largest unbuilt piece of the design and
   needs nothing from the scan pipeline.

5. Remove `search_volume` from the teaser payload and the `scan_questions`
   column - its own additive migration.

---

## Decisions still sitting with Danny

- **Vibe Retail "#83 to #1"** appears in the hero sequence. The repo records
  #83 to #4 at eight weeks. #1 is later, from memory, with no dated reading.
  Date it from the tracker or ship #4. Do not ship it undated.
- **Legal page** needs retention periods, company number, registered address and
  the sub-processor list. These matter more once the benchmark tool collects
  emails.
- **About** needs team names.
- **The live CTA is "Book a 20-minute walkthrough"**; the design replaces it
  with the email gate onto the placement list. Those collide when the table
  lands - pick one.
- **Case study generator**: which KPI thresholds trigger a new study, and
  whether a generated one auto-publishes. Recommendation on file: it waits for a
  human yes. An auto-published claim about a named client cannot be withdrawn.

---

## How Danny works

Direct, data-led, commercially precise. No padding, no corporate language.
Hyphens not em-dashes. Sentence case. **Lead with bad news.** Say plainly what
was verified versus assumed - "I checked X and it does Y" beats "this should
work". He would rather ship something rough and fix it than wait, and he will
tell you when something is wrong rather than softening it. Do the same back.
