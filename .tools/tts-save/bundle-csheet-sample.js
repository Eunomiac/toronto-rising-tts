#!/usr/bin/env node
"use strict";

// Bundle one CSHEET object stub locally (luabundle) for size verification without Save & Play.
// Agent guidance: .dev/TTS_BUNDLING_SETUP.md

const fs = require("fs");
const path = require("path");
const { bundleString } = require("luabundle");

const REPO_ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(REPO_ROOT, ".tts/bundled");
const ENTRY_LUA = 'require("ui.ui_csheet")\n';

/**
 * Resolve require("lib.foo") to repo path (supports .ttslua).
 * @param {string} name
 * @param {readonly string[]} packagePaths
 * @returns {string|null}
 */
function resolveModule(name, packagePaths) {
  const rel = name.replace(/\./g, "/");
  for (const pattern of packagePaths) {
    const candidate = path.join(REPO_ROOT, pattern.replace("?", rel));
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const bundled = bundleString(ENTRY_LUA, {
  rootModuleName: "__root",
  paths: ["?.ttslua", "?.lua"],
  resolveModule,
  metadata: false,
});

fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, "CSHEET_PAGE_1_BROWN.sample.lua");
fs.writeFileSync(outPath, bundled, "utf8");

console.log(`Wrote ${outPath} (${bundled.length} bytes)`);
