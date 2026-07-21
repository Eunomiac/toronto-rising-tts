"use strict";
const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "..", "..", "lib", "constants.ttslua");
let s = fs.readFileSync(p, "utf8");
const startNeedle = "-- Catalog of skybox assets. Site `skybox` fields reference these by key; resolve via `C.Skyboxes[key].url`.";
const endNeedle = "-- #region Sites";
const start = s.indexOf(startNeedle);
const end = s.indexOf(endNeedle);
if (start < 0 || end < 0 || end <= start) {
  console.error("markers", start, end);
  process.exit(1);
}
const nl = s.includes("\r\n") ? "\r\n" : "\n";
const replacement = [
  "-- Catalog of skybox assets (AUTO-GENERATED module). Regenerate: npm run skyboxes:import",
  "-- Site `skybox` fields reference these by key; resolve via `C.Skyboxes[key].url`.",
  'local SkyboxesCatalog = require("lib.skyboxes_catalog")',
  "C.Skyboxes = SkyboxesCatalog.Skyboxes",
  "C.GenericSkyboxes = SkyboxesCatalog.GenericSkyboxes",
  "",
  "",
].join(nl);
s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(p, s);
console.log("constants spliced ok");
