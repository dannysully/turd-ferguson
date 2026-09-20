import Link from "next/link";

import { WAITLIST_LIMITS } from "@/config/contact";
import { formatPostDate, type Post } from "@/config/posts";
import { CARD, MICRO, SHELL, T } from "@/config/tokens";

/**
 * A post, from BlogPost.dc.html: the article on eight columns, the aside on
 * four. The aside carries the scan field, because the piece is the argument
 * and the field is what to do about it, and a contents list built from the
 * post's own headings.
 *
 * The board's callout - two big figures above the body - is not built. None
 * of the three pieces on the site carries a measured figure of its own, and a
 * callout filled with numbers nobody read is the exact thing the rules on the
 * About page exist to stop.
 */

export const H2 = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <h2
    id={id}
    style={{
      margin: "30px 0 0",
      fontSize: "19px",
      fontWeight: 700,
      letterSpacing: "-0.022em",
      color: T.ink,
      scrollMarginTop: "5rem",
    }}
  >
    {children}
  </h2>
);

export const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: "10px 0 0", fontSize: "16px", lineHeight: 1.75, color: "#3f4451" }}>{children}</p>
);

export const Quote = ({ children }: { children: React.ReactNode }) => (
  <blockquote style={{ margin: "26px 0 0", padding: "0 0 0 20px", borderLeft: "2px solid " + T.accent }}>
    <p style={{ margin: 0, fontSize: "17px", lineHeight: 1.6, color: T.ink, fontWeight: 500 }}>{children}</p>
  </blockquote>
);

export const Method = ({ children }: { children: React.ReactNode }) => (
  <p
    style={{
      margin: "26px 0 0",
      paddingTop: "14px",
      borderTop: "1px solid " + T.line,
      fontSize: "13px",
      lineHeight: 1.6,
      color: T.soft,
    }}
  >
    {children}
  </p>
);

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "14px",
  color: T.ink,
  background: T.surface,
  border: "1px solid " + T.line,
  borderRadius: "10px",
  padding: "11px 13px",
};

export default function PostShell(p: {
  post: Post;
  standfirst: string;
  sections: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const meta = formatPostDate(p.post.date) + " - " + p.post.readMinutes + " min read";
  return (
    <div className="post-shell" style={{ ...SHELL, paddingTop: "40px" }}>
      {/* The beat is on the header block and the two aside cards, and
          deliberately not on the body: `p.children` is the argument, and prose
          that arrives a paragraph at a time is the sparkle globals.css already
          declined for the chart tables. The body div carries no `.ac-row`, so
          it also takes no index and the five header rows stay contiguous. */}
      <article>
        <Link
          className="ac-row"
          href="/blog"
          style={{ display: "block", fontSize: "13px", fontWeight: 600, textDecoration: "none", color: T.accent }}
        >
          Back to writing
        </Link>

        <div className="ac-row" style={{ ...MICRO, marginTop: "20px" }}>{p.post.kind}</div>
        <h1
          className="ac-row"
          style={{
            margin: "10px 0 0",
            fontSize: "34px",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.18,
            color: T.ink,
          }}
        >
          {p.post.title}
        </h1>
        <p
          className="ac-row"
          style={{ margin: "14px 0 0", fontSize: "16px", lineHeight: 1.6, color: T.soft, maxWidth: "68ch" }}
        >
          {p.standfirst}
        </p>

        <div
          className="ac-row"
          style={{
            marginTop: "18px",
            paddingTop: "14px",
            borderTop: "1px solid " + T.line,
            display: "flex",
            gap: "14px",
            alignItems: "center",
            fontSize: "13px",
            color: T.soft,
            flexWrap: "wrap",
          }}
        >
          <span>{meta}</span>
        </div>

        <div style={{ marginTop: "26px", maxWidth: "68ch" }}>{p.children}</div>
      </article>

      <aside style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div className="ac-row" style={{ ...CARD, padding: "22px" }}>
          <div style={MICRO}>Run it yourself</div>
          <p style={{ margin: "8px 0 14px", fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
            Your own buying questions, on your own domain. Free, no call.
          </p>
          {/* A plain GET to /scan, the no-JS path the app already supports.
              Not a second checker: that component owns a fixed DOM id, so two
              of them on one page break the label. */}
          <form action="/scan" method="get">
            <label
              htmlFor="post-domain"
              style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}
            >
              Domain
            </label>
            <input id="post-domain" name="domain" type="text" maxLength={WAITLIST_LIMITS.domain} placeholder="yourdomain.com" style={fieldStyle} />
            <button
              type="submit"
              className="btn-primary"
              style={{
                width: "100%",
                marginTop: "8px",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 600,
                border: 0,
                borderRadius: "10px",
                padding: "11px 20px",
                cursor: "pointer",
              }}
            >
              Check
            </button>
          </form>
        </div>

        {p.sections.length ? (
          <div className="ac-row" style={{ ...CARD, padding: "22px" }}>
            <div style={MICRO}>On this page</div>
            <ul
              style={{
                margin: "12px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {p.sections.map((s) => {
                const href = "#" + s.id;
                return (
                  <li key={s.id}>
                    <a href={href} style={{ fontSize: "14px", textDecoration: "none", color: T.soft }}>
                      {s.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
