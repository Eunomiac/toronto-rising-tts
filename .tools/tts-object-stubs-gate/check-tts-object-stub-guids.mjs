#!/usr/bin/env node
/**
 * TTS object stub GUID gate: `.tts/objects/{Nickname}.{guid}.lua` GUID suffixes must match
 * `lib/guids.ttslua` for stub-managed objects. Role identity is read from companion
 * `.data.json` → `GMNotes` (e.g. `CSHEET_PAGE_1_PINK`), not from the display nickname in
 * the filename.
 *
 * `fix_tts_object_stubs.js` normalizes stub *content* only; this gate validates GUIDs.
 *
 * Skips with exit 0 when `.tts/objects` is absent (no TTS Tools sync yet).
 * Log: .dev/build-logs/tts-object-stub-guids-gate.txt
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  isManagedRoleKey,
  loadGuidMap,
  indexManagedLuaStubsByRoleKey,
  managedFamilyGroup,
} = require("../tts-object-stubs/tts-object-stub-identity.js");

const __dirname = dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname, "..", "..");
const OBJECTS_DIR = join(REPO_ROOT, ".tts", "objects");
const GUIDS_FILE = join(REPO_ROOT, "lib", "guids.ttslua");
const LOG_DIR = join(REPO_ROOT, ".dev", "build-logs");
const LOG_FILE = join(LOG_DIR, "tts-object-stub-guids-gate.txt");

/**
 * @param {boolean} ok
 * @param {string} detail
 */
function writeLog(ok, detail) {
  mkdirSync(LOG_DIR, { recursive: true });
  const line = `${new Date().toISOString()}\t${ok ? "OK" : "FAIL"}\t${detail}\n`;
  appendFileSync(LOG_FILE, line, "utf8");
}

function main() {
  const quiet = process.argv.includes("--quiet");

  if (!existsSync(GUIDS_FILE)) {
    console.error(`[tts-object-stub-guids-gate] missing ${relative(REPO_ROOT, GUIDS_FILE)}`);
    process.exitCode = 1;
    return;
  }

  if (!existsSync(OBJECTS_DIR) || !statSync(OBJECTS_DIR).isDirectory()) {
    const msg = "skipped (.tts/objects absent — run TTS Tools Get Lua Scripts after Save & Play)";
    writeLog(true, msg);
    if (!quiet) {
      console.log(`[tts-object-stub-guids-gate] ${msg}`);
    }
    return;
  }

  const guidMap = loadGuidMap(GUIDS_FILE);
  const byRole = indexManagedLuaStubsByRoleKey(OBJECTS_DIR);

  /** @type {string[]} */
  const errors = [];

  /** @type {Map<string, string[]>} */
  const guidToRoles = new Map();

  for (const [roleKey, info] of byRole) {
    if (!guidMap.has(roleKey)) {
      continue;
    }

    const expected = guidMap.get(roleKey);
    if (expected === undefined) {
      continue;
    }

    if (info.guid !== expected) {
      errors.push(
        `${info.luaFileName}: GMNotes role ${roleKey} expects GUID ${expected}, filename has ${info.guid}`,
      );
    }

    if (info.conflict !== undefined) {
      errors.push(
        `${info.luaFileName}: duplicate GMNotes role ${roleKey} (also ${info.conflict})`,
      );
    }

    const list = guidToRoles.get(info.guid) ?? [];
    list.push(roleKey);
    guidToRoles.set(info.guid, list);
  }

  for (const [guid, roles] of guidToRoles) {
    if (roles.length > 1) {
      errors.push(
        `GUID ${guid} used by multiple GMNotes roles: ${roles.join(", ")} (rotated .tts/objects cache?)`,
      );
    }
  }

  /** Missing stubs when siblings in the same family group are present. */
  /** @type {Map<string, Set<string>>} */
  const groupPresent = new Map();
  for (const roleKey of byRole.keys()) {
    if (!guidMap.has(roleKey)) {
      continue;
    }
    const group = managedFamilyGroup(roleKey);
    if (group === null) {
      continue;
    }
    const set = groupPresent.get(group) ?? new Set();
    set.add(roleKey);
    groupPresent.set(group, set);
  }

  for (const [group, presentRoles] of groupPresent) {
    if (presentRoles.size === 0) {
      continue;
    }
    for (const [key] of guidMap) {
      if (!isManagedRoleKey(key)) {
        continue;
      }
      if (managedFamilyGroup(key) !== group) {
        continue;
      }
      if (!presentRoles.has(key)) {
        const expected = guidMap.get(key);
        errors.push(
          `missing stub for GMNotes role ${key} (expected *.${expected}.lua; sibling stubs exist for ${group})`,
        );
      }
    }
  }

  if (errors.length > 0) {
    writeLog(false, `${errors.length} issue(s)`);
    console.error(
      "[tts-object-stub-guids-gate] FAIL — .tts/objects stub GUIDs vs lib/guids.ttslua (role from .data.json GMNotes):",
    );
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    console.error(
      "Fix: TTS Tools → Get Lua Scripts (refresh from save), then npm run tts-objects:fix-stubs, then Save & Play.",
    );
    process.exitCode = 1;
    return;
  }

  let checked = 0;
  for (const roleKey of byRole.keys()) {
    if (guidMap.has(roleKey)) {
      checked += 1;
    }
  }
  const detail =
    checked > 0 ? `OK (${checked} managed stub(s) checked)` : "OK (no managed stubs in .tts/objects)";
  writeLog(true, detail);
  if (!quiet || checked > 0) {
    console.log(`[tts-object-stub-guids-gate] ${detail}`);
  }
}

main();
