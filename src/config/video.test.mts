import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { LAUNCH_VIDEO, LAUNCH_VIDEO_SUMMARY } from "./video.ts";
import { PRERENDER_DIR, sweptPages } from "../app/dynamic-render.mts";

/** Top-level JSON-LD objects and their @graph members. Inlined rather than
 *  imported from structured-data.test.mts, which would register that file's
 *  tests a second time under this one. */
function ldNodes(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const parsed = JSON.parse(m[1]!) as Record<string, unknown>;
    out.push(parsed, ...((parsed["@graph"] as Record<string, unknown>[] | undefined) ?? []));
  }
  return out;
}

/**
 * The launch video against everything that describes it (Q23, 26 Sep 2026).
 *
 * A rendered video is the purest form of the defect this suite exists for: a
 * second copy of a fact that cannot update itself. It shows four prices. If
 * pricing.ts moves, the site changes and the video does not, and the page
 * then plays a price we no longer charge under a heading we wrote. So the
 * prices the video paints are recorded in video.ts, and this holds them equal
 * to the prices the site quotes.
 *
 * pricing.ts is read as source, not imported, for the reason
 * price-surfaces.test.mts gives: it imports through the `@/` alias, which
 * node --test cannot resolve, and parsing it is a second path to the number.
 */

const PUBLIC = "public";

function priceLabels(): string[] {
  const source = readFileSync("src/config/pricing.ts", "utf8");
  return [...source.matchAll(/priceLabel:\s*"([^"]+)"/g)].map((m) => m[1]!);
}

test("the video still shows the prices the site charges", () => {
  const site = priceLabels();
  assert.equal(site.length, 4, `read ${site.length} price labels out of pricing.ts - the parse, not the site, changed`);
  assert.deepEqual(
    [...LAUNCH_VIDEO.shownPrices],
    site,
    "pricing.ts no longer matches the prices painted into the launch video. The video is stale: re-render it, or take " +
      "it off /how-it-works. Do not edit shownPrices to match - it records what the file shows, not what the site says.",
  );
});

test("the files the page points at exist, and are the video the record describes", () => {
  const mp4 = join(PUBLIC, LAUNCH_VIDEO.src);
  const poster = join(PUBLIC, LAUNCH_VIDEO.poster);
  assert.ok(existsSync(mp4), `${mp4} is gone`);
  assert.ok(existsSync(poster), `${poster} is gone`);

  // Duration read from the file's own mvhd box, so a re-render that changes
  // the length changes this, and the JSON-LD duration cannot quietly lie.
  const buf = readFileSync(mp4);
  const at = buf.indexOf("mvhd");
  assert.ok(at > 0, "no mvhd box - not an MP4 this can read");
  const v1 = buf[at + 4] === 1;
  const scale = v1 ? buf.readUInt32BE(at + 24) : buf.readUInt32BE(at + 16);
  const units = v1 ? Number(buf.readBigUInt64BE(at + 28)) : buf.readUInt32BE(at + 20);
  const seconds = Math.round(units / scale);
  assert.equal(seconds, LAUNCH_VIDEO.durationSeconds, `the file runs ${seconds}s and the record says ${LAUNCH_VIDEO.durationSeconds}s`);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  assert.equal(LAUNCH_VIDEO.duration, `PT${m ? m + "M" : ""}${s}S`, "the ISO duration disagrees with durationSeconds");

  // Faststart: the moov box ahead of mdat, so playback starts before the
  // whole file has arrived. preload="none" does not help if it is at the end.
  assert.ok(buf.indexOf("moov") < buf.indexOf("mdat"), "moov sits after mdat - the file is not faststart");
  assert.ok(statSync(mp4).size < 5_000_000, "the video is over 5MB - it was 3.4MB when it went up");
});

test("the text summary says the video's prices, one tier a line", () => {
  for (const price of LAUNCH_VIDEO.shownPrices) {
    assert.ok(
      LAUNCH_VIDEO_SUMMARY.some((line) => line.includes(price)),
      `the summary under the video never says ${price}, which the video shows`,
    );
  }
});

test("/how-it-works carries the video, its summary and one VideoObject that agrees with the record", (t) => {
  if (!existsSync(PRERENDER_DIR)) {
    t.skip("no build to read - run `npm run build` then `npm run capture`");
    return;
  }
  const page = sweptPages().find((p) => p.page === "how-it-works.html");
  assert.ok(page, "how-it-works.html is not in the swept set - the page or the sweep moved");
  const html = page.html;

  assert.ok(html.includes(`src="${LAUNCH_VIDEO.src}"`), "the page no longer embeds the video file");
  assert.ok(/<video[^>]*\bcontrols\b/.test(html), "the video lost its controls");
  assert.ok(!/<video[^>]*\bautoplay\b/i.test(html), "the video autoplays - the queue says it must not");
  assert.ok(/<video[^>]*preload="none"/.test(html), "the video preloads - it is 3.4MB and most visitors will not play it");
  assert.ok(html.includes('id="video"'), "the #video anchor the homepage links to is gone");

  const videos = ldNodes(html).filter((n) => n["@type"] === "VideoObject");
  assert.equal(videos.length, 1, `${videos.length} VideoObject nodes on /how-it-works, expected one`);
  const v = videos[0]!;
  assert.equal(v.contentUrl, "https://alwayscited.com" + LAUNCH_VIDEO.src);
  assert.equal(v.thumbnailUrl, "https://alwayscited.com" + LAUNCH_VIDEO.poster);
  assert.equal(v.duration, LAUNCH_VIDEO.duration);
  assert.equal(v.uploadDate, LAUNCH_VIDEO.uploadDate);
  assert.equal(v.name, LAUNCH_VIDEO.name);
});
