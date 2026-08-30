/* Task 8 - tracker mock. Placeholder data only; no real client figures. */

const C = {
  navy: "#0B1220",
  purple: "#7C3AED",
  purpleLight: "#A855F7",
  white: "#ffffff",
};

/* The four honest AI Overview states. "Not measured" renders blank by design. */
type AioState = "cited" | "shown" | "none" | "unmeasured";

const aioChip: Record<AioState, { label: string; color: string; bg: string; border: string }> = {
  cited: { label: "Cited", color: "#4ADE80", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)" },
  shown: { label: "Shown, not cited", color: "#FBBF24", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  none: { label: "No Overview", color: "#9CA3AF", bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.22)" },
  unmeasured: { label: "-", color: "#4B5563", bg: "transparent", border: "rgba(255,255,255,0.12)" },
};

const rows: { kw: string; article: string; page: string; aio: AioState; llm: string }[] = [
  { kw: "best [your category] 2026", article: "#2", page: "#6", aio: "cited", llm: "3" },
  { kw: "[your category] software for teams", article: "#4", page: "#11", aio: "shown", llm: "1" },
  { kw: "[your category] platform comparison", article: "#1", page: "#8", aio: "none", llm: "2" },
  { kw: "top [your category] providers", article: "#7", page: "#19", aio: "unmeasured", llm: "" },
];

function StateChip({ state }: { state: AioState }) {
  const s = aioChip[state];
  return (
    <span style={{
      display: "inline-block",
      fontSize: "0.65rem",
      fontWeight: 600,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: "999px",
      padding: "0.15rem 0.5rem",
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

export default function TrackerMock() {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "20px",
      padding: "1.5rem",
      maxWidth: "760px",
      margin: "0 auto",
    }}>
      {/* Header: placement identity + link state */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "1rem",
        flexWrap: "wrap",
        paddingBottom: "1.125rem",
        marginBottom: "1.125rem",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div>
          <p style={{ fontSize: "0.65rem", color: "#6B7280", marginBottom: "0.3rem" }}>
            Placement tracker · Your Brand
          </p>
          <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: C.white, lineHeight: 1.3 }}>
            &ldquo;Best [your category] Platforms 2026&rdquo;
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{
            fontSize: "0.65rem", fontWeight: 600, color: "#4ADE80",
            background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "999px", padding: "0.2rem 0.625rem", whiteSpace: "nowrap",
          }}>
            Link live
          </span>
          <span style={{
            fontSize: "0.65rem", fontWeight: 600, color: "#4ADE80",
            background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "999px", padding: "0.2rem 0.625rem", whiteSpace: "nowrap",
          }}>
            Followed
          </span>
        </div>
      </div>

      {/* Keyword table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", minWidth: "600px" }}>
          <thead>
            <tr>
              {["Keyword", "Article", "Your page", "AI Overview", "LLM citations"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i === 0 ? "left" : "center",
                    padding: "0 0.625rem 0.625rem",
                    paddingLeft: i === 0 ? 0 : "0.625rem",
                    fontSize: "0.62rem",
                    fontWeight: 600,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ kw, article, page, aio, llm }) => (
              <tr key={kw} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: "0.75rem 0.625rem 0.75rem 0", color: "#E5E7EB", fontWeight: 500 }}>
                  {kw}
                </td>
                <td style={{ padding: "0.75rem 0.625rem", textAlign: "center", color: C.purpleLight, fontWeight: 700 }}>
                  {article}
                </td>
                <td style={{ padding: "0.75rem 0.625rem", textAlign: "center", color: C.white, fontWeight: 700 }}>
                  {page}
                </td>
                <td style={{ padding: "0.75rem 0.625rem", textAlign: "center" }}>
                  <StateChip state={aio} />
                </td>
                <td style={{ padding: "0.75rem 0.625rem", textAlign: "center", color: llm ? C.white : "#4B5563", fontWeight: 600 }}>
                  {llm || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: "0.65rem", color: "#4B5563", marginTop: "1.125rem", lineHeight: 1.5 }}>
        Illustrative layout. Placeholder brand and keywords - not client data.
      </p>
    </div>
  );
}
