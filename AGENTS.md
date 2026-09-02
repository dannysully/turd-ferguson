<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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
