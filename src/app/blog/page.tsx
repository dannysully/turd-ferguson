import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";
import Link from "next/link";

import { formatPostDate, POSTS, type PostKind } from "@/config/posts";
import { CARD, MICRO, SHELL, T } from "@/config/tokens";
import { ORG_REF } from "@/config/schema";

/**
 * The writing index, from BlogIndex.dc.html.
 *
 * Two things on the board are not built. The filter pills are real - they
 * filter - but only the kinds that have a post in them are shown, because a
 * pill that leads to an empty page is a worse answer than no pill. And the
 * lead post card has no metric cells: the board fills them with [METRIC
 * LABEL] and [N], and none of these pieces carries a figure of its own.
 * Inventing two would be inventing a finding.
 */

export const metadata: Metadata = {
  title: "What we have actually found",
  description:
    "Written for people who run agencies, not for search engines. Every number says where it came from and when it was taken.",
  alternates: { canonical: "https://alwayscited.com/blog" },
  openGraph: {
    images: OG_IMAGE,
    title: "What we have actually found | alwayscited",
    description: "Written for people who run agencies, not for search engines.",
    url: "https://alwayscited.com/blog",
  },
};

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "alwayscited",
  description: "Notes on AI search, written for people who run agencies.",
  url: "https://alwayscited.com/blog",
  publisher: ORG_REF,
};

function pill(active: boolean): React.CSSProperties {
  return {
    background: active ? T.surface : "transparent",
    border: "1px solid " + (active ? T.line : "transparent"),
    color: active ? T.ink : T.soft,
    fontSize: "14px",
    fontWeight: 600,
    padding: "8px 15px",
    borderRadius: "999px",
    textDecoration: "none",
  };
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const kinds = Array.from(new Set(POSTS.map((p) => p.kind))) as PostKind[];
  const active = kinds.find((k) => k === kind) ?? null;
  const shown = active ? POSTS.filter((p) => p.kind === active) : POSTS;
  const lead = shown[0];
  const rest = shown.slice(1);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }} />

      <section style={{ ...SHELL, paddingTop: "44px", display: "flex", flexDirection: "column", gap: "26px" }}>
        <div className="board-head confirm-head">
          <div>
            <div style={MICRO}>Writing</div>
            <h1
              style={{
                margin: "8px 0 0",
                fontSize: "27px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: T.ink,
              }}
            >
              What we have actually found
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Written for people who run agencies, not for search engines. Every number says where it came from and
            when it was taken. No explainers on what an AI Overview is.
          </p>
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <Link href="/blog" style={pill(!active)}>
            All
          </Link>
          {kinds.map((k) => (
            <Link key={k} href={"/blog?kind=" + encodeURIComponent(k)} style={pill(active === k)}>
              {k}
            </Link>
          ))}
        </div>

        {lead ? (
          <Link
            href={"/blog/" + lead.slug}
            style={{ ...CARD, display: "block", padding: "28px 30px", textDecoration: "none" }}
          >
            <div style={{ ...MICRO, color: T.accent }}>{lead.kind}</div>
            <h2
              style={{
                margin: "10px 0 0",
                fontSize: "25px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.22,
                color: T.ink,
                maxWidth: "24ch",
              }}
            >
              {lead.title}
            </h2>
            <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.6, color: T.soft, maxWidth: "70ch" }}>
              {lead.blurb}
            </p>
            <div style={{ marginTop: "14px", fontSize: "13px", color: T.soft }}>
              {formatPostDate(lead.date) + " - " + lead.readMinutes + " min read"}
            </div>
          </Link>
        ) : null}

        {rest.length ? (
          <div style={{ ...CARD, overflow: "hidden" }}>
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={"/blog/" + post.slug}
                className="post-row"
                style={{ borderTop: "1px solid " + T.hair, textDecoration: "none" }}
              >
                <div style={MICRO}>{post.kind}</div>
                <div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      letterSpacing: "-0.022em",
                      color: T.ink,
                      lineHeight: 1.35,
                    }}
                  >
                    {post.title}
                  </div>
                  <div style={{ fontSize: "13.5px", lineHeight: 1.55, color: T.soft, marginTop: "4px" }}>
                    {post.blurb}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "13px", color: T.soft }}>
                  {formatPostDate(post.date) + " - " + post.readMinutes + " min"}
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
