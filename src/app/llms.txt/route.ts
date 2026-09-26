import { SITE_URL } from "@/config/schema";

import { SECTIONS, descriptionOf, titleOf } from "./pages";

export const dynamic = "force-static";

/**
 * /llms.txt, in the plain-text convention: an h1, a one-line summary as a
 * blockquote, then h2 sections of linked pages. Every line is read from the
 * page's own metadata - see ./pages.ts.
 */
export function GET() {
  const home = SECTIONS[0].pages[0].meta;
  const lines = ["# alwayscited", "", `> ${descriptionOf(home)}`, ""];
  for (const section of SECTIONS) {
    lines.push(`## ${section.heading}`, "");
    for (const { path, meta } of section.pages) {
      lines.push(`- [${titleOf(meta)}](${SITE_URL}${path || "/"}): ${descriptionOf(meta)}`);
    }
    lines.push("");
  }
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
