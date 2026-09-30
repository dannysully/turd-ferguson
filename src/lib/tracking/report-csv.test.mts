import assert from "node:assert/strict";
import { test } from "node:test";

import { answersCsv, csvField, isReportKind, keywordsCsv, reportFilename } from "./report-csv.ts";

// R90 T8 v1 (30 Sep 2026): the two CSVs. Tallyroo is the fixture's made-up client.

const R = { from: "2026-09-02", to: "2026-09-29" };

test("a field is quoted when it must be, and a formula lead is defused", () => {
  assert.equal(csvField("plain"), "plain");
  assert.equal(csvField('a "b", c'), '"a ""b"", c"');
  assert.equal(csvField("line\nbreak"), '"line\nbreak"');
  assert.equal(csvField("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvField(null), "");
  assert.equal(csvField(7), "7");
});

test("answers: one row per prompt, engine and day in range, sorted, with the cluster and angle", () => {
  const csv = answersCsv(
    {
      clusters: [{ id: "c1", name: "invoicing app", keyword_id: null, tier: "alwaystracked", started_on: "2026-09-01", stopped_on: null }],
      questions: [{ id: "q1", text: "Which invoicing app is best, for a studio?", added_on: "2026-09-01", stopped_on: null, cluster_id: "c1", angle: "category" }],
      answers: [
        { run_date: "2026-09-03", question_id: "q1", engine: "gemini", answered: true, named: false, brands: ["Ledgerline"], citations: [] },
        { run_date: "2026-09-03", question_id: "q1", engine: "chatgpt", answered: true, named: true, brands: [], citations: [{ source_domain: "tallyroo.com", url: "https://tallyroo.com/a" }] },
        { run_date: "2026-09-01", question_id: "q1", engine: "chatgpt", answered: true, named: true, brands: [], citations: [] },
        { run_date: "2026-09-04", question_id: "q1", engine: "claude", answered: false, named: false, brands: [], citations: [] },
      ],
    },
    R,
  );
  const lines = csv.trimEnd().split("\r\n");
  assert.equal(lines[0], "date,cluster,angle,prompt,engine,answered,named you,brands named,pages cited");
  assert.equal(lines.length, 4, "the 1 Sep reading is outside the range");
  assert.equal(lines[1], '2026-09-03,invoicing app,category,"Which invoicing app is best, for a studio?",chatgpt,yes,yes,,https://tallyroo.com/a');
  assert.equal(lines[2], '2026-09-03,invoicing app,category,"Which invoicing app is best, for a studio?",gemini,yes,no,Ledgerline,');
  assert.equal(lines[3], '2026-09-04,invoicing app,category,"Which invoicing app is best, for a studio?",claude,no,,,', "no answer: named is blank, not no");
});

test("keywords: one row per keyword and day, a blank position outside the top 20", () => {
  const csv = keywordsCsv(
    {
      keywords: [{ id: "k1", keyword: "invoicing software", added_on: "2026-09-01", stopped_on: null, search_volume: null, intent: null }],
      serp: [
        { run_date: "2026-09-05", keyword_id: "k1", position: null },
        { run_date: "2026-09-04", keyword_id: "k1", position: 7 },
      ],
    },
    R,
  );
  assert.deepEqual(csv.trimEnd().split("\r\n"), ["date,keyword,google position (blank: not in top 20)", "2026-09-04,invoicing software,7", "2026-09-05,invoicing software,"]);
});

test("the kind is one of two words, and the filename carries slug, kind and range", () => {
  assert.equal(isReportKind("answers"), true);
  assert.equal(isReportKind("pdf"), false);
  assert.equal(isReportKind(null), false);
  assert.equal(reportFilename("tallyroo", "answers", R), "tallyroo-answers-2026-09-02-to-2026-09-29.csv");
  assert.equal(reportFilename('ev"il/..', "keywords", R), "evil-keywords-2026-09-02-to-2026-09-29.csv");
});
