import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — Notes on AI Search",
  description:
    "How LLMs pick brands, why most AEO services miss the point, and what's actually changing in B2B search. Notes from the AlwaysCited team.",
  alternates: { canonical: "https://alwayscited.com/blog" },
  openGraph: {
    title: "Blog — Notes on AI Search | AlwaysCited",
    description:
      "How LLMs pick brands, why most AEO services miss the point, and what's actually changing in B2B search.",
    url: "https://alwayscited.com/blog",
  },
};

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "AlwaysCited Blog",
  description: "Notes on AI search, AEO, and what's actually changing in B2B search.",
  url: "https://alwayscited.com/blog",
  publisher: {
    "@type": "Organization",
    name: "AlwaysCited",
    url: "https://alwayscited.com",
  },
};

const posts = [
  {
    slug: "how-llms-pick-which-brands-to-recommend",
    title: "How LLMs pick which brands to recommend (and what it means for your visibility)",
    excerpt:
      "When a B2B buyer asks ChatGPT for a product recommendation, the LLM doesn't independently evaluate vendors. It cites a small set of editorial sources — and returns the brand at the top. Here's the mechanism.",
    readTime: "5 min read",
    date: "30 April 2026",
  },
  {
    slug: "aeo-vs-seo-whats-actually-different",
    title: "AEO vs SEO: what's actually different (and what isn't)",
    excerpt:
      "AEO and SEO are overlapping channels with different target surfaces, different measurement frameworks, and different time horizons. Here's the clearest comparison you'll read this year.",
    readTime: "5 min read",
    date: "30 April 2026",
  },
  {
    slug: "why-most-aeo-audits-are-a-waste-of-money",
    title: "Why most AEO audits are a waste of money",
    excerpt:
      "The agency industry has a new product to sell. Most of it is a report you don't need. If you're being pitched an AEO audit as a standalone deliverable, you're being sold the wrong thing.",
    readTime: "5 min read",
    date: "30 April 2026",
  },
];

export default function BlogIndexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />

      {/* Hero */}
      <section style={{ background: "linear-gradient(160deg, #0D1B2A 0%, #152636 100%)" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24 md:py-28">
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              color: "#ffffff",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              lineHeight: 1.2,
              marginBottom: "1rem",
            }}
          >
            Notes on AI search.
          </h1>
          <p style={{ color: "#b4c5d6", fontSize: "1.1rem", lineHeight: 1.6, maxWidth: "36rem" }}>
            How LLMs pick brands, why most AEO services miss the point, and what&apos;s actually
            changing in B2B search.
          </p>
        </div>
      </section>

      {/* Post list */}
      <section style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0",
              borderTop: "1px solid #B4B2A9",
            }}
          >
            {posts.map((post) => (
              <article
                key={post.slug}
                style={{ borderBottom: "1px solid #B4B2A9", padding: "2.5rem 0" }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "0.75rem",
                    fontSize: "0.8125rem",
                    color: "#5F5E5A",
                  }}
                >
                  <span>{post.date}</span>
                  <span>·</span>
                  <span>{post.readTime}</span>
                </div>
                <h2 style={{ marginBottom: "0" }}>
                  <Link
                    href={`/blog/${post.slug}`}
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', Times, serif",
                      color: "#0D1B2A",
                      fontSize: "clamp(1.2rem, 2.5vw, 1.5rem)",
                      lineHeight: 1.25,
                      textDecoration: "none",
                      display: "block",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {post.title}
                  </Link>
                </h2>
                <p
                  style={{
                    color: "#5F5E5A",
                    fontSize: "0.9375rem",
                    lineHeight: 1.7,
                    maxWidth: "44rem",
                    marginBottom: "1rem",
                  }}
                >
                  {post.excerpt}
                </p>
                <Link
                  href={`/blog/${post.slug}`}
                  style={{ color: "#D85A30", fontSize: "0.9375rem", fontWeight: 500 }}
                >
                  Read →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
