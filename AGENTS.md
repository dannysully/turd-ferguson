<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# How to work in this repo

Owned by Claude: decide, build, ship, check it worked live, fix what did not.
Do not ask permission for anything reversible - copy, layout, components,
refactors, dependency bumps, new pages, deleting what is not working. Pick the
option you would defend and say in one line what you picked.

The site has almost no traffic. A rough thing in production for ten minutes
costs nothing; a decision waiting on a round trip costs an hour. Ship.

## Shipping

- **`claude/build-alwayscited-site-6CpGg` deploys to production on every push.**
  There is no preview gate and no test suite. `npx tsc --noEmit` and
  `npm run build` are the bar, then open the page and look.
- **`git add src supabase`, never `-A`.** A push containing
  `.github/workflows/` is rejected outright - the PAT has no `workflow` scope.
- **Batch.** Four or five changes, one push. Not one push per change.
- **Schema changes are SQL pasted into Supabase by Danny, before the code.**
  Additive only, so a deploy landing first is harmless.

## Gotchas that have cost real time

- **The domain cache.** `app_settings.domain_cache_days` returns a completed
  scan for the same `(domain, market)` as-is, instantly, and looks identical to
  a fresh one. **If the read date has not changed, it did not re-run.** Pipeline
  fixes only apply at scan time. Force a run with a different domain, a
  different market, or by dropping and restoring the setting.
- **Token ceilings scale with the scan.** One classification call per scan held
  until one had 223 sources and truncated mid-JSON. Classification is wrapped in
  "never fatal", so it failed silently and shipped a half-built report. Anything
  looping over sources or questions gets batched.
- **Silent-failure paths hide regressions.** The try/catch that stops a scan
  dying also hides that it broke. Check them after any nearby change.
- **Brand names and source kinds are judged by different code** that can
  disagree. The source classifier knows a tool domain; the brand extractor does
  not, and will rank Shopify as a competitor to an analytics consultant.

## Not to be done, whatever the instruction

- Handle, enter or store a credential.
- Run DDL against production.
- Write `.github/workflows/` - it runs arbitrary code with the repo's secrets.
- Commit a secret. **This repository is public.**
- Bulk-delete live rows, or contact a lead or client.
- Publish a claim that cannot be stood behind. "Ship it rough" covers layout,
  copy and bugs. It does not cover a number about a client's result, a claim
  about a competitor, or a statement about what an engine does - those carry
  `[VERIFY]` until there is a dated source. The cost of a wrong one is not a
  scruffy page.
- Say something is verified that was only reasoned about. Verified means a
  checksum, a build log, a page actually read, or a test that ran.

# Copy conventions

## The brand never takes a capital

Always write `alwayscited`, lowercase, everywhere - body copy, meta titles,
headings, and at the start of a sentence. Where a lowercase word opening a
sentence reads badly, rewrite so the brand is not first: "We place brands
inside..." rather than "alwayscited places brands inside...".

Never `AlwaysCited`, `Alwayscited`, or `always cited`.

## Tier names

Four tiers, each one lowercase word, no spaces and no capitals:

| Tier | Written as |
|---|---|
| Tracking, free | `alwaystracked` |
| Tracking, paid | `alwaystracked pro` |
| Placements | `alwaysmentioned` |
| Core product | `alwayscited` |
| Enterprise | `alwayseverywhere` |

Render them with the `TierName` component, which colours the accent half in
`--brand-purple` to match the logo lockup. Do not hand-colour spans anywhere
else.

Use the unstyled one-word form (`TIER_PLAIN`) in every context that strips
colour: title tags, meta descriptions, OG and Twitter values, alt text,
aria-label, plain-text and transactional email, invoices, contracts, the
partner agreement, URLs and slugs, and JSON-LD.

Colour must never be the only way to tell tiers apart. Each accent word is
unique, so the word alone identifies the tier - keep it that way in the
pricing table and the FAQ.

## The core tier shares the company name

`alwayscited` is both the business and the $2,495 plan. In running copy always
write "the alwayscited plan" so the reader can tell which is meant. The bare
form is only used inside the pricing card and the comparison table, where
context is unambiguous.
