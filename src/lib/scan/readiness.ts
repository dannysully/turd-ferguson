import "server-only";

/**
 * Everything the funnel needs to complete one scan end to end.
 *
 * The live checker renders only when all of these are present. Flipping to
 * live with a partial set is worse than staying dormant: the visitor gets a
 * domain field that accepts their brand and then fails at the reading step, or
 * refuses every submission because the bot check cannot be verified.
 */
type Requirement = { key: string; why: string };

const REQUIRED: Requirement[] = [
  { key: "SUPABASE_URL", why: "where scans are stored" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", why: "server-side database access" },
  { key: "ANTHROPIC_API_KEY", why: "reads the site and writes the questions" },
  { key: "DATAFORSEO_LOGIN", why: "asks the engines" },
  { key: "DATAFORSEO_PASSWORD", why: "asks the engines" },
  { key: "IP_HASH_SALT", why: "the per-IP limit will not run without it" },
];

/**
 * Turnstile is only enforced in production, matching verifyTurnstile. Without
 * the secret every live submission would be refused, so in production it is
 * part of being ready rather than an optional extra.
 */
const PRODUCTION_ONLY: Requirement[] = [
  { key: "TURNSTILE_SECRET_KEY", why: "verifies the bot check server side" },
  { key: "NEXT_PUBLIC_TURNSTILE_SITE_KEY", why: "renders the bot check" },
];

/** Not needed to run a scan, but the funnel leaks without them. */
const RECOMMENDED: Requirement[] = [
  { key: "RESEND_API_KEY", why: "sign-up notifications and the contact form" },
  { key: "ADMIN_USER", why: "/admin/scans stays shut without it" },
  { key: "ADMIN_PASSWORD", why: "/admin/scans stays shut without it" },
];

function missing(list: Requirement[]): Requirement[] {
  return list.filter((r) => !process.env[r.key]);
}

export function scanReadiness(): {
  ready: boolean;
  missingRequired: Requirement[];
  missingRecommended: Requirement[];
} {
  const required = [...REQUIRED, ...(process.env.NODE_ENV === "production" ? PRODUCTION_ONLY : [])];
  const missingRequired = missing(required);
  return {
    ready: missingRequired.length === 0,
    missingRequired,
    missingRecommended: missing(RECOMMENDED),
  };
}

export function scanReady(): boolean {
  return scanReadiness().ready;
}
