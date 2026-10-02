import { Fragment } from "react";

// DS47: a cited page is drawn as host and path ("ledgerline.com/pricing"). Text never breaks after a
// slash on its own, so a long path broke mid-word ("bookkeepi/ng-tools") once overflow-wrap ran out of
// hyphens. A <wbr> after each slash lets the host stay whole and the path start a line; overflow-wrap
// still catches a single segment wider than the column.
export function PagePath({ page }: { page: string }) {
  const parts = page.split("/");
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 ? (
            <>
              /<wbr />
            </>
          ) : null}
        </Fragment>
      ))}
    </>
  );
}
