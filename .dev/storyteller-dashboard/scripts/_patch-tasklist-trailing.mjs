import fs from "fs";

const p = ".dev/storyteller-dashboard/agent/Running Tasklist.md";
let t = fs.readFileSync(p, "utf8");
if (t.includes("PCs JSON Apply accepts trailing commas")) {
  console.log("already");
  process.exit(0);
}
const needle =
  "✔️ SD-PCs **JSON** debug button. Opens a scrollable modal with pretty-printed live seat snapshot; patch textarea + **Apply** deep-merges into TTS (`mergeSeat`).";
const insert =
  needle +
  "\r\n✔️ PCs JSON Apply accepts trailing commas (same sanitize as TTS scene import) instead of rejecting the paste.";
if (!t.includes(needle)) {
  console.error("missing");
  process.exit(1);
}
fs.writeFileSync(p, t.replace(needle, insert));
console.log("ok");
