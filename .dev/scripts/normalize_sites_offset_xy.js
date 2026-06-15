"use strict";

/**
 * Normalizes unicode minus (U+2212) → ASCII hyphen in `C.Sites` `offsetXY` strings.
 * Run from repo root: node .dev/scripts/normalize_sites_offset_xy.js
 */

const fs = require("fs");
const path = require("path");

const UNICODE_MINUS = "\u2212";
const root = path.resolve(__dirname, "..", "..");
const constantsPath = path.join(root, "lib", "constants.ttslua");

let source = fs.readFileSync(constantsPath, "utf8");
if (!source.includes(UNICODE_MINUS)) {
  console.log("No unicode minus found in lib/constants.ttslua — nothing to change.");
  process.exit(0);
}

const normalized = source.split(UNICODE_MINUS).join("-");
const count = (source.length - normalized.length) / UNICODE_MINUS.length;
fs.writeFileSync(constantsPath, normalized, "utf8");
console.log(`Normalized ${count} unicode minus character(s) in lib/constants.ttslua offsetXY values.`);
