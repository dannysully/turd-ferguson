"use client";

import Link, { useLinkStatus } from "next/link";

/**
 * The dashboard's loading state (R151, 1 Oct 2026). Every /app page is
 * force-dynamic and reads before it draws, so a click on a filter, a range
 * or a cluster used to leave the previous page standing, unchanged, until
 * the read came back - no sign the click took.
 *
 * Not a loading.tsx: under /app/[client] it would start streaming before the
 * pages' session and slug checks, so a signed-out visit would answer 200
 * instead of redirecting and a slug you are not a member of 200 instead of
 * 404 (node_modules/next/dist/docs/.../loading.md, "Status Codes"). Instead
 * the dashboard's links are this Link, whose child draws a bar along the top
 * of the window while its navigation is pending, and DatePicker draws the
 * same bar while its push is in a transition. Fixed, so it takes no space
 * and moves nothing (useLinkStatus's own advice on layout shift).
 */
export function PendingBar({ on }: { on: boolean }) {
  return on ? <span aria-hidden="true" className="app-pending" /> : null;
}

function Pending() {
  return <PendingBar on={useLinkStatus().pending} />;
}

export default function AppLink({ children, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <Pending />
    </Link>
  );
}
