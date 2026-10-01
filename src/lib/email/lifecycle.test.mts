import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { COMPANY_LINE, CONTACT_EMAIL } from "../../config/contact.ts";
import { TIER_PLAIN } from "../tier-text.ts";
import { flagFor, flagOn, LIFECYCLE_EMAILS, previews, welcome } from "./lifecycle.ts";

/** R159 (1 Oct 2026): the lifecycle templates' shared rules, on the preview fixtures. Nothing is sent. */

const all = previews();

test("every lifecycle email has a template and a preview, and its flag is email_<name>_enabled", () => {
  assert.deepEqual(Object.keys(all).sort(), [...LIFECYCLE_EMAILS].sort());
  assert.equal(LIFECYCLE_EMAILS.length, 6);
  for (const n of LIFECYCLE_EMAILS) assert.match(flagFor(n), /^email_[a-z_]+_enabled$/);
});

test("each has one button, the help block and the footer company line, in HTML and plain text", () => {
  for (const [name, m] of Object.entries(all)) {
    assert.equal(m.html.match(/<td bgcolor=/g)?.length, 1, `${name}: one button`);
    for (const part of [m.html, m.text]) {
      assert.ok(part.includes(COMPANY_LINE), `${name}: company line`);
      assert.ok(part.includes(CONTACT_EMAIL), `${name}: email us`);
      assert.match(part, /Book a call/, `${name}: book a call`);
      assert.match(part, /\/contact\?tier=always/, `${name}: the call is prefilled with the tier`);
    }
    assert.ok(m.subject.length > 0 && m.subject.length < 90, `${name}: subject`);
  }
});

test("the brand is lowercase and tiers are TIER_PLAIN, never a capitalised form", () => {
  for (const [name, m] of Object.entries(all)) {
    for (const part of [m.subject, m.html, m.text]) {
      assert.doesNotMatch(part, /AlwaysCited|Alwayscited|always cited|Always(tracked|mentioned|everywhere)/, name);
      assert.doesNotMatch(part, /tier-name__accent|--brand-purple/, `${name}: no tier colouring in mail`);
    }
  }
  assert.ok(all.welcome.text.includes(TIER_PLAIN.mentioned));
  assert.ok(all.plan_ended.subject.includes(TIER_PLAIN.cited));
});

test("what the buyer typed is escaped in the HTML", () => {
  const m = welcome({ tier: "tracked", clusters: 1, domain: `a<b>&"c.com`, link: "https://alwayscited.com/app/auth?token=x&y=1" });
  assert.ok(!m.html.includes("a<b>"), "domain escaped");
  assert.ok(m.html.includes("a&lt;b&gt;&amp;&quot;c.com"));
  assert.ok(m.html.includes('href="https://alwayscited.com/app/auth?token=x&amp;y=1"'));
  assert.ok(m.text.includes(`a<b>&"c.com`), "plain text is as typed");
  assert.match(m.text, /with 1 cluster\./);
});

test("the welcome carries the sign-in link on its one button and the 3-step strip", () => {
  const m = all.welcome;
  assert.equal(m.subject, "You're in - set up your clusters");
  assert.match(m.html, />Set up your clusters<\/a>/);
  assert.match(m.html, /app\/auth\?token=preview-only/);
  assert.equal(m.html.match(/<li /g)?.length, 3);
  assert.match(m.text, /\n1\. .*\n2\. .*\n3\. /);
});

test("the templates do not send: no mail client, network or flag write in the module", async () => {
  const src = await import("node:fs").then((fs) => fs.readFileSync(new URL("./lifecycle.ts", import.meta.url), "utf8"));
  assert.doesNotMatch(src, /resend|fetch\(|\.from\(|process\.env/i);
});

test("a flag is on only for jsonb true; a missing row or any other value is off", () => {
  assert.equal(flagOn(true), true);
  for (const v of [undefined, null, false, "true", 1, {}, []]) assert.equal(flagOn(v), false, JSON.stringify(v));
});

/** Part 3 (1 Oct 2026): the flags ship off, and each send site asks its own flag first. */
test("every flag ships off, and each send site asks its flag before sending", async () => {
  const fs = await import("node:fs");
  const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");
  const dir = new URL("../../../supabase/migrations/", import.meta.url);
  const sql = fs.readdirSync(dir).map((f) => fs.readFileSync(new URL(f, dir), "utf8")).join("\n");
  for (const n of LIFECYCLE_EMAILS) {
    assert.match(sql, new RegExp(`\\('${flagFor(n)}', 'false'::jsonb\\)`), `${flagFor(n)} not inserted as false`);
    assert.doesNotMatch(sql, new RegExp(`'${flagFor(n)}', 'true'`), `${flagFor(n)} switched on in a migration`);
  }
  const signup = read("../checkout/signup.ts");
  assert.equal(signup.match(/sendLifecycle\(/g)?.length, 2, "welcome and plan_ended are the two send sites");
  assert.match(signup, /lifecycleOn\(db, "welcome"\)[\s\S]{0,300}sendLifecycle\(\{ memberEmail: o\.email, mail: welcome\(/);
  assert.match(signup, /lifecycleOn\(db, "plan_ended"\)[\s\S]{0,800}sendLifecycle\(\{ memberEmail: m\.email as string, mail \}\)/);
  assert.match(signup, /: await sendLoginLink\(\{ memberEmail: o\.email, link \}\)/, "the login link stays the default while welcome is off");
  // The invite: branded only outside agency mode and with its flag on, else the plain inviteMail as before.
  const member = read("../../app/api/app/[client]/member/route.ts");
  assert.match(member, /!agency && \(await lifecycleOn\(db, "invite"\)\)\s*\? inviteEmail\([\s\S]{0,300}: inviteMail\(\{ inviter: email, domain: client\.domain, role: f\.role!, agency \}\)/);
});

test("first_reading: flag first, the client's only finished run, no agency, the Overview's own figures", () => {
  const runner = fs.readFileSync(new URL("../tracking/runner.ts", import.meta.url), "utf8");
  const body = runner.slice(runner.indexOf("async function mailFirstReading"));
  assert.ok(body.length > 200, "mailFirstReading is gone from runner.ts");
  const at = (s: string) => body.indexOf(s);
  assert.ok(at('lifecycleOn(db, "first_reading")') >= 0 && at('lifecycleOn(db, "first_reading")') < at("sendLifecycle("), "the flag is asked before the send");
  assert.ok(at("if (count !== 1) return;") >= 0 && at("if (count !== 1) return;") < at("sendLifecycle("), "only on the client's first finished run");
  assert.ok(at('=== "agency") return;') >= 0 && at('=== "agency") return;') < at("sendLifecycle("), "never in agency mode");
  assert.match(runner, /named: namedRate\(answerRows, range\),\s*page1: keywordsOnPage1\(serpRows, range, keywords\.length\)/);
});

test("the invite names who added you and the role", () => {
  const t = all.invite.text;
  assert.match(t, /sam@tallyroo\.com added you to the tallyroo\.com dashboard as a viewer/);
});
