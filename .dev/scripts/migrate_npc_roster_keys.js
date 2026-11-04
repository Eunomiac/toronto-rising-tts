"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { writeAtomic } = require("./lib/sheet_exports.js");

// One-time data migration. The build and runtime only accept the current API keys.
const keys = {
  chokesOnMoonlightGarou: "chokesOnMoonlight_Garou",
  fangsAtTheCradleGarou: "fangsAtTheCradle_Garou",
  moltsInShadowGarou: "moltsInShadow_Garou",
  rotInTheRiverGarou: "rotInTheRiver_Garou",
  stalksTheTangleGarou: "stalksTheTangle_Garou",
  daevaAnitaMorris: "anitaMorrisDaeva",
  daevaGabrielCollard: "gabrielCollardDaeva",
  daevaNasirKhan: "nasirKhanDaeva",
};
const file = path.resolve(__dirname, "../storyteller-dashboard/data/npc-roster.json");
const before = fs.readFileSync(file, "utf8");
const roster = JSON.parse(before);
const apply = process.argv.includes("--apply");
const edits = [];
for (const [oldKey, newKey] of Object.entries(keys)) {
  if (Object.hasOwn(roster.members, oldKey)) {
    roster.members[newKey] = [...new Set([...(roster.members[newKey] ?? []), ...roster.members[oldKey]])];
    delete roster.members[oldKey];
    edits.push(`member ${oldKey} → ${newKey}`);
  }
  for (const group of [roster.bosses, roster.layout?.leaders]) {
    for (const [id, leader] of Object.entries(group ?? {})) {
      if (leader !== oldKey) continue;
      group[id] = newKey;
      edits.push(`leader of ${id}: ${oldKey} → ${newKey}`);
    }
  }
}
if (edits.length) console.log(edits.join("\n"));
else console.log("The roster already uses the current keys.");
if (apply && edits.length) {
  const backup = `${file}.before-named-cutover.bak`;
  fs.copyFileSync(file, backup, fs.constants.COPYFILE_EXCL);
  writeAtomic(file, JSON.stringify(roster, null, 2) + "\n");
  console.log(`Updated the local roster. Backup: ${backup}`);
}
