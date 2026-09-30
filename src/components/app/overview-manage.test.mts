import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * T6 (30 Sep 2026; boards-3/Main.dc.html and Mobile.dc.html): the overview's
 * "Your clusters" carries the board's way to the Clusters page - "N of 10
 * clusters in use" and "Manage clusters" on desktop, "Manage" on the phone -
 * held back until T6 gave it somewhere to go. The count is the Clusters
 * page's (stopped clusters free their slot at once), and the limit is the
 * client's own cluster_limit, so the two pages cannot print different figures.
 */

const overview = readFileSync(new URL("./Overview.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../../app/app/[client]/page.tsx", import.meta.url), "utf8");
const clusters = readFileSync(new URL("./Clusters.tsx", import.meta.url), "utf8");

test("both cluster headers link to the Clusters page", () => {
  assert.match(overview, />\s*Manage clusters\s*</, "desktop cards lost 'Manage clusters'");
  assert.match(overview, />\s*Manage\s*</, "phone rows lost 'Manage'");
  assert.match(overview, /<ClusterCards [^>]*manage=\{manage\}/);
  assert.match(overview, /<ClusterRows [^>]*manage=\{manage\}/);
});

test("the in-use count is the Clusters page's, on the client's own limit", () => {
  const rule = "c.stoppedOn === null";
  assert.ok(clusters.includes(`cards.filter((c) => ${rule}).length`), "Clusters.tsx no longer counts in-use clusters this way");
  assert.ok(overview.includes(`cards.filter((c) => ${rule}).length} of \${clusterLimit} clusters in use`), "the overview counts clusters in use differently from the Clusters page");
  assert.ok(page.includes("clusterLimit={client.cluster_limit ?? CLUSTER_BASE}"), "the overview page does not pass the client's cluster_limit");
});
