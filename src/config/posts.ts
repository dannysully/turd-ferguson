/**
 * The writing, in one place.
 *
 * The index used to hold this list and each post repeated its own title and
 * date in three places. One registry means the index, the post header and the
 * structured data cannot drift apart.
 *
 * `kind` is the filter on BlogIndex.dc.html. The board assigns these itself,
 * and they are kept as it has them.
 */

import type { Metadata } from "next";

import { OG_IMAGE } from "./og";
import { BRAND, ORG_REF, SITE_URL } from "./schema";

export type PostKind = "Findings" | "Method" | "Running an agency";

export type Post = {
  slug: string;
  title: string;
  /** One line of standfirst, shown on the index. */
  blurb: string;
  kind: PostKind;
  /** ISO, so it sorts and so the structured data can use it verbatim. */
  date: string;
  readMinutes: number;
};

const REGISTERED: Post[] = [
  {
    slug: "how-llms-pick-which-brands-to-recommend",
    title: "How LLMs pick which brands to recommend",
    blurb:
      "A model asked for a recommendation does not evaluate suppliers. It reads a small set of editorial sources and returns what they say.",
    kind: "Method",
    date: "2026-04-30",
    readMinutes: 5,
  },
  {
    slug: "aeo-vs-seo-whats-actually-different",
    title: "AEO vs SEO: what is actually different",
    blurb:
      "Two overlapping channels with different surfaces, different measurement and different time horizons. What carries over, and what does not.",
    kind: "Findings",
    date: "2026-04-30",
    readMinutes: 5,
  },
  {
    slug: "why-most-aeo-audits-are-a-waste-of-money",
    title: "Why most AEO audits are a waste of money",
    blurb:
      "The industry has a new product to sell, and most of it is a report nobody acts on. What to buy instead.",
    kind: "Findings",
    date: "2026-04-30",
    readMinutes: 5,
  },
];

/**
 * Newest first, sorted here rather than trusted to the order above.
 *
 * The index takes the first entry as its lead card and lists the rest under
 * it, so the order of this array was the running order of the blog. Nothing
 * enforced it: a fourth post typed at the bottom would have published under
 * three older ones, and the only thing that would have said so is somebody
 * looking at the page. All three carry the same date today, so this changes
 * nothing now and is here for the post after them - ties keep the order they
 * are written in, which is what a stable sort gives.
 */
export const POSTS: Post[] = [...REGISTERED].sort((a, b) => b.date.localeCompare(a.date));

export function postBySlug(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/**
 * The post, or a build that fails loudly.
 *
 * A post page whose slug is not in this list has lost its title, date and
 * kind. Rendering it half-built is worse than not building: the error names
 * the slug and the fix is one line here.
 */
export function requirePost(slug: string): Post {
  const post = postBySlug(slug);
  if (!post) throw new Error("no post registered for the slug " + slug);
  return post;
}

/**
 * Where the post lives. Built from the slug rather than typed, because it was
 * typed three times per post - the canonical, the Open Graph url and the
 * structured-data url - and three hand-copied URLs are three chances for a
 * renamed slug to leave one of them pointing at a 404.
 */
export function postUrl(post: Post): string {
  return SITE_URL + "/blog/" + post.slug;
}

/**
 * The metadata that is a fact about the post rather than a piece of copy.
 *
 * The registry above exists so the index, the post header and the structured
 * data cannot drift apart, and for the h1 it worked. The title tag never went
 * through it. All three posts retyped their own, and all three retyped it in
 * title case, so the page said "How LLMs pick which brands to recommend" and
 * the tab, the SERP result and the share card said "How LLMs Pick Which
 * Brands to Recommend". Sentence case is the rule on every other title on the
 * site and on the h1 six lines below the one that broke it.
 *
 * The descriptions stay arguments. They are copy, the SERP one and the share
 * one differ on purpose, and nothing else on the site holds a second copy of
 * either - so they are not a drift risk and do not belong in the registry.
 */
export function postMetadata(
  post: Post,
  copy: { description: string; ogDescription: string },
): Metadata {
  return {
    title: post.title,
    description: copy.description,
    alternates: { canonical: postUrl(post) },
    // OG_IMAGE because openGraph merges shallowly - see config/og.ts.
    openGraph: {
      images: OG_IMAGE,
      title: post.title + " | " + BRAND,
      description: copy.ogDescription,
      url: postUrl(post),
    },
  };
}

/**
 * The BlogPosting node.
 *
 * `headline` was the fourth spelling of the title: sentence case, but with a
 * trailing clause no heading on the page carried, so the structured data
 * announced a different article from the one it was attached to. On a site
 * that sells being the entity an answer engine recognises, that is the exact
 * drift we tell clients to fix.
 *
 * `datePublished` was the other retyped fact. The registry date is what the
 * index sorts on, so the two could disagree about when a post was published
 * and only one of them would move it up the page.
 */
export function blogPostingSchema(post: Post, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    url: postUrl(post),
    datePublished: post.date,
    author: ORG_REF,
    publisher: ORG_REF,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-04-30" -> "30 Apr 2026". Fixed table, so server and browser agree. */
export function formatPostDate(iso: string): string {
  const parts = iso.slice(0, 10).split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return iso;
  return d + " " + MONTHS[m - 1] + " " + y;
}
