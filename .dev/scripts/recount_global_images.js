"use strict";
const fs = require("fs");
const s = fs.readFileSync("lib/ui_global_xml_docs.ttslua", "utf8");
const m = s.match(/M\.full\s*=\s*\[=+\[([\s\S]*?)\]=+\]/);
if (!m) throw new Error("no M.full");
const xml = m[1];
console.log("Images", (xml.match(/<Image\b/g) || []).length);
console.log("shared sidebars", xml.includes("playerHud_mapSidebarsShared"));
console.log(
  "seat-suffixed overlay toggle",
  (xml.match(/playerHud_mapOverlayToggle_districtsAll_/g) || []).length
);
console.log(
  "shared overlay toggle base",
  (xml.match(/id="playerHud_mapOverlayToggle_districtsAll"/g) || []).length
);
