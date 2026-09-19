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

export const POSTS: Post[] = [
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
