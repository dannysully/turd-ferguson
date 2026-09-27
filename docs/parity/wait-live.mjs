// node docs/parity/wait-live.mjs <sha> - polls /api/version every 30s, up to 10 minutes.
const sha = process.argv[2];
for (let i = 1; i <= 20; i++) {
  const v = await fetch("https://alwayscited.com/api/version").then((r) => r.text()).catch((e) => String(e));
  if (v.includes(sha)) {
    console.log(`LIVE after ${i} polls: ${v}`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 30000));
}
console.log("not live after 10 minutes");
process.exit(1);
