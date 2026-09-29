"use client";

import { usePathname } from "next/navigation";

/**
 * The marketing header and footer, everywhere but the client dashboard.
 *
 * /app is a full-height shell of its own - sidebar left, content right - as
 * boards/Main.dc.html draws it, with neither the site nav nor the site footer
 * (R104, Reviewer, 29 Sep 2026). A route group would mean moving every public
 * page's folder, and several censuses record those paths; the pathname is read
 * on the server render too, so the chrome is absent with JS off as well.
 */
export function isAppPath(pathname: string | null): boolean {
  return pathname === "/app" || (pathname ?? "").startsWith("/app/");
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  return isAppPath(usePathname()) ? null : children;
}
