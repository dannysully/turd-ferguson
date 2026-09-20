# Project state and build spec

Written 18 September 2026 by the Claude session that did the design work.
Read `AGENTS.md` first for the rules. **This file is the spec, not the queue.**

**Where the live picture actually is, as of 20 September 2026:**

- `docs/inbox.md` is the present tense - the current instructions, rewritten
  rather than appended to. Work from that.
- `docs/blocked.md`, OPEN section only, is what needs Danny.
- `docs/worklog.md` is the history. Do not work from it.

The status and queue sections of this file were a day stale by 20 September -
they said the redesign was unbuilt and listed five jobs that were done - and a
session that read them first lost time re-deriving it. They have been replaced
with the paragraph above. **The spec below is still current and is why this
file exists**: the tokens, type, layout rules, motion rule, the homepage in
scroll order, and the four screens of the scan flow.

**The design lives in a Claude Design canvas you cannot see** - 29 artboards,
owned by Danny. All 23 that were exported are now in `docs/design/` as
`.dc.html`, and every one except the parked `VsTool` is referenced from `src/`.
Read the board before changing a page it covers; "The design, in words" below
is the derived spec and the board is the source.

---

## Where this got to

**18 September:** thirteen commits of refresh groundwork - sentence case
throughout; the wordmark fixed on the dark comparison block; AI search volume
removed from the report; Hanken Grotesk self-hosted via `@fontsource-variable`;
every heading dropped to 700; source kinds and Google position on the scan
result; the placement opportunity derivation; `on_topic` on the classifier;
brand spellings merged before the leaderboard; source classification batched;
Next 16.3.5; the pricing basis beside the number.

**19-20 September:** the redesign shipped. The homepage including the eight-act
hero sequence, the four-tier journey, packages and FAQ; the scan flow as four
screens at `/scan/[token]`; the gated placement table and the narrowed blur;
the four vertical pages rebuilt against their real boards; the coverage-check
stub; `/compare` without competitor columns; the template pages; `/legal`;
`/example` removed and redirected. Then roughly thirty commits of defect
sweeps - reads and writes that ignored their errors, RPCs invisible to both
sweeps, plain objects indexed by outside strings, typed counts that said
"1 questions", two ways one scan's spend erased itself, and two URLs that
normalised to a different company's domain.

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

## Work queue

**Gone, because it was done and the list outlived it.** All five items this
section used to carry are closed: brand extraction now judges whether a name
supplies the category (`42fc1ee`, verified on a real scan - 62 of 108 names
kept); `on_topic` was verified on live data; the gated placement table is built
and the gate points at it; the homepage is built; and `search_volume` is off
the teaser payload. Dropping the column itself is destructive DDL and is not
ours under any instruction.

**The queue now lives in `docs/inbox.md`.** It is rewritten each time rather
than appended to, so it is the only file that can tell you what is outstanding.

---

## Decisions still sitting with Danny

**Do not maintain a second list here.** `docs/blocked.md`, OPEN section, is the
one that is kept current, and every item this section used to hold has either
moved there or been settled:

- **Vibe Retail "#83 to #1"** - settled. Danny attested it on 19 Sep 2026 as
  the account owner, with the four-month window. The page carries both
  readings, each with its own window. What is still open is the dates, the
  tracker, the prompt count and the AI Overview citations - blocked.md item 8.
- **Legal** - still open, blocked.md item 4, and visible as `[TO CONFIRM]`
  markers on the page itself.
- **About team names** - still open, blocked.md item 7.
- **The CTA collision** - resolved by building it: the email gate onto the
  placement list is what ships.
- **Case study generator** - not built, and the recommendation on file stands:
  it waits for a human yes, because an auto-published claim about a named
  client cannot be withdrawn.

---

## How Danny works

Direct, data-led, commercially precise. No padding, no corporate language.
Hyphens not em-dashes. Sentence case. **Lead with bad news.** Say plainly what
was verified versus assumed - "I checked X and it does Y" beats "this should
work". He would rather ship something rough and fix it than wait, and he will
tell you when something is wrong rather than softening it. Do the same back.
