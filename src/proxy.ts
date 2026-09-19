import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { constantTimeEqual, decodeBasicAuth } from "@/lib/constant-time";

/**
 * HTTP Basic auth over /admin. The operations page exposes cost, lead counts
 * and failure detail, so it is never public.
 *
 * Proxy runs before rendering and cannot import server-only modules, so the
 * credentials are read straight from the environment here, and the two helpers
 * it shares with the cron route are plain standard-library JavaScript.
 */
function challenge(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "www-authenticate": 'Basic realm="alwayscited admin", charset="UTF-8"' },
  });
}

export function proxy(request: NextRequest) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  // With no credentials configured the page stays shut rather than open.
  if (!user || !password) {
    return new NextResponse("Admin access is not configured.", { status: 503 });
  }

  /**
   * Decoded as UTF-8, which is what the charset above asks the browser to
   * send. This used to read the bytes back through atob alone and compare
   * that latin1 string against process.env, so an accented character in
   * ADMIN_PASSWORD reached here as two characters where the environment holds
   * one - a password that could never be typed correctly, failing as an
   * ordinary wrong password with nothing to say it was impossible.
   */
  const creds = decodeBasicAuth(request.headers.get("authorization") ?? "");
  if (!creds) return challenge();

  /**
   * Both halves are compared, every time.
   *
   * && short-circuits, so a wrong user name returned before the password was
   * looked at - a timing signal that says which of the two is wrong, on the one
   * page that has to stay shut. The reason these two calls do not exit early on
   * the first differing character is defeated by an operator that exits early
   * on the first differing field.
   */
  const userOk = constantTimeEqual(creds.user, user);
  const passwordOk = constantTimeEqual(creds.password, password);
  const ok = userOk && passwordOk;

  return ok ? NextResponse.next() : challenge();
}

export const config = {
  matcher: "/admin/:path*",
};
