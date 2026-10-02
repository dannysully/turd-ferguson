import type { CSSProperties, ReactNode } from "react";

/**
 * A headline figure with its one-line basis, "24 of 100 answers" (DS17, R173
 * pass 2, 2 Oct 2026, benchmark "one-line figure definitions on hover and
 * focus"). A title= on a span showed it to a mouse only; here the figure
 * takes focus, the line shows on hover and focus (.app-fig in globals.css)
 * and a screen reader hears it as text. With no basis it is a plain span.
 */
export default function Fig({ def, style, children }: { def?: string | null; style?: CSSProperties; children: ReactNode }) {
  if (!def) return <span style={style}>{children}</span>;
  return (
    <span className="app-fig" tabIndex={0} data-def={def} style={style}>
      {children}
      <span className="sr-only">, {def}</span>
    </span>
  );
}
