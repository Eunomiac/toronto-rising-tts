"use strict";
const { fetchSnapshot, defaultSnapshotPath, writeAtomic } = require("./lib/sheet_exports.js");
fetchSnapshot().then(snapshot => {
  const out = process.argv[2] || defaultSnapshotPath;
  writeAtomic(out, JSON.stringify(snapshot));
  for (const warning of snapshot.warnings) console.warn(`[exports] ${warning}`);
  console.log(`[exports] Validated ${Object.keys(snapshot.tables).length} named ranges → ${out}`);
}).catch(error => { console.error(error); process.exitCode = 1; });
