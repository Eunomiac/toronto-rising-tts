"use strict";
const fs = require("fs");
const p = require("path").join(__dirname, "../../ui/shared/panel_map_sidebars.xml");
let s = fs.readFileSync(p, "utf8");
s = s.replace(
  /id="(playerHud_map(?:Overlay|District)Toggle_[^"]+_(?:hover|active))"/g,
  'id="$1" visibility="None"'
);
fs.writeFileSync(p, s);
console.log("visibility=None count", (s.match(/visibility="None"/g) || []).length);
