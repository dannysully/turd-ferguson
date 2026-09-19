# alwayscited

The AI search visibility product and its site. Next.js App Router,
TypeScript, Tailwind v4, Supabase, deployed on Vercel.

The brand is always written lowercase, including at the start of a sentence.
The four tiers are `alwaystracked`, `alwaysmentioned`, `alwayscited` and
`alwayseverywhere`, each one lowercase word, rendered through the `TierName`
component. See AGENTS.md - it is the operating manual for this repo and takes
precedence over anything here.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

The bar before every push, because the branch deploys straight to production:

```bash
npx tsc --noEmit && npm run build
```

## The scan

A visitor enters a domain. The site is read, a language model writes the
buying questions, and each question is put to every engine in the free set.
What comes back is stored as measurements - whether the engine answered,
whether it named the brand, and every source it cited - plus the verbatim
answer, which is reclaimed after seven days if nobody claims the scan.

`src/lib/scan/` holds the pipeline. `pipeline.ts` runs it, `engines.ts` says
which engines and how to parse each one, `unlock.ts` derives what the email
gate is holding, and `settings.ts` reads the live caps from `app_settings` on
every request so they can be changed without a deploy.

Two things about it that have cost real time are written up in AGENTS.md: the
domain cache, and how a silent failure in classification can ship a
half-built report. Read those before changing anything in `lib/scan`.

Environment variables are documented in `.env.example`, and turning the scan
on for the first time is documented in `docs/scan-setup.md`.

## The site

| Route | What it is |
|---|---|
| `/` | The homepage, rebuilt from the design canvas |
| `/scan`, `/scan/[token]` | The scan funnel and a result by its public token |
| `/example` | The seven-step walkthrough on fixture data, labelled illustrative |
| `/alwaystracked` … `/alwayseverywhere` | One page per tier |
| `/white-label`, `/seo-agencies`, `/pr-agencies` | Agency pages |
| `/legal` | Privacy policy |
| `/how-it-works`, `/what-is-aeo`, `/blog`, `/about`, `/contact` | Content |
| `/case-studies/vibe-retail` | The one case study |
| `/admin/scans` | Basic-auth admin: spend, volume, readiness |

`src/config/tokens.ts` holds the design tokens and is the source for anything
rebuilt from the canvas. Sections still using a local `C` palette have not
been rebuilt yet.

`src/config/pricing.ts` is the single source for prices. No page types a
price literal - they all read it from there, so a change moves every surface
at once.

## The site is itself an AEO target

FAQPage and Article schema, question-format headings, real `<table>` markup
for comparisons, and every AI crawler allowed in `robots.txt`. The homepage's
FAQ schema is generated from the same array the page renders, so the markup
and the visible answers cannot drift apart.

## Still open

Tracked properly in `docs/state.md`, which is the handover, and in the
design canvas. The short version: the scan flow rework, the coverage
benchmark (Phase 2, not built), weekly tracking (Phase 3, not built), a
comparison page that needs competitor facts with dates on them, and terms of
service.
