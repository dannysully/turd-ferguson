import assert from "node:assert/strict";
import { test } from "node:test";

import { INVITES_PER_OWNER_PER_DAY, MEMBERS_PER_ACCOUNT, type TeamRow, inviteMail, readEmail, readTeamForm, refuseActor, refuseChange, refuseInvite, teamReturn, teamToast } from "./team.ts";

/** R142 part 2 (1 Oct 2026; BRIEF-4 P2 Team): the rules the member route runs before any write. */

const row = (email: string, role: string, removed = false): TeamRow => ({ email, role, removed_at: removed ? "2026-09-30T10:00:00Z" : null });
const team = [row("owner@tallyroo.com", "owner"), row("ed@tallyroo.com", "editor"), row("vi@tallyroo.com", "viewer"), row("gone@tallyroo.com", "editor", true)];

test("an email is trimmed, lowercased, format-checked and at most 254 characters", () => {
  assert.equal(readEmail("  New@Tallyroo.COM "), "new@tallyroo.com");
  assert.equal(readEmail("not-an-email"), null);
  assert.equal(readEmail("a@b"), null);
  assert.equal(readEmail(`${"a".repeat(250)}@example.com`), null);
  assert.equal(readEmail(42), null);
});

test("the form: invite and role need Editor or Viewer, never owner; remove needs none", () => {
  const f = (o: Record<string, string>) => readTeamForm((k) => o[k] ?? null);
  assert.deepEqual(f({ op: "invite", email: "x@tallyroo.com", role: "viewer" }), { op: "invite", email: "x@tallyroo.com", role: "viewer" });
  assert.equal(f({ op: "invite", email: "x@tallyroo.com", role: "owner" }), null);
  assert.equal(f({ op: "role", email: "x@tallyroo.com" }), null);
  assert.deepEqual(f({ op: "remove", email: "x@tallyroo.com", role: "owner" }), { op: "remove", email: "x@tallyroo.com", role: null });
  assert.equal(f({ op: "delete", email: "x@tallyroo.com" }), null);
});

test("owner only", () => {
  assert.equal(refuseActor("owner"), null);
  assert.ok(refuseActor("editor"));
  assert.ok(refuseActor("viewer"));
});

test("invite refuses a live member and lets a removed one back on the same row", () => {
  assert.ok(refuseInvite({ rows: team, email: "ed@tallyroo.com", invitesToday: 0 }));
  assert.equal(refuseInvite({ rows: team, email: "gone@tallyroo.com", invitesToday: 0 }), null);
  assert.equal(refuseInvite({ rows: team, email: "new@tallyroo.com", invitesToday: 0 }), null);
});

test("invite caps: 10 live members an account, 20 invites an owner a day", () => {
  const full = Array.from({ length: MEMBERS_PER_ACCOUNT }, (_, i) => row(`m${i}@tallyroo.com`, i ? "editor" : "owner"));
  assert.ok(refuseInvite({ rows: full, email: "new@tallyroo.com", invitesToday: 0 }));
  // Removed rows do not count toward the ten.
  assert.equal(refuseInvite({ rows: [...full.slice(1), row("x@tallyroo.com", "editor", true)], email: "new@tallyroo.com", invitesToday: 0 }), null);
  assert.ok(refuseInvite({ rows: team, email: "new@tallyroo.com", invitesToday: INVITES_PER_OWNER_PER_DAY }));
  assert.equal(refuseInvite({ rows: team, email: "new@tallyroo.com", invitesToday: INVITES_PER_OWNER_PER_DAY - 1 }), null);
});

test("no one changes or removes themselves, nor the last owner", () => {
  const actor = "owner@tallyroo.com";
  assert.ok(refuseChange({ rows: team, actor, email: actor, op: "remove", role: null }));
  assert.ok(refuseChange({ rows: team, actor: "o2@tallyroo.com", email: actor, op: "remove", role: null }));
  assert.ok(refuseChange({ rows: team, actor: "o2@tallyroo.com", email: actor, op: "role", role: "editor" }));
  const two = [...team, row("o2@tallyroo.com", "owner")];
  assert.equal(refuseChange({ rows: two, actor: "o2@tallyroo.com", email: actor, op: "remove", role: null }), null);
  assert.equal(refuseChange({ rows: team, actor, email: "ed@tallyroo.com", op: "role", role: "viewer" }), null);
  assert.ok(refuseChange({ rows: team, actor, email: "ed@tallyroo.com", op: "role", role: "editor" }), "already an editor");
  assert.ok(refuseChange({ rows: team, actor, email: "gone@tallyroo.com", op: "remove", role: null }), "a removed member is not on the team");
});

test("the return URL and toast carry fixed words and a checked email only", () => {
  assert.equal(teamReturn("tallyroo", "invited", "new@tallyroo.com"), `/app/tallyroo/settings?${new URLSearchParams({ team: "invited", who: "new@tallyroo.com" })}#set-team`);
  assert.equal(teamReturn("tallyroo", "refused", "new@tallyroo.com"), "/app/tallyroo/settings?team=refused#set-team");
  // DS40 (2 Oct 2026): a stated range comes back ahead of the toast; any other kept key does not.
  assert.equal(teamReturn("tallyroo", "refused", null, { from: "2026-09-20", to: "2026-09-26", compare: "none", filter: "named", q: "x" }), "/app/tallyroo/settings?from=2026-09-20&to=2026-09-26&compare=none&team=refused#set-team");
  assert.equal(teamToast("invited", "new@tallyroo.com", "viewer"), "Invited new@tallyroo.com.");
  assert.equal(teamToast("invited", "stranger@tallyroo.com", null), null, "R146: not on the team, so nobody was invited");
  assert.equal(teamToast("removed", "gone@tallyroo.com", null), "Removed gone@tallyroo.com.");
  assert.equal(teamToast("removed", "still@tallyroo.com", "editor"), null, "R146: still on the team, so nobody was removed");
  assert.equal(teamToast("role", "vi@tallyroo.com", "viewer"), "vi@tallyroo.com is now a viewer.");
  assert.equal(teamToast("invited", "<script>@x", null), null);
  assert.equal(teamToast("role", "vi@tallyroo.com", null), null, "not a member any more: no claim about their role");
  assert.equal(teamToast("anything", "vi@tallyroo.com", null), null);
});

test("the invite mail: the brief's words, no login token, and no nomada tier in agency mode", () => {
  const m = inviteMail({ inviter: "owner@tallyroo.com", domain: "tallyroo.com", role: "editor", agency: false });
  assert.equal(m.subject, "You've been added to the tallyroo.com dashboard");
  assert.match(m.text, /^owner@tallyroo\.com added you to the alwayscited dashboard for tallyroo\.com as an editor\. Sign in with this email address at alwayscited\.com\/app\/login - we'll send you a link\./);
  assert.doesNotMatch(m.text, /token|https?:\/\//);
  const a = inviteMail({ inviter: "owner@tallyroo.com", domain: "tallyroo.com", role: "viewer", agency: true });
  assert.doesNotMatch(`${a.subject} ${a.text.replace("alwayscited.com/app/login", "")}`, /always(cited|tracked|mentioned|everywhere)|nomada/i);
});
