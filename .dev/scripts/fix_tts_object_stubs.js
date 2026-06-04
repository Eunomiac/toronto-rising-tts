"use strict";

/**
 * Normalizes scrambled one-line stubs under `.tts/objects`:
 *
 * - **XML:** `CSHEET_PAGE_<n>_*.xml` → `<Include src="ui/player/csheets/page<n>.xml" />`
 * - **XML:** `CONTROL_BOARD.*.xml` → `<Include src="ui/objects/npc_control_board.xml" />`
 * - **XML:** `CONTROL_BOARD_PALETTE.*.xml` → `<Panel />` (palette has no XmlUI toolbar)
 * - **XML:** remove stray `.xml` for Lua-only objects (`DICEBAG_*`, `SIGNAL_CANDLE_*`, `SOUNDSCAPE_*`,
 *   `TAROT_BUTTON_*`) — they use `createButton`, not Custom UI (extension often pastes csheet Includes)
 * - **Lua / TTS Lua:** `.lua` or `.ttslua` files whose names start with a known prefix → a single
 *   `require("...")` line derived from the prefix (see `LUA_STUB_RULES`).
 *
 * Run from repo root:
 *   node .dev/scripts/fix_tts_object_stubs.js
 *
 * Optional:
 *   node .dev/scripts/fix_tts_object_stubs.js --dry-run
 *   node .dev/scripts/fix_tts_object_stubs.js --quiet
 *
 * `--quiet` (build mode): exit 0 when `.tts/objects` is missing; no output when there is nothing
 * to scan or everything is already correct; one summary line when any file was written; errors
 * always go to stderr.
 */
const fs = require("fs");
const path = require("path");

/** @type {readonly string[]} */
const OBJECTS_REL_PATH = [".tts", "objects"];

/** Filename prefix pattern: CSHEET_PAGE_<digits>_ */
const CSHEET_PAGE_XML_RE = /^CSHEET_PAGE_(\d+)_/i;

/** Filename prefix patterns for gameboard object Custom UI stubs. */
const CONTROL_BOARD_PALETTE_XML_RE = /^CONTROL_BOARD_PALETTE\./i;
const CONTROL_BOARD_XML_RE = /^CONTROL_BOARD\./i;

/**
 * @param {string} objectFilename  e.g. `DICEBAG_NORMAL_PINK.4637da.xml`
 * @returns {boolean}
 */
function isLuaOnlyObjectXmlStub(objectFilename) {
  if (!objectFilename.toLowerCase().endsWith(".xml")) {
    return false;
  }
  const stem = objectFilename.slice(0, -".xml".length).toUpperCase();
  for (const prefix of LUA_ONLY_NO_XML_PREFIXES) {
    if (stem.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {string} objectFilename
 * @returns {string | null}
 */
function expectedControlBoardPaletteXmlLine(objectFilename) {
  if (!CONTROL_BOARD_PALETTE_XML_RE.test(objectFilename)) {
    return null;
  }
  if (!objectFilename.toLowerCase().endsWith(".xml")) {
    return null;
  }
  return `<Panel />`;
}

/**
 * @param {string} objectFilename
 * @returns {string | null}
 */
function expectedControlBoardXmlIncludeLine(objectFilename) {
  if (CONTROL_BOARD_PALETTE_XML_RE.test(objectFilename)) {
    return null;
  }
  if (!CONTROL_BOARD_XML_RE.test(objectFilename)) {
    return null;
  }
  if (!objectFilename.toLowerCase().endsWith(".xml")) {
    return null;
  }
  return `<Include src="ui/objects/npc_control_board.xml" />`;
}

/**
 * Longer prefixes first for predictable matching if new rules are added later.
 * Match is case-insensitive on the filename stem (basename without `.lua` / `.ttslua`).
 *
 * @type {readonly { prefix: string, line: string }[]}
 */
/**
 * Object name prefixes that have a Lua stub but must not have a `.tts/objects` Custom UI stub.
 * (Invisible `createButton` / Global routing — not XmlUI `<Include>` sheets.)
 *
 * @type {readonly string[]}
 */
const LUA_ONLY_NO_XML_PREFIXES = [
  "DICEBAG",
  "SIGNAL_CANDLE",
  "SOUNDSCAPE",
  "TAROT_BUTTON",
];

const LUA_STUB_RULES = [
  { prefix: "CONTROL_BOARD_PALETTE", line: `require("objects.npc_control_board_palette")` },
  { prefix: "CONTROL_BOARD", line: `require("objects.npc_control_board")` },
  { prefix: "SIGNAL_CANDLE", line: `require("ui.ui_signal_candle")` },
  { prefix: "SOUNDSCAPE", line: `require("core.soundscape_emitter_object")` },
  { prefix: "TAROT_BUTTON", line: `require("ui.ui_tarot_button")` },
  { prefix: "DICEBAG", line: `require("objects.dice_bag")` },
  // Dynamic XML pages: separate entries so template builders are not bundled on all ~80 sheet objects.
  { prefix: "CSHEET_PAGE_3", line: `require("ui.ui_csheet_page3")` },
  { prefix: "CSHEET_PAGE_4", line: `require("ui.ui_csheet_page4")` },
  { prefix: "CSHEET_PAGE_5", line: `require("ui.ui_csheet_page5")` },
  { prefix: "CSHEET_PAGE_6", line: `require("ui.ui_csheet_page6")` },
  { prefix: "CSHEET", line: `require("ui.ui_csheet")` },
];

/**
 * @param {string} flagName
 * @returns {boolean}
 */
function hasFlag(flagName) {
  return process.argv.includes(flagName);
}

/**
 * @returns {boolean}
 */
function isQuiet() {
  return hasFlag("--quiet");
}

/**
 * @param {string} pageNum
 * @returns {string}
 */
function expectedCsheetIncludeLine(pageNum) {
  return `<Include src="ui/player/csheets/page${pageNum}.xml" />`;
}

/**
 * @param {string} objectFilename Full filename e.g. `TAROT_BUTTON_PINK.4dc8ad.lua`
 * @returns {string | null} Lua stem used for prefix matching, or null if not a stub extension
 */
function luaStemForMatching(objectFilename) {
  const lower = objectFilename.toLowerCase();
  if (lower.endsWith(".ttslua")) {
    return objectFilename.slice(0, -".ttslua".length);
  }
  if (lower.endsWith(".lua")) {
    return objectFilename.slice(0, -".lua".length);
  }
  return null;
}

/**
 * @param {string} stem
 * @returns {string | null}
 */
function expectedLuaRequireLine(stem) {
  const upperStem = stem.toUpperCase();
  for (const rule of LUA_STUB_RULES) {
    if (upperStem.startsWith(rule.prefix)) {
      return rule.line;
    }
  }
  return null;
}

/**
 * Normalizes line endings and returns non-empty trimmed logical lines.
 * @param {string} raw
 * @returns {string[]}
 */
function logicalLines(raw) {
  if (typeof raw !== "string") {
    return [];
  }
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * @typedef {{ fullPath: string, want: string }} StubTarget
 */

/**
 * @param {string} objectsDir
 * @param {string[]} entries
 * @returns {StubTarget[]}
 */
/**
 * @param {string} objectsDir
 * @param {string[]} entries
 * @returns {string[]} absolute paths of Lua-only object XML stubs to delete
 */
function collectLuaOnlyXmlRemovals(objectsDir, entries) {
  /** @type {string[]} */
  const out = [];
  for (const name of entries) {
    if (!isLuaOnlyObjectXmlStub(name)) {
      continue;
    }
    out.push(path.join(objectsDir, name));
  }
  out.sort((a, b) => a.localeCompare(b, "en"));
  return out;
}

/**
 * @param {string} objectsDir
 * @param {string[]} entries
 * @returns {StubTarget[]}
 */
function collectCsheetXmlTargets(objectsDir, entries) {
  /** @type {StubTarget[]} */
  const out = [];
  for (const name of entries) {
    if (!name.toLowerCase().endsWith(".xml")) {
      continue;
    }
    if (isLuaOnlyObjectXmlStub(name)) {
      continue;
    }
    const paletteXmlWant = expectedControlBoardPaletteXmlLine(name);
    if (paletteXmlWant !== null) {
      out.push({
        fullPath: path.join(objectsDir, name),
        want: paletteXmlWant,
      });
      continue;
    }
    const controlBoardWant = expectedControlBoardXmlIncludeLine(name);
    if (controlBoardWant !== null) {
      out.push({
        fullPath: path.join(objectsDir, name),
        want: controlBoardWant,
      });
      continue;
    }
    const match = CSHEET_PAGE_XML_RE.exec(name);
    if (!match) {
      continue;
    }
    const pageNum = match[1];
    out.push({
      fullPath: path.join(objectsDir, name),
      want: expectedCsheetIncludeLine(pageNum),
    });
  }
  out.sort((a, b) => a.fullPath.localeCompare(b.fullPath, "en"));
  return out;
}

/**
 * @param {string} objectsDir
 * @param {string[]} entries
 * @returns {StubTarget[]}
 */
function collectLuaStubTargets(objectsDir, entries) {
  /** @type {StubTarget[]} */
  const out = [];
  for (const name of entries) {
    const stem = luaStemForMatching(name);
    if (stem === null) {
      continue;
    }
    const want = expectedLuaRequireLine(stem);
    if (want === null) {
      continue;
    }
    out.push({
      fullPath: path.join(objectsDir, name),
      want,
    });
  }
  out.sort((a, b) => a.fullPath.localeCompare(b.fullPath, "en"));
  return out;
}

/**
 * @param {string} repoRoot
 * @param {StubTarget[]} targets
 * @param {boolean} dryRun
 * @param {boolean} quiet
 * @param {string[]} errors
 * @returns {{ fixed: number, ok: number }}
 */
function fixStubTargets(repoRoot, targets, dryRun, quiet, errors) {
  let fixed = 0;
  let ok = 0;

  for (const { fullPath, want } of targets) {
    let raw = "";
    try {
      raw = fs.readFileSync(fullPath, "utf8");
    } catch (err) {
      errors.push(`${fullPath}: read failed: ${String(err)}`);
      continue;
    }

    const lines = logicalLines(raw);
    const joined = lines.length === 1 ? lines[0] : lines.join(" ");
    const needsFix = lines.length !== 1 || joined !== want;

    if (!needsFix) {
      ok += 1;
      continue;
    }

    const out = `${want}\n`;
    if (dryRun) {
      console.log(`[dry-run] would fix: ${path.relative(repoRoot, fullPath)}`);
      console.log(`          got (${lines.length} non-empty line(s)): ${JSON.stringify(joined)}`);
      console.log(`          want: ${JSON.stringify(want)}`);
      fixed += 1;
      continue;
    }

    try {
      fs.writeFileSync(fullPath, out, "utf8");
    } catch (err) {
      errors.push(`${fullPath}: write failed: ${String(err)}`);
      continue;
    }

    if (!quiet || dryRun) {
      console.log(`fixed: ${path.relative(repoRoot, fullPath)}`);
    }
    fixed += 1;
  }

  return { fixed, ok };
}

/**
 * @param {string} repoRoot
 * @param {string[]} paths
 * @param {boolean} dryRun
 * @param {boolean} quiet
 * @param {string[]} errors
 * @returns {{ removed: number }}
 */
function removeLuaOnlyXmlStubs(repoRoot, paths, dryRun, quiet, errors) {
  let removed = 0;
  for (const fullPath of paths) {
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    if (dryRun) {
      if (!quiet) {
        console.log(`[dry-run] would remove: ${path.relative(repoRoot, fullPath)}`);
      }
      removed += 1;
      continue;
    }
    try {
      fs.unlinkSync(fullPath);
    } catch (err) {
      errors.push(`${fullPath}: delete failed: ${String(err)}`);
      continue;
    }
    if (!quiet) {
      console.log(`removed: ${path.relative(repoRoot, fullPath)}`);
    }
    removed += 1;
  }
  return { removed };
}

/**
 * @returns {void}
 */
function main() {
  const dryRun = hasFlag("--dry-run");
  const quiet = isQuiet();
  const repoRoot = process.cwd();
  const objectsDir = path.join(repoRoot, ...OBJECTS_REL_PATH);

  if (!fs.existsSync(objectsDir) || !fs.statSync(objectsDir).isDirectory()) {
    if (!quiet) {
      console.error(`Expected directory missing or not a directory: ${objectsDir}`);
      process.exitCode = 1;
    }
    return;
  }

  const entries = fs.readdirSync(objectsDir);
  const xmlRemovePaths = collectLuaOnlyXmlRemovals(objectsDir, entries);
  const xmlTargets = collectCsheetXmlTargets(objectsDir, entries);
  const luaTargets = collectLuaStubTargets(objectsDir, entries);

  if (quiet && xmlRemovePaths.length === 0 && xmlTargets.length === 0 && luaTargets.length === 0) {
    return;
  }

  /** @type {string[]} */
  const errors = [];

  const xmlRemoveResult = removeLuaOnlyXmlStubs(repoRoot, xmlRemovePaths, dryRun, quiet, errors);
  const xmlResult = fixStubTargets(repoRoot, xmlTargets, dryRun, quiet, errors);
  const luaResult = fixStubTargets(repoRoot, luaTargets, dryRun, quiet, errors);

  if (errors.length > 0) {
    for (const msg of errors) {
      console.error(msg);
    }
    process.exitCode = 1;
    return;
  }

  if (quiet && !dryRun) {
    const totalFixed = xmlRemoveResult.removed + xmlResult.fixed + luaResult.fixed;
    if (totalFixed > 0) {
      console.log(`TTS object stubs: repaired ${totalFixed} file(s) under .tts/objects.`);
    }
    return;
  }

  console.log(
    `TTS object XML removals (Lua-only): ${xmlRemovePaths.length} file(s), ${xmlRemoveResult.removed} ${dryRun ? "would remove" : "removed"}.`,
  );
  console.log(
    `TTS object XML stubs: ${xmlTargets.length} file(s), ${xmlResult.ok} already correct, ${xmlResult.fixed} ${dryRun ? "would change" : "updated"}.`,
  );
  console.log(
    `TTS object Lua stubs: ${luaTargets.length} file(s), ${luaResult.ok} already correct, ${luaResult.fixed} ${dryRun ? "would change" : "updated"}.`,
  );
}

main();
