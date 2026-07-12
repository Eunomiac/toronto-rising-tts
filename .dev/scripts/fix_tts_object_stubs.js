"use strict";

/**
 * Normalizes scrambled one-line stubs under `.tts/objects`:
 *
 * Stub **filenames** are `{displayNickname}.{guid}.*` (TTS Tools sync). **Role identity**
 * for managed objects comes from companion `.data.json` → `GMNotes` (e.g. `CSHEET_PAGE_1_PINK`).
 *
 * - **XML:** `GMNotes` `CSHEET_PAGE_<n>_*` → `<Include src="ui/player/csheets/page<n>.xml" />`
 * - **XML:** `CONTROL_BOARD` → npc control board Include; `CONTROL_BOARD_PALETTE` → `<Panel />`
 * - **XML:** remove stray `.xml` for Lua-only roles (`DICEBAG_*`, `SIGNAL_CANDLE_*`, …)
 * - **Lua:** one-line `require("...")` from role prefix (see `LUA_STUB_RULES`).
 *
 * Run from repo root:
 *   node .dev/scripts/fix_tts_object_stubs.js
 *
 * Optional:
 *   node .dev/scripts/fix_tts_object_stubs.js --dry-run
 *   node .dev/scripts/fix_tts_object_stubs.js --quiet
 */
const fs = require("fs");
const path = require("path");

const {
  listStubFiles,
  resolveRoleKeyForStub,
} = require("../../.tools/tts-object-stubs/tts-object-stub-identity.js");

/** @type {readonly string[]} */
const OBJECTS_REL_PATH = [".tts", "objects"];

/** Role key pattern: CSHEET_PAGE_<digits>_ */
const CSHEET_PAGE_XML_RE = /^CSHEET_PAGE_(\d+)_/i;

/**
 * Object role prefixes that have a Lua stub but must not have a `.tts/objects` Custom UI stub.
 *
 * @type {readonly string[]}
 */
const LUA_ONLY_NO_XML_PREFIXES = [
  "DICEBAG",
  "SIGNAL_CANDLE",
  "SOUNDSCAPE",
  "TAROT_BUTTON",
  "COMPANION_TOGGLE",
];

const LUA_STUB_RULES = [
  { prefix: "CONTROL_BOARD_PALETTE", line: `require("objects.npc_control_board_palette")` },
  { prefix: "CONTROL_BOARD", line: `require("objects.npc_control_board")` },
  { prefix: "SIGNAL_CANDLE", line: `require("ui.ui_signal_candle")` },
  { prefix: "SOUNDSCAPE", line: `require("core.soundscape_emitter_object")` },
  { prefix: "TAROT_BUTTON", line: `require("ui.ui_tarot_button")` },
  { prefix: "COMPANION_TOGGLE", line: `require("ui.ui_companion_toggle")` },
  { prefix: "DICEBAG", line: `require("objects.dice_bag")` },
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
 * @param {string|null} roleKey
 * @returns {boolean}
 */
function isLuaOnlyObjectXmlStubForRole(roleKey) {
  if (roleKey === null) {
    return false;
  }
  const upper = roleKey.toUpperCase();
  for (const prefix of LUA_ONLY_NO_XML_PREFIXES) {
    if (upper.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {string|null} roleKey
 * @returns {string | null}
 */
function expectedControlBoardPaletteXmlLine(roleKey) {
  if (roleKey === null || !roleKey.toUpperCase().startsWith("CONTROL_BOARD_PALETTE")) {
    return null;
  }
  return `<Panel />`;
}

/**
 * @param {string|null} roleKey
 * @returns {string | null}
 */
function expectedControlBoardXmlIncludeLine(roleKey) {
  if (roleKey === null) {
    return null;
  }
  const upper = roleKey.toUpperCase();
  if (upper.startsWith("CONTROL_BOARD_PALETTE")) {
    return null;
  }
  if (!upper.startsWith("CONTROL_BOARD")) {
    return null;
  }
  return `<Include src="ui/objects/npc_control_board.xml" />`;
}

/**
 * @param {string} roleKey
 * @returns {string | null}
 */
function expectedLuaRequireLine(roleKey) {
  const upperRole = roleKey.toUpperCase();
  for (const rule of LUA_STUB_RULES) {
    if (upperRole.startsWith(rule.prefix)) {
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
 * @returns {string[]} absolute paths of Lua-only object XML stubs to delete
 */
function collectLuaOnlyXmlRemovals(objectsDir) {
  /** @type {string[]} */
  const out = [];
  for (const stub of listStubFiles(objectsDir)) {
    if (stub.ext !== "xml") {
      continue;
    }
    const roleKey = resolveRoleKeyForStub(objectsDir, stub.displayStem, stub.guid);
    if (!isLuaOnlyObjectXmlStubForRole(roleKey)) {
      continue;
    }
    out.push(path.join(objectsDir, stub.fileName));
  }
  out.sort((a, b) => a.localeCompare(b, "en"));
  return out;
}

/**
 * @param {string} objectsDir
 * @returns {StubTarget[]}
 */
function collectCsheetXmlTargets(objectsDir) {
  /** @type {StubTarget[]} */
  const out = [];
  for (const stub of listStubFiles(objectsDir)) {
    if (stub.ext !== "xml") {
      continue;
    }
    const roleKey = resolveRoleKeyForStub(objectsDir, stub.displayStem, stub.guid);
    if (isLuaOnlyObjectXmlStubForRole(roleKey)) {
      continue;
    }
    const paletteXmlWant = expectedControlBoardPaletteXmlLine(roleKey);
    if (paletteXmlWant !== null) {
      out.push({
        fullPath: path.join(objectsDir, stub.fileName),
        want: paletteXmlWant,
      });
      continue;
    }
    const controlBoardWant = expectedControlBoardXmlIncludeLine(roleKey);
    if (controlBoardWant !== null) {
      out.push({
        fullPath: path.join(objectsDir, stub.fileName),
        want: controlBoardWant,
      });
      continue;
    }
    if (roleKey === null) {
      continue;
    }
    const match = CSHEET_PAGE_XML_RE.exec(roleKey);
    if (match === null) {
      continue;
    }
    const pageNum = match[1];
    out.push({
      fullPath: path.join(objectsDir, stub.fileName),
      want: expectedCsheetIncludeLine(pageNum),
    });
  }
  out.sort((a, b) => a.fullPath.localeCompare(b.fullPath, "en"));
  return out;
}

/**
 * @param {string} objectsDir
 * @returns {StubTarget[]}
 */
function collectLuaStubTargets(objectsDir) {
  /** @type {StubTarget[]} */
  const out = [];
  for (const stub of listStubFiles(objectsDir)) {
    if (stub.ext !== "lua" && stub.ext !== "ttslua") {
      continue;
    }
    const roleKey = resolveRoleKeyForStub(objectsDir, stub.displayStem, stub.guid);
    if (roleKey === null) {
      continue;
    }
    const want = expectedLuaRequireLine(roleKey);
    if (want === null) {
      continue;
    }
    out.push({
      fullPath: path.join(objectsDir, stub.fileName),
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

  const xmlRemovePaths = collectLuaOnlyXmlRemovals(objectsDir);
  const xmlTargets = collectCsheetXmlTargets(objectsDir);
  const luaTargets = collectLuaStubTargets(objectsDir);

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
