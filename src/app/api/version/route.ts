import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Which commit is actually serving.
 *
 * Every push to this branch deploys, and until now nothing the site served
 * said which build answered. Runs have polled a page for a string they had
 * just changed and waited for it to flip, which only works when the change is
 * visible in public HTML - a fix to the scan pipeline, an API route or any
 * server module changes nothing a fetch can see, so "deployed" was an
 * assumption dressed as a check. One fetch here settles it.
 *
 * Nothing secret is published: the repository is public, so the commit and
 * the branch are already readable by anyone. Vercel sets these at build time.
 */
export async function GET() {
  const headers = new Headers();
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", "noindex, nofollow");

  return NextResponse.json(
    {
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      env: process.env.VERCEL_ENV ?? "local",
      region: process.env.VERCEL_REGION ?? null,
    },
    { headers },
  );
}
