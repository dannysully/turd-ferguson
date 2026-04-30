# AlwaysCited — alwayscited.com

The AI Search Agency website. Built with Next.js (App Router), TypeScript, Tailwind CSS v4.

## Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env.local

# Run dev server
npm run dev
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `CONTACT_EMAIL_DESTINATION` | No (has default) | Email address to receive contact form submissions |
| `RESEND_API_KEY` | Yes (for form to send) | Resend API key — get one at resend.com |
| `NEXT_PUBLIC_SITE_URL` | No (has default) | Production URL, used in sitemaps and canonical tags |

## Wiring up the contact form

The contact form logs submissions to console by default. To actually send emails:

1. Install Resend: `npm install resend`
2. Add `RESEND_API_KEY` to `.env.local`
3. Edit `src/app/contact/actions.ts` — uncomment the Resend send block and remove the `console.log`

## Deployment

This project is ready for one-click Vercel deployment.

1. Push to GitHub (or GitLab / Bitbucket)
2. Connect repo in the Vercel dashboard
3. Add environment variables in Vercel project settings
4. Deploy

No `vercel.json` is needed — Next.js App Router projects work out of the box on Vercel.

## Pre-launch checklist

Before going live, replace or confirm the following placeholder content:

### Content
- [ ] **Contact email**: confirm `hello@alwayscited.com` is correct — appears in `Footer.tsx`, `ContactForm.tsx`, `actions.ts`, and `.env.example`
- [ ] **Client testimonial**: add real testimonial in `src/app/case-studies/vibe-retail/page.tsx` (marked `CLIENT TESTIMONIAL — to be confirmed before publication`)
- [ ] **Case study screenshots**: replace three `ImagePlaceholder` slots in the case study with real screenshots (AI Overview screenshots, Ahrefs traffic chart, Ahrefs keyword table) — each marked `IMAGE: drop screenshot here before publication`

### Brand
- [ ] **Logo**: add a real logo asset and update the text-only "AlwaysCited" wordmark in `Header.tsx`; update `logo` URL in the Organization schema in `src/app/page.tsx`
- [ ] **Social profiles**: add LinkedIn, X (Twitter), and other social URLs in `Footer.tsx` and the `sameAs` array in the Organization schema
- [ ] **Favicon**: replace `src/app/favicon.ico` with the real brand favicon
- [ ] **OG image**: create a 1200x630 OG image and add it to metadata in `src/app/layout.tsx`

### Technical
- [ ] **Canonical URLs**: confirm `https://alwayscited.com` is the correct production domain across all pages (search codebase for `alwayscited.com`)
- [ ] **Resend integration**: wire up email sending in `src/app/contact/actions.ts`

## Site structure

```
/                         Home
/how-it-works             Methodology page
/what-is-aeo              Cornerstone AEO explainer (highest-priority AEO page)
/case-studies/vibe-retail Anonymised client case study
/blog                     Blog index
/blog/how-llms-pick-...   Blog post 1
/blog/aeo-vs-seo-...      Blog post 2
/blog/why-most-aeo-...    Blog post 3
/about                    About page
/contact                  Contact form
/robots.txt               Auto-generated (all AI crawlers allowed)
/sitemap.xml              Auto-generated
```

## AEO notes — the site is itself an AEO target

- `FAQPage` JSON-LD schema on home and `/what-is-aeo`
- `Article`/`BlogPosting`/`Organization` schema on every page
- Question-format H2s throughout
- Comparison tables with semantic `<table>` markup on `/how-it-works` and `/what-is-aeo`
- All major AI crawlers explicitly allowed in `robots.txt` (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, anthropic-ai)
- Opening paragraphs on key pages are verbatim from the brief — tuned for AI Overview query matching
