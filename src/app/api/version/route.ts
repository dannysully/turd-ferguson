import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Which commit is actually serving.
 *
 * Every push to this branch deploys, and until this existed nothing the site
 * served said which build answered. Runs have polled a page for a string they
 * had just changed and waited for it to flip, which only works when the change
 * is visible in public HTML - a fix to the scan pipeline, an API route or any
 * server module changes nothing a fetch can see, so "deployed" was an
 * assumption dressed as a check. One fetch here settles it.
 *
 * Read `commit`, and do not read `env` as if it answered the same question.
 *
 * Measured from this repository on 19 September 2026: against the local dev
 * server this route answered env "production" with commit and ref both the
 * empty string, because VERCEL_ENV sits in the local environment file and the
 * git variables do not. Every run of this session has been unable to reach the
 * live site and has fallen back to localhost, so that is a reading of "yes,
 * production" handed to exactly the caller most likely to be fooled by it.
 *
 * An empty variable is not a value, so the three that can be empty are
 * normalised to null. `commit: null` is now the unambiguous tell that this is
 * not a Vercel build, where "" read as a build nobody had labelled.
 *
 * Nothing secret is published: the repository is public, so the commit and
 * the branch are already readable by anyone. Vercel sets these at build time.
 */
function value(v: string | undefined): string | null {
  const trimmed = v?.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  const headers = new Headers();
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", "noindex, nofollow");

  return NextResponse.json(
    {
      commit: value(process.env.VERCEL_GIT_COMMIT_SHA),
      ref: value(process.env.VERCEL_GIT_COMMIT_REF),
      env: value(process.env.VERCEL_ENV) ?? "local",
      region: value(process.env.VERCEL_REGION),
    },
    { headers },
  );
}
