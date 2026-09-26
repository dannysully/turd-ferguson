import { WAITLIST_LIMITS } from "@/config/contact";
import { T } from "@/config/tokens";
import { CLOSE_WASH, D } from "@/components/home/dark";

/**
 * The dark closing card from HowItWorks.dc.html and WhatIsAeo.dc.html (R18,
 * 26 Sep 2026): a heading and one line on the left, the domain field on the
 * right. Both boards draw it identically bar the copy, so it is one component.
 *
 * A plain GET to /scan, as the /seo-agencies hero box is - not a second
 * LiveScanChecker, which hardcodes its DOM ids. `id` keeps the label unique.
 */
export default function DarkClosing({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      className="dark-close"
      style={{ marginTop: "72px", background: CLOSE_WASH + ", " + D.ground, borderRadius: "18px", padding: "36px 40px", color: T.surface }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{title}</h2>
        <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.6, color: D.muted }}>{children}</p>
      </div>
      <form action="/scan" method="get">
        <label htmlFor={id} style={{ display: "block", fontSize: "12px", fontWeight: 600, color: D.muted, marginBottom: "7px" }}>
          Domain
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            id={id}
            name="domain"
            type="text"
            maxLength={WAITLIST_LIMITS.domain}
            inputMode="url"
            autoComplete="url"
            placeholder="yourdomain.com"
            style={{
              flexGrow: 1,
              minWidth: 0,
              fontFamily: "inherit",
              fontSize: "15px",
              color: T.ink,
              background: T.surface,
              border: 0,
              borderRadius: "10px",
              padding: "13px 15px",
            }}
          />
          <button
            type="submit"
            style={{
              fontFamily: "inherit",
              fontSize: "15px",
              fontWeight: 600,
              color: T.ink,
              background: T.surface,
              border: 0,
              borderRadius: "10px",
              padding: "13px 26px",
              cursor: "pointer",
            }}
          >
            Check
          </button>
        </div>
      </form>
    </section>
  );
}
