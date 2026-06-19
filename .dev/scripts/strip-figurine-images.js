#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const target = path.resolve(process.argv[2] || "lib/npcs_data.ttslua");
let text = fs.readFileSync(target, "utf8");
const re =
  /\r?\n\s*images\s*=\s*\{\r?\n\s*front\s*=\s*"[^"]*",\r?\n\s*back\s*=\s*"[^"]*"\r?\n\s*\},/g;
const before = (text.match(/images\s*=\s*\{/g) || []).length;
text = text.replace(re, "");
const after = (text.match(/images\s*=\s*\{/g) || []).length;
fs.writeFileSync(target, text);
console.log(`Removed ${before - after} figurine.images blocks (${after} remaining)`);
