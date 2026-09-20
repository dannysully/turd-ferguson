/**
 * The two readers more than one sweep in this tree needs, in one place.
 *
 * Not a test - `npm run check` globs `src/**` + `/*.test.mts`, so this is a
 * helper the way `src/app/dynamic-render.mts` is. That distinction is the
 * whole reason the file exists: `mail-from.test.mts` first imported
 * `sendCalls` out of `email-header.test.mts` directly, which works, and
 * silently made node run that entire suite twice - once as its own file and
 * once through the import. A shared reader belongs beside the tests rather
 * than inside one of them.
 */

/**
 * Source with its prose removed.
 *
 * This cut has been paid for seven times in this tree and twice inside the
 * test written to stop it. `0a3aa9e` is the sharpest instance: the assertion
 * that `ToConfirm` still renders a `<mark>` came back MISSED because that
 * component's own doc comment contains `<mark>` while explaining the defect,
 * so prose describing the code satisfied the check that the code was there.
 * The seventh was `readiness.test.mts` on 20 Sep, reporting a sender as still
 * reading `process.env.SCAN_FROM_EMAIL` because its doc comment quoted the
 * line it used to have.
 *
 * Six private copies of this existed before this file. They are not
 * consolidated here in one go - a stripper that differs in one case blinds
 * the sweep that depended on that case, and six at once is not a change to
 * make in the same push as the finding that prompted it. New callers use
 * this one.
 */
export function code(src: string): string {
  const out: string[] = [];
  let open = false;
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (open) {
      if (t.includes("*/")) open = false;
      continue;
    }
    if (t.startsWith("{/*") || t.startsWith("/*")) {
      if (!t.includes("*/")) open = true;
      continue;
    }
    if (t.startsWith("*") || t.startsWith("//")) continue;
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Every `emails.send({ ... })` in a file, sliced out by its own braces.
 *
 * Per call rather than per file, which is the lesson `contact.test.mts`
 * records about its own error returns: a rule satisfied by "headerSafe
 * appears somewhere in this module" is satisfied by the correct send while
 * the one beside it drops it. `verify-email.ts` has two sends and is exactly
 * that file.
 *
 * Read by two sweeps that ask different questions of the same set -
 * `email-header.test.mts` reads each send's subject, `mail-from.test.mts`
 * reads its From - and shared rather than copied so the two cannot come to
 * disagree about what a send is. Both carry a floor, so a narrowing here
 * fails in both rather than reading as a clean tree in either.
 */
export function sendCalls(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/emails\.send\(/g)) {
    const open = source.indexOf("{", m.index);
    if (open === -1) continue;
    let depth = 0;
    for (let i = open; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}" && --depth === 0) {
        out.push(source.slice(open, i + 1));
        break;
      }
    }
  }
  return out;
}
