/**
 * Live-member census (R141, Danny, 30 Sep 2026, danny.md 134-136; BRIEF-4 P0).
 *
 * Removing a member never deletes the row: it sets `removed_at`. So every
 * read of `dashboard_members` - the page 404, API role checks, `clientsFor`,
 * the login link, the admin list - and every update must carry
 * `.is("removed_at", null)`, or a removed member keeps their access. A
 * `.delete()` on the table is refused outright. Upserts are writes that make
 * or revive a member and need no filter.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

type Call = { file: string; chain: string };

/** Each `.from("dashboard_members")` chain, up to the end of its statement. */
export function memberCalls(file: string, text: string): Call[] {
  return [...text.matchAll(/\.from\("dashboard_members"\)/g)].map((m) => {
    const rest = text.slice(m.index);
    const end = rest.search(/;|\n\s*\n|,\n\s*db\.from\(/);
    return { file, chain: end < 0 ? rest : rest.slice(0, end) };
  });
}

/** Why a call breaks the rule, or null when it keeps it. */
export function breaks(c: Call): string | null {
  if (/\.delete\(/.test(c.chain)) return "deletes a member row - mark removed_at instead";
  if (/\.upsert\(/.test(c.chain)) return null;
  if (/\.(select|update)\(/.test(c.chain) && !/\.is\("removed_at", null\)/.test(c.chain)) return "reads or updates without .is(\"removed_at\", null)";
  return null;
}

const CALLS = walk(join(ROOT, "src"))
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.m?ts$/.test(f))
  .flatMap((f) => memberCalls(relative(ROOT, f), readFileSync(f, "utf8")));

/**
 * Floor, 1 Oct 2026: 7 calls - clientsFor, the login route's read, the auth
 * route's last_login_at, the admin list, admin remove and add, the checkout
 * signup's owner upsert. 5 of them reads or updates.
 */
const CALL_FLOOR = 7;
const FILTERED_FLOOR = 5;

test("census floor: the walk still finds the dashboard_members calls", () => {
  assert.ok(CALLS.length >= CALL_FLOOR, `${CALLS.length} calls, floor ${CALL_FLOOR}`);
  const filtered = CALLS.filter((c) => /\.(select|update)\(/.test(c.chain));
  assert.ok(filtered.length >= FILTERED_FLOOR, `${filtered.length} reads/updates, floor ${FILTERED_FLOOR}`);
});

test("every read and update of dashboard_members skips removed members, and none deletes", () => {
  const bad = CALLS.map((c) => [c, breaks(c)] as const)
    .filter(([, why]) => why)
    .map(([c, why]) => `${c.file}: ${why}`);
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("the sign-in sets last_login_at", () => {
  const auth = CALLS.filter((c) => c.file.endsWith(join("api", "app", "auth", "route.ts")));
  assert.ok(auth.some((c) => /last_login_at/.test(c.chain)), "the auth route no longer records the sign-in");
});

test("census probe: an unfiltered read, an unfiltered update and a delete each fire", () => {
  const probe = (s: string) => breaks(memberCalls("probe.ts", s)[0]!);
  assert.ok(probe(`db.from("dashboard_members").select("account_id, role").eq("email", email);`));
  assert.ok(probe(`db.from("dashboard_members").update({ role }).eq("email", email);`));
  assert.ok(probe(`db.from("dashboard_members").delete().eq("email", email);`));
  assert.equal(probe(`db.from("dashboard_members").select("email").eq("email", email).is("removed_at", null);`), null);
  assert.equal(probe(`db.from("dashboard_members").upsert({ email }, { onConflict: "account_id,email" });`), null);
});
