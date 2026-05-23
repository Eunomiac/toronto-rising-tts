#!/usr/bin/env node
"use strict";

// Bundle CSHEET object stubs locally (luabundle) for size verification without Save & Play.
// Agent guidance: .dev/TTS_BUNDLING_SETUP.md

const fs = require("fs");
const path = require("path");
const { bundleString } = require("luabundle");

const REPO_ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(REPO_ROOT, ".tts/bundled");

const SAMPLES = [
  {
    outName: "CSHEET_PAGE_1_BROWN.sample.lua",
    entry: 'require("ui.ui_csheet")\n',
  },
  {
    outName: "CSHEET_PAGE_3_PURPLE.sample.lua",
    entry: 'require("ui.ui_csheet_page3")\n',
  },
];

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

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const sample of SAMPLES) {
  const bundled = bundleString(sample.entry, {
    rootModuleName: "__root",
    paths: ["?.ttslua", "?.lua"],
    resolveModule,
    metadata: false,
  });
  const outPath = path.join(OUT_DIR, sample.outName);
  fs.writeFileSync(outPath, bundled, "utf8");
  console.log(`Wrote ${outPath} (${bundled.length} bytes)`);
}
