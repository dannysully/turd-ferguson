/**
 * The stored answer, read as the markdown the engines wrote it in.
 *
 * ChatGPT, Gemini and Perplexity answer in markdown - tables, `**bold**`,
 * bulleted and numbered lists, `[3]` citation markers - and the answers
 * sidebar used to print that source as it came: "Software | Suited to" over
 * "--- | ---", asterisks round every product name. On the first scan read
 * after the sidebar shipped (rotaready.com, 24 September 2026) every ChatGPT
 * and Gemini answer on all five questions carried a table and every
 * Perplexity answer carried bold and 18-38 markers.
 *
 * This is presentation only. `response_text` is not changed, no word is added
 * or removed, and nothing here produces HTML: the output is plain data that
 * `ResultView` turns into React elements, so an answer containing `<script>`
 * renders as those characters.
 */

export type Inline = { text: string; bold?: boolean; cite?: boolean };

export type Block =
  | { kind: "p"; lines: Inline[][] }
  | { kind: "h"; text: Inline[] }
  | { kind: "ul" | "ol"; items: Inline[][] }
  | { kind: "table"; head: Inline[][]; rows: Inline[][][] };

const SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

/** `**bold**` and `[3]` markers, everything else as written. */
export function inline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+?)\*\*|\[(\d{1,3})\]/g;
  let at = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > at) out.push({ text: text.slice(at, i) });
    if (m[1] !== undefined) out.push({ text: m[1], bold: true });
    else out.push({ text: m[2], cite: true });
    at = i + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

function cells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

/** A table starts where a line with a pipe sits directly above a separator row. */
function isTableStart(lines: string[], i: number): boolean {
  return lines[i].includes("|") && i + 1 < lines.length && SEPARATOR.test(lines[i + 1]);
}

export function parseAnswer(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (isTableStart(lines, i)) {
      const head = cells(line).map(inline);
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(cells(lines[i]).map(inline));
        i++;
      }
      blocks.push({ kind: "table", head, rows });
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      blocks.push({ kind: "h", text: inline(h[1]) });
      i++;
      continue;
    }
    const list = BULLET.test(line) ? (["ul", BULLET] as const) : NUMBERED.test(line) ? (["ol", NUMBERED] as const) : null;
    if (list) {
      const [kind, re] = list;
      const items: Inline[][] = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(inline((re.exec(lines[i]) as RegExpExecArray)[1]));
        i++;
      }
      blocks.push({ kind, items });
      continue;
    }
    {
      const para: Inline[][] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !isTableStart(lines, i) &&
        !HEADING.test(lines[i]) &&
        !BULLET.test(lines[i]) &&
        !NUMBERED.test(lines[i])
      ) {
        para.push(inline(lines[i]));
        i++;
      }
      blocks.push({ kind: "p", lines: para });
    }
  }
  return blocks;
}

/** Every character of text the blocks will show, for tests: nothing may be lost. */
export function blockText(blocks: Block[]): string {
  const t = (xs: Inline[]) => xs.map((x) => x.text).join("");
  return blocks
    .map((b) =>
      b.kind === "p"
        ? b.lines.map(t).join(" ")
        : b.kind === "h"
          ? t(b.text)
          : b.kind === "table"
            ? [b.head, ...b.rows].map((r) => r.map(t).join(" ")).join(" ")
            : b.items.map(t).join(" "),
    )
    .join(" ");
}
