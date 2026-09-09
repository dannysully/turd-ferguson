"use client";

import { useState } from "react";
import { SECTORS, TIERS, priceFor, type Sector } from "@/config/pricing";
import TierName from "@/components/TierName";

const C = {
  navy: "#0B1220",
  purple: "#7C3AED",
  purpleLight: "#A855F7",
  body: "#4B5563",
  soft: "#F8F7FF",
  border: "#E5E7EB",
  white: "#ffffff",
};

export default function SectorPricing() {
  /* Session-only selection held in component state - no cookie, no storage. */
  const [sectorId, setSectorId] = useState<string>("");
  const sector: Sector | null = SECTORS.find((s) => s.id === sectorId) ?? null;

  return (
    <div>
      {/* Task 4 - sector selector. Renders only once D4 populates SECTORS, so
          no invented sector price can reach the page. */}
      {SECTORS.length > 0 && (
        <div style={{ maxWidth: "420px", margin: "0 auto 2.5rem", textAlign: "left" }}>
          <label
            htmlFor="sector"
            style={{
              display: "block",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: C.navy,
              marginBottom: "0.5rem",
            }}
          >
            Your client&apos;s sector
          </label>
          <select
            id="sector"
            value={sectorId}
            onChange={(e) => setSectorId(e.target.value)}
            style={{
              width: "100%",
              padding: "0.625rem 0.875rem",
              fontSize: "0.9375rem",
              color: C.navy,
              background: C.white,
              border: `1.5px solid ${C.border}`,
              borderRadius: "10px",
              fontFamily: "inherit",
            }}
          >
            <option value="">Select your sector</option>
            {SECTORS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          <p style={{ fontSize: "0.8125rem", color: C.body, lineHeight: 1.6, marginTop: "0.875rem" }}>
            Prices vary by industry because the work does. Publication standards, what is
            available in your niche, and how hard the answer box is to win all differ - each
            sector is priced against the resource it actually takes.
          </p>
        </div>
      )}

      {/* Four paid tiers, ascending. Each links to its package page. */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem", textAlign: "left" }}
        className="tier-grid"
      >
        {TIERS.map((tier) => {
          const isEmphasis = Boolean(tier.emphasis);
          return (
            <div
              key={tier.id}
              className="card-hover"
              style={{
                background: C.white,
                border: isEmphasis ? `2px solid ${C.purple}` : `1px solid ${C.border}`,
                borderRadius: "20px",
                padding: isEmphasis ? "2rem 1.5rem" : "1.75rem 1.5rem",
                boxShadow: isEmphasis
                  ? "0 8px 32px rgba(124,58,237,0.16)"
                  : "0 2px 12px rgba(11,18,32,0.05)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {isEmphasis && (
                <div
                  style={{
                    position: "absolute",
                    top: "-11px",
                    left: "1.5rem",
                    background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
                    color: C.white,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "0.25rem 0.625rem",
                    borderRadius: "999px",
                  }}
                >
                  Most agencies buy this
                </div>
              )}

              <p style={{ fontWeight: 700, fontSize: "1rem", color: C.navy, marginBottom: "0.375rem" }}>
                <TierName tier={tier.key} qualifier={tier.qualifier} />
              </p>
              <p style={{ fontSize: "0.75rem", color: C.purple, fontWeight: 600, marginBottom: "1rem", lineHeight: 1.4 }}>
                {tier.positioning}
              </p>

              <p style={{
                fontWeight: 800,
                fontSize: tier.basePrice === null ? "1.25rem" : "1.75rem",
                color: C.navy,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                marginBottom: "1.25rem",
              }}>
                {priceFor(tier, sector)}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                {tier.includes.map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <svg width="12" height="9" viewBox="0 0 12 9" fill="none" style={{ marginTop: "5px", flexShrink: 0 }}>
                      <path d="M1 4.5l3.5 3.5L11 1" stroke={C.purple} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: "0.8125rem", color: C.body, lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href={tier.cta.href}
                className={isEmphasis ? "btn-primary" : undefined}
                style={
                  isEmphasis
                    ? { display: "block", textAlign: "center", padding: "0.75rem 1rem", fontSize: "0.875rem" }
                    : {
                        display: "block",
                        textAlign: "center",
                        padding: "0.75rem 1rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: C.navy,
                        background: C.soft,
                        border: `1px solid ${C.border}`,
                        borderRadius: "10px",
                        textDecoration: "none",
                      }
                }
              >
                {tier.cta.label}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
