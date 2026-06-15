const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const constText = fs.readFileSync(path.join(root, "lib/constants.ttslua"), "utf8");
const guidsText = fs.readFileSync(path.join(root, "lib/guids.ttslua"), "utf8");

const block = constText.match(/C\.LockedObjects = \{([\s\S]*?)\n\}/)[1];
const refs = [...block.matchAll(/G\.GUIDS(?:\.[A-Z0-9_]+)+/g)].map((m) => m[0]);

function getGuid(ref) {
  const parts = ref.replace("G.GUIDS.", "").split(".");
  if (parts[0] === "TABLES") {
    const re = new RegExp(`\\b${parts[1]}\\s*=\\s*"([a-f0-9]+)"`);
    const m = guidsText.match(re);
    return m ? m[1] : null;
  }
  const key = parts[parts.length - 1];
  const re = new RegExp(`\\b${key}\\s*=\\s*"([a-f0-9]+)"`);
  const m = guidsText.match(re);
  return m ? m[1] : null;
}

const missing = [];
const resolved = [];
for (const ref of refs) {
  const g = getGuid(ref);
  if (!g) missing.push(ref);
  else resolved.push({ ref, guid: g });
}

console.log(`LockedObjects entries: ${refs.length}`);
console.log(`Resolved in guids.ttslua: ${resolved.length}`);
console.log(`Missing / nil at runtime: ${missing.length}`);
if (missing.length) {
  console.log("\nMissing keys:");
  for (const m of missing) console.log(`  ${m}`);
}
