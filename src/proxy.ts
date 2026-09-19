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

  const ok =
    constantTimeEqual(creds.user, user) && constantTimeEqual(creds.password, password);

  return ok ? NextResponse.next() : challenge();
}

export const config = {
  matcher: "/admin/:path*",
};
