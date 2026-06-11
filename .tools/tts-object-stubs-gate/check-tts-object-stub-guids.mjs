#!/usr/bin/env node
/**
 * TTS object stub GUID gate: `.tts/objects/{Nickname}.{guid}.lua` filenames must match
 * `lib/guids.ttslua` `G.GUIDS` for stub-managed objects (dice bags, csheet pages, etc.).
 *
 * `fix_tts_object_stubs.js` normalizes stub *content* only; it does not validate GUIDs.
 * Save & Play keys off the GUID suffix — a one-line require on the wrong filename never
 * reaches the in-game object (e.g. DICEBAG_ROUSE_PURPLE.03cb81.lua vs .70c7cf.lua).
 *
 * Skips with exit 0 when `.tts/objects` is absent (no TTS Tools sync yet).
 * Log: .dev/build-logs/tts-object-stub-guids-gate.txt
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname, "..", "..");
const OBJECTS_DIR = join(REPO_ROOT, ".tts", "objects");
const GUIDS_FILE = join(REPO_ROOT, "lib", "guids.ttslua");
const LOG_DIR = join(REPO_ROOT, ".dev", "build-logs");
const LOG_FILE = join(LOG_DIR, "tts-object-stub-guids-gate.txt");

/** @type {readonly string[]} Same families as `.dev/scripts/fix_tts_object_stubs.js`. */
const MANAGED_KEY_PREFIXES = [
  "DICEBAG_",
  "CSHEET_PAGE_",
  "CONTROL_BOARD",
  "SIGNAL_CANDLE_",
  "SOUNDSCAPE_",
  "TAROT_BUTTON_",
];

const STUB_FILE_RE = /^(.+)\.([0-9a-fA-F]{6})\.(lua|ttslua|xml)$/;

/**
 * @param {string} key
 * @returns {boolean}
 */
function isManagedGuidKey(key) {
  return MANAGED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * @param {string} guidsPath
 * @returns {Map<string, string>}
 */
function loadGuidMap(guidsPath) {
  const src = readFileSync(guidsPath, "utf8");
  /** @type {Map<string, string>} */
  const map = new Map();
  const lineRe = /^\s*([A-Z0-9_]+)\s*=\s*"([0-9a-fA-F]{6})"/gm;
  let match = lineRe.exec(src);
  while (match !== null) {
    const key = match[1];
    const guid = match[2].toLowerCase();
    if (!guid.includes("@")) {
      map.set(key, guid);
    }
    match = lineRe.exec(src);
  }
  return map;
}

/**
 * @param {string} objectsDir
 * @returns {Array<{ fileName: string, stem: string, guid: string, ext: string }>}
 */
function listStubFiles(objectsDir) {
  /** @type {Array<{ fileName: string, stem: string, guid: string, ext: string }>} */
  const out = [];
  for (const name of readdirSync(objectsDir)) {
    const m = STUB_FILE_RE.exec(name);
    if (m === null) {
      continue;
    }
    out.push({
      fileName: name,
      stem: m[1],
      guid: m[2].toLowerCase(),
      ext: m[3].toLowerCase(),
    });
  }
  return out;
}

/**
 * Group key for "sibling set must all be present" (e.g. all DICEBAG_* for one seat).
 * @param {string} key
 * @returns {string|null}
 */
function managedFamilyGroup(key) {
  if (key.startsWith("DICEBAG_")) {
    const parts = key.split("_");
    if (parts.length >= 3) {
      return `DICEBAG::${parts.slice(2).join("_")}`;
    }
  }
  if (key.startsWith("CSHEET_PAGE_")) {
    const m = /^CSHEET_PAGE_(\d+)_(.+)$/.exec(key);
    if (m !== null) {
      return `CSHEET_PAGE_${m[1]}::${m[2]}`;
    }
  }
  return null;
}

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
  const stubFiles = listStubFiles(OBJECTS_DIR);

  /** @type {string[]} */
  const errors = [];

  /** stem -> { guid, fileName } from .lua/.ttslua only (authoritative for Save & Play) */
  /** @type {Map<string, { guid: string, fileName: string }>} */
  const luaStems = new Map();

  for (const stub of stubFiles) {
    if (stub.ext !== "lua" && stub.ext !== "ttslua") {
      continue;
    }
    if (!guidMap.has(stub.stem)) {
      continue;
    }
    if (!isManagedGuidKey(stub.stem)) {
      continue;
    }

    const expected = guidMap.get(stub.stem);
    if (expected === undefined) {
      continue;
    }

    if (stub.guid !== expected) {
      errors.push(
        `${stub.fileName}: GUID ${stub.guid} does not match lib/guids.ttslua ${stub.stem}=${expected}`,
      );
    }

    const prior = luaStems.get(stub.stem);
    if (prior !== undefined && prior.guid !== stub.guid) {
      errors.push(
        `${stub.fileName}: duplicate stem ${stub.stem} (also ${prior.fileName})`,
      );
    } else {
      luaStems.set(stub.stem, { guid: stub.guid, fileName: stub.fileName });
    }
  }

  /** guid -> stems[] for rotation detection */
  /** @type {Map<string, string[]>} */
  const guidToStems = new Map();
  for (const [stem, info] of luaStems) {
    const list = guidToStems.get(info.guid) ?? [];
    list.push(stem);
    guidToStems.set(info.guid, list);
  }
  for (const [guid, stems] of guidToStems) {
    if (stems.length > 1) {
      errors.push(
        `GUID ${guid} used by multiple stub nicknames: ${stems.join(", ")} (rotated .tts/objects cache?)`,
      );
    }
  }

  /** Missing stubs when siblings in the same family group are present. */
  /** @type {Map<string, Set<string>>} */
  const groupPresent = new Map();
  for (const stem of luaStems.keys()) {
    const group = managedFamilyGroup(stem);
    if (group === null) {
      continue;
    }
    const set = groupPresent.get(group) ?? new Set();
    set.add(stem);
    groupPresent.set(group, set);
  }

  for (const [group, presentStems] of groupPresent) {
    if (presentStems.size === 0) {
      continue;
    }
    for (const [key] of guidMap) {
      if (!isManagedGuidKey(key)) {
        continue;
      }
      if (managedFamilyGroup(key) !== group) {
        continue;
      }
      if (!presentStems.has(key)) {
        const expected = guidMap.get(key);
        errors.push(
          `missing stub .tts/objects/${key}.${expected}.lua (sibling stubs exist for ${group})`,
        );
      }
    }
  }

  if (errors.length > 0) {
    writeLog(false, `${errors.length} issue(s)`);
    console.error("[tts-object-stub-guids-gate] FAIL — .tts/objects stub filenames vs lib/guids.ttslua:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    console.error(
      "Fix: TTS Tools → Get Lua Scripts (refresh from save), then npm run tts-objects:fix-stubs, then Save & Play.",
    );
    process.exitCode = 1;
    return;
  }

  const checked = luaStems.size;
  const detail = checked > 0 ? `OK (${checked} managed stub(s) checked)` : "OK (no managed stubs in .tts/objects)";
  writeLog(true, detail);
  if (!quiet || checked > 0) {
    console.log(`[tts-object-stub-guids-gate] ${detail}`);
  }
}

main();
