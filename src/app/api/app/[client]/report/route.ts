import { NextResponse } from "next/server";

import { rangeFrom } from "@/lib/tracking/overview-data";
import { answersCsv, isReportKind, keywordsCsv, reportFilename } from "@/lib/tracking/report-csv";
import { trackingRepo } from "@/lib/tracking/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Download report" - BRIEF-2 T8 v1 (R90, Danny, 29 Sep 2026, danny.md line
 * 84): `GET ?kind=answers|keywords&from=&to=` returns the range as a CSV
 * (report-csv.ts). It only reads. Any member of the client may download,
 * viewers included, as they can already read the same rows on the page.
 * Session and membership are checked through the page's repo, so the fixture
 * serves the fixture.
 */
export async function GET(req: Request, ctx: { params: Promise<{ client: string }> }) {
  const { client: slug } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind");
  if (!isReportKind(kind)) return NextResponse.json({ error: "kind is answers or keywords." }, { status: 400 });

  const repo = trackingRepo();
  const email = await repo.sessionEmail();
  if (!email) return NextResponse.redirect(new URL("/app/login", req.url), 303);
  const client = (await repo.clientsFor(email)).find((c) => c.slug === slug);
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { range } = rangeFrom(Object.fromEntries(sp), repo.today());
  const data = await repo.loadOverview(client.id, range, "none");
  const body = kind === "answers" ? answersCsv(data, range) : keywordsCsv(data, range);
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${reportFilename(slug, kind, range)}"`,
      "cache-control": "private, no-store",
    },
  });
}
