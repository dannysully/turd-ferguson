import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * HTTP Basic auth over /admin. The operations page exposes cost, lead counts
 * and failure detail, so it is never public.
 *
 * Proxy runs before rendering and cannot import server-only modules, so the
 * credentials are read straight from the environment here.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

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

  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("basic ")) return challenge();

  let decoded: string;
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return challenge();
  }

  const sep = decoded.indexOf(":");
  if (sep === -1) return challenge();

  const ok =
    constantTimeEqual(decoded.slice(0, sep), user) && constantTimeEqual(decoded.slice(sep + 1), password);

  return ok ? NextResponse.next() : challenge();
}

export const config = {
  matcher: "/admin/:path*",
};
