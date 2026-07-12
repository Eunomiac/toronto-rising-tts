"use strict";

/**
 * Normalize unicode minus (U+2212) → ASCII hyphen `-` in `lib/constants.ttslua`.
 * Google Sheet / copy-paste often injects U+2212 into numeric strings (e.g. Sites offsetXY).
 *
 * Run: npm run constants:normalize-minus
 * Also runs as part of `npm run build`.
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
console.log(`Normalized ${count} unicode minus character(s) in lib/constants.ttslua.`);
