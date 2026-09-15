import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS, so it must never be imported into a
 * client component. The "server-only" import above turns that mistake into a
 * build error rather than a leaked key.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. The scan cannot run without them.",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** True when the database is configured at all, for health checks and the admin page. */
export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
