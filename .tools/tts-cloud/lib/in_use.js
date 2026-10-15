"use strict";

/**
 * Which Cloud files are still referenced. Matching uses "ugc/<handle>/<SHA1>" so old
 * and new Steam hostnames compare equal.
 *
 * Protecting sources:
 *   - the current Toronto Rising save (tts-assets.config.json defaultSaveName)
 *   - every save in savesDir that is NOT a Toronto Rising save (other mods)
 *   - tracked repo code and data (not Markdown)
 * Older Toronto Rising saves and autosaves only warn, unless protectAllSaves.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const { REPO_ROOT } = require("./cloud_config.js");

const UGC_RE = /ugc\/(\d+)\/([0-9A-Fa-f]{40})/g;
const SAVE_CACHE = path.join(REPO_ROOT, ".cache", "save-url-index.json");
/** PC seat figurine GUIDs: present in every Toronto Rising save. */
const TR_FINGERPRINT_GUIDS = ["1c5b18", "e1a378", "390349", "923872", "1e70cf"];
const REPO_TEXT_EXT = new Set([".ttslua", ".lua", ".xml", ".json", ".jsonc", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".csv", ".html", ".css", ".scss"]);

/**
 * @param {string} text
 * @returns {Set<string>}
 */
function ugcKeysIn(text) {
  const out = new Set();
  for (const m of text.matchAll(UGC_RE)) out.add(`${m[1]}/${m[2].toUpperCase()}`);
  return out;
}

/**
 * @param {string} text
 */
function isTorontoRisingSaveText(text) {
  let hits = 0;
  for (const guid of TR_FINGERPRINT_GUIDS) {
    if (text.includes(`"GUID": "${guid}"`)) hits += 1;
  }
  return hits >= 3;
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listSaveFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "tts-assets-backups") continue;
      out.push(...listSaveFiles(abs));
    } else if (ent.isFile() && /\.json$/i.test(ent.name) && ent.name !== "SaveFileInfos.json") {
      out.push(abs);
    }
  }
  return out;
}

function repoFiles() {
  const listed = execFileSync("git", ["ls-files", "-z"], { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return listed
    .split("\0")
    .filter((p) => p !== "" && REPO_TEXT_EXT.has(path.extname(p).toLowerCase()))
    .map((p) => path.join(REPO_ROOT, p));
}

/**
 * @typedef {{ path: string, label: string, isCurrent: boolean, isTorontoRising: boolean, keys: Set<string> }} SaveRefs
 */

/**
 * @param {{ savesDir: string, saveFile: string }} cfg
 * @returns {SaveRefs[]}
 */
function scanSaves(cfg) {
  let cache = {};
  try {
    cache = JSON.parse(fs.readFileSync(SAVE_CACHE, "utf8"));
  } catch {
    cache = {};
  }
  const next = {};
  const current = path.resolve(cfg.saveFile).toLowerCase();
  /** @type {SaveRefs[]} */
  const saves = [];
  for (const file of listSaveFiles(cfg.savesDir)) {
    const st = fs.statSync(file);
    let hit = cache[file];
    if (!hit || hit.size !== st.size || hit.mtimeMs !== st.mtimeMs) {
      const text = fs.readFileSync(file, "utf8");
      hit = { size: st.size, mtimeMs: st.mtimeMs, isTR: isTorontoRisingSaveText(text), keys: [...ugcKeysIn(text)] };
    }
    next[file] = hit;
    saves.push({
      path: file,
      label: path.relative(cfg.savesDir, file),
      isCurrent: path.resolve(file).toLowerCase() === current,
      isTorontoRising: hit.isTR,
      keys: new Set(hit.keys),
    });
  }
  fs.mkdirSync(path.dirname(SAVE_CACHE), { recursive: true });
  fs.writeFileSync(SAVE_CACHE, JSON.stringify(next), "utf8");
  return saves;
}

/**
 * @param {{ savesDir: string, saveFile: string }} cfg
 * @param {{ protectAllSaves?: boolean }} [opts]
 */
function buildInUseIndex(cfg, opts = {}) {
  const saves = scanSaves(cfg);
  /** @type {Map<string, string[]>} */
  const repoRefs = new Map();
  for (const file of repoFiles()) {
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (!text.includes("ugc/")) continue;
    const rel = path.relative(REPO_ROOT, file).replace(/\\/g, "/");
    for (const key of ugcKeysIn(text)) {
      if (!repoRefs.has(key)) repoRefs.set(key, []);
      repoRefs.get(key).push(rel);
    }
  }

  return {
    saves,
    repoRefs,
    /**
     * @param {string | null} matchKey "<handle>/<SHA1>"
     * @returns {{ protectedBy: string[], otherModSaves: string[], olderTorontoRisingSaves: string[] }}
     */
    lookup(matchKey) {
      const protectedBy = [];
      const otherModSaves = [];
      const olderTorontoRisingSaves = [];
      if (!matchKey) return { protectedBy, otherModSaves, olderTorontoRisingSaves };
      for (const s of saves) {
        if (!s.keys.has(matchKey)) continue;
        if (s.isCurrent) protectedBy.push(`current save (${s.label})`);
        else if (!s.isTorontoRising) {
          protectedBy.push(`other save (${s.label})`);
          otherModSaves.push(s.label);
        } else if (opts.protectAllSaves) protectedBy.push(`older Toronto Rising save (${s.label})`);
        else olderTorontoRisingSaves.push(s.label);
      }
      for (const f of repoRefs.get(matchKey) || []) protectedBy.push(`repo (${f})`);
      return { protectedBy, otherModSaves, olderTorontoRisingSaves };
    },
  };
}

/**
 * Where the current save uses each Cloud link: Objects > Decals > Object UI > Global UI.
 * @param {Record<string, any>} saveRoot
 * @returns {Map<string, "Objects" | "Decals" | "Object UI" | "Global UI">}
 */
function classifySaveUses(saveRoot) {
  const rank = { "Global UI": 0, "Object UI": 1, Decals: 2, Objects: 3 };
  /** @type {Map<string, any>} */
  const kinds = new Map();
  const note = (text, kind) => {
    for (const key of ugcKeysIn(text)) {
      const prev = kinds.get(key);
      if (!prev || rank[kind] > rank[prev]) kinds.set(key, kind);
    }
  };
  for (const a of saveRoot.CustomUIAssets || []) note(String(a.URL || ""), "Global UI");
  for (const d of saveRoot.DecalPallet || []) note(String(d.ImageURL || ""), "Decals");
  note(String(saveRoot.LuaScriptState || ""), "Objects");
  const visit = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const a of obj.CustomUIAssets || []) note(String(a.URL || ""), "Object UI");
    for (const d of obj.AttachedDecals || []) note(JSON.stringify(d), "Decals");
    const rest = { ...obj };
    delete rest.CustomUIAssets;
    delete rest.AttachedDecals;
    delete rest.ContainedObjects;
    delete rest.States;
    note(JSON.stringify(rest), "Objects");
    for (const c of obj.ContainedObjects || []) visit(c);
    for (const s of Object.values(obj.States || {})) visit(s);
  };
  for (const o of saveRoot.ObjectStates || []) visit(o);
  return kinds;
}

module.exports = {
  ugcKeysIn,
  isTorontoRisingSaveText,
  buildInUseIndex,
  classifySaveUses,
};
