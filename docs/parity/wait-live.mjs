// Poll /api/version every 30s, up to 10 minutes, until it serves the given commit.
//   node docs/parity/wait-live.mjs <sha>
const sha = process.argv[2];
for (let i = 0; i < 21; i++) {
  try {
    const v = await (await fetch("https://alwayscited.com/api/version")).json();
    if (String(v.commit).startsWith(sha)) {
      console.log("LIVE", v.commit);
      process.exit(0);
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 30000));
}
console.log("TIMEOUT");
process.exit(1);
