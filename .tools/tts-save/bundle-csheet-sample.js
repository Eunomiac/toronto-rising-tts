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
  {
    outName: "CSHEET_PAGE_4_PINK.sample.lua",
    entry: 'require("ui.ui_csheet_page4")\n',
  },
  {
    outName: "CSHEET_PAGE_5_BROWN.sample.lua",
    entry: 'require("ui.ui_csheet_page5")\n',
  },
  {
    outName: "CSHEET_PAGE_6_ORANGE.sample.lua",
    entry: 'require("ui.ui_csheet_page6")\n',
  },
  {
    outName: "SIGNAL_CANDLE_RED.sample.lua",
    entry: 'require("ui.ui_signal_candle")\n',
  },
  {
    outName: "TAROT_BUTTON_PINK.sample.lua",
    entry: 'require("ui.ui_tarot_button")\n',
  },
  {
    outName: "NPC_CONTROL_BOARD.sample.lua",
    entry: 'require("objects.npc_control_board")\n',
  },
  {
    outName: "NPC_CONTROL_BOARD_PALETTE.sample.lua",
    entry: 'require("objects.npc_control_board_palette")\n',
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
