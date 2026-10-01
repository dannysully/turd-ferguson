import assert from "node:assert/strict";
import { test } from "node:test";

import { COMPANY_LINE, CONTACT_EMAIL } from "../../config/contact.ts";
import { TIER_PLAIN } from "../tier-text.ts";
import { flagFor, LIFECYCLE_EMAILS, previews, welcome } from "./lifecycle.ts";

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
