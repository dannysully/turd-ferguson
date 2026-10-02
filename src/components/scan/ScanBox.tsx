import { WAITLIST_LIMITS } from "@/config/contact";
import { T } from "@/config/tokens";

/**
 * A page's own free-scan card: the field and button that /seo-agencies,
 * /how-it-works and the vibe-retail case study draw in their own wording
 * (R181, 2 Oct 2026). LiveScanChecker passes the handlers, and the scan starts
 * here; with none - no JavaScript, or a page rendered while the checker is
 * not ready - it is the plain GET to /scan these cards always were, so the
 * visitor lands on /scan with the domain filled in.
 */
export type ScanBoxCopy = {
  /** The field's label: visually hidden on the inline cards, shown on the stacked one. */
  label: string;
  placeholder: string;
  /** The case study's sidebar card: label above, full-width button below. */
  stacked?: boolean;
};

export default function ScanBox(
  p: ScanBoxCopy & {
    id: string;
    value?: string;
    onChange?: (v: string) => void;
    onSubmit?: (e: React.FormEvent) => void;
    error?: string;
    status?: string;
    busy?: boolean;
  },
) {
  const line = p.error || p.status || "";
  const live = Boolean(p.onSubmit);
  const input: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: "14px",
    color: T.ink,
    background: T.surface,
    border: `1px solid ${T.line}`,
    borderRadius: "10px",
    opacity: p.busy ? 0.75 : 1,
    ...(p.stacked
      ? { width: "100%", boxSizing: "border-box", padding: "11px 13px" }
      : { flexGrow: 1, minWidth: 0, padding: "0 12px", minHeight: "44px" }),
  };
  const button: React.CSSProperties = p.stacked
    ? { width: "100%", marginTop: "8px", fontFamily: "inherit", fontSize: "14px", fontWeight: 600, border: 0, borderRadius: "10px", padding: "11px 20px", cursor: "pointer" }
    : { fontFamily: "inherit", fontSize: "14px", fontWeight: 600, color: "#ffffff", background: T.accent, border: 0, borderRadius: "10px", padding: "0 18px", minHeight: "44px", cursor: "pointer", flex: "none" };
  const value = live ? { value: p.value ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => p.onChange?.(e.target.value) } : {};
  return (
    <form action="/scan" method="get" onSubmit={p.onSubmit} noValidate data-scan-card={live ? "live" : "get"} style={p.stacked ? undefined : { marginTop: "14px" }}>
      <div style={p.stacked ? undefined : { display: "flex", gap: "8px" }}>
        <label
          htmlFor={p.id}
          className={p.stacked ? undefined : "sr-only"}
          style={p.stacked ? { display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" } : undefined}
        >
          {p.label}
        </label>
        <input
          id={p.id}
          name="domain"
          type="text"
          maxLength={WAITLIST_LIMITS.domain}
          inputMode="url"
          autoComplete="url"
          placeholder={p.placeholder}
          style={input}
          readOnly={p.busy}
          aria-invalid={Boolean(p.error)}
          aria-describedby={line ? `${p.id}-err` : undefined}
          {...value}
        />
        <button
          type="submit"
          className={p.stacked ? "btn-primary" : undefined}
          data-busy={p.busy ? "1" : undefined}
          disabled={p.busy}
          style={button}
        >
          {p.busy ? (
            <>
              <span className="btn-spin" aria-hidden="true" />
              Checking
            </>
          ) : (
            "Check"
          )}
        </button>
      </div>
      {/* The step while it runs and the reason when refused, as on the hero
          field: always rendered so the live region exists before the first
          step lands, role=alert only when it carries an error. */}
      {live && (
        <p
          id={`${p.id}-err`}
          role={p.error ? "alert" : "status"}
          style={{ fontSize: "13px", lineHeight: 1.5, margin: line ? "8px 0 0" : 0, color: p.error ? T.badFg : T.soft }}
        >
          {line}
        </p>
      )}
    </form>
  );
}
