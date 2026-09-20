import { T } from "@/config/tokens";

/**
 * The marker that says a claim on this page has not been verified.
 *
 * ## Why this is a component and not three copies
 *
 * It was three, and they had already drifted. `/legal` and the vibe-retail case
 * study each carried a byte-identical private `Gap`; `/white-label` wrote the
 * `<mark>` inline with the words `[TO CONFIRM: ...]` typed into the JSX, and it
 * was **missing `fontSize: "0.95em"`** - so the one page that did not go through
 * a helper was the one that had lost a property. That is the date-formatter
 * species again, third time recorded in this repo: two copies of one thing, and
 * the copy nothing tested is the one missing a rule.
 *
 * The drift so far is cosmetic. What it is one edit away from is not. AGENTS.md
 * puts a claim about a client's result, a competitor, or what an engine does
 * outside "ship it rough" and requires `[VERIFY]` until there is a dated source;
 * `blocked.md` item 1 lists seven legal facts that ship as these markers right
 * now. This mark is the whole mechanism by which an unconfirmed fact does not
 * read as a confirmed one, and it was maintained by hand in three places with
 * nothing checking they agreed.
 *
 * `to-confirm.test.mts` holds it: the string cannot be typed into a page
 * directly, and the marker cannot stop being visually distinct.
 */
export const TO_CONFIRM = "TO CONFIRM";

export default function ToConfirm({ children }: { children: React.ReactNode }) {
  return (
    <mark
      style={{
        background: T.warnBg,
        color: T.warnFg,
        padding: "1px 6px",
        borderRadius: "6px",
        fontWeight: 600,
        fontSize: "0.95em",
      }}
    >
      [{TO_CONFIRM}: {children}]
    </mark>
  );
}
