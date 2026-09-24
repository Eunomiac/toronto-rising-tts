"use strict";

/**
 * Bake finished XP log sessions from the latest TTS save into lib/csheet_xp_log_baked.ttslua.
 *
 * Run from repo root: node .dev/scripts/bake_csheet_xp_log.js
 * Optional: --save <path> | --saveName <id>
 */

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("../../.tools/tts-save/resolve-save-path");
const {
  sessionDisplayForNum,
  sessionTitleUpper,
  formatShortDate,
  formatSummation,
  LIVE_SLOT_CAP,
  PAGE_LINE_BUDGET,
} = require("./xp_display");

const root = path.resolve(__dirname, "..", "..");
const outPath = path.join(root, "lib", "csheet_xp_log_baked.ttslua");
const configPath = path.join(root, "tts-assets.config.json");

function loadSteamIdToCharKey() {
  const constantsPath = path.join(root, "lib", "constants.ttslua");
  const text = fs.readFileSync(constantsPath, "utf8");
  const nickToId = {};
  const idsBlock = text.match(/C\.PlayerIDs\s*=\s*\{([\s\S]*?)\n\}/);
  if (idsBlock) {
    const re = /(\w+)\s*=\s*["'](\d+)["']/g;
    let m;
    while ((m = re.exec(idsBlock[1])) !== null) {
      nickToId[m[1]] = m[2];
    }
  }
  const map = {};
  const dataBlock = text.match(/C\.PlayerData\s*=\s*\{([\s\S]*?)\n\}/);
  if (!dataBlock) return map;
  const entryRe = /\[C\.PlayerIDs\.(\w+)\]\s*=\s*\{([\s\S]*?)\n\s*\},/g;
  let m;
  while ((m = entryRe.exec(dataBlock[1])) !== null) {
    const nick = m[1];
    const body = m[2];
    const steamId = nickToId[nick];
    const ck = body.match(/charKey\s*=\s*["']([^"']+)["']/);
    if (steamId && ck) map[steamId] = ck[1];
  }
  return map;
}

function loadConfig() {
  let defaultSaveName = "230";
  let savesDir;
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (typeof raw.defaultSaveName === "string" && raw.defaultSaveName.trim()) {
      defaultSaveName = raw.defaultSaveName.trim().replace(/^TS_Save_/i, "").replace(/\.json$/i, "");
    }
    if (typeof raw.savesDir === "string" && raw.savesDir.trim()) {
      savesDir = path.resolve(raw.savesDir.trim());
    }
  } catch (_) {
    /* optional */
  }
  return { defaultSaveName, savesDir };
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--save") opts.save = argv[++i];
    else if (a === "--saveName") opts.saveName = argv[++i];
    else if (a === "--savesDir") opts.savesDir = argv[++i];
  }
  return opts;
}

function parseLuaScriptState(saveRoot) {
  const raw = saveRoot.LuaScriptState;
  if (raw == null || raw === "") {
    return {};
  }
  if (typeof raw === "object") {
    return raw;
  }
  if (typeof raw !== "string") {
    throw new Error("LuaScriptState is not a string or object");
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`LuaScriptState JSON parse failed: ${err.message}`);
  }
}

function normalizeSessionBlock(sessionNum, block) {
  const gains = Array.isArray(block.gains) ? block.gains : [];
  const spends = Array.isArray(block.spends) ? block.spends : [];
  const timeline = Array.isArray(block.timeline) ? block.timeline : null;

  let gainList = gains
    .filter((g) => g && typeof g === "object")
    .map((g) => ({
      amount: Math.floor(Math.abs(Number(g.amount) || 0)),
      description: String(g.description || ""),
    }));
  let spendList = spends
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      amount: Math.floor(Math.abs(Number(s.amount) || 0)),
      description: String(s.description || ""),
    }));

  if (timeline && timeline.length > 0 && gainList.length === 0 && spendList.length === 0) {
    gainList = [];
    spendList = [];
    for (const e of timeline) {
      if (!e || typeof e !== "object") continue;
      const amount = Math.floor(Math.abs(Number(e.amount) || 0));
      const description = String(e.description || "");
      if (e.kind === "spend" || Number(e.signedAmount) < 0) {
        spendList.push({ amount, description });
      } else {
        gainList.push({ amount, description });
      }
    }
  }

  if (gainList.length === 0 && spendList.length === 0) {
    return null;
  }

  const maxRows = PAGE_LINE_BUDGET - 1;
  const croppedGains = gainList.slice(0, maxRows);
  const croppedSpends = spendList.slice(0, maxRows);

  const prevTotal = Math.floor(Number(block.prevTotal) || 0);
  const gainTotal = Math.floor(Number(block.gainTotal) || croppedGains.reduce((a, g) => a + g.amount, 0));
  const spendTotal = Math.floor(Number(block.spendTotal) || croppedSpends.reduce((a, s) => a + s.amount, 0));
  const newTotal = Math.floor(Number(block.newTotal) != null ? Number(block.newTotal) : prevTotal + gainTotal - spendTotal);
  const sessionDisplay = block.sessionDisplay || sessionDisplayForNum(sessionNum);
  const dateDisplay = formatShortDate(block.date);

  return {
    sessionNum,
    sessionDisplay,
    titleUpper: sessionTitleUpper(sessionDisplay, sessionNum),
    dateDisplay,
    prevTotal,
    gainTotal,
    spendTotal,
    newTotal,
    summation: formatSummation(prevTotal, gainTotal, spendTotal),
    totalDisplay: `${newTotal} XP`,
    gains: croppedGains,
    spends: croppedSpends,
  };
}

function collectSessions(xpLog, liveSessionNum) {
  if (!xpLog || typeof xpLog !== "object") return [];
  const out = [];
  for (const [key, block] of Object.entries(xpLog)) {
    const sn = Math.floor(Number(key));
    if (!Number.isFinite(sn) || sn >= liveSessionNum) continue;
    if (!block || typeof block !== "object") continue;
    const normalized = normalizeSessionBlock(sn, block);
    if (normalized) out.push(normalized);
  }
  out.sort((a, b) => b.sessionNum - a.sessionNum);
  return out;
}

function luaString(s) {
  return JSON.stringify(String(s ?? ""));
}

function emitLua(pack) {
  const lines = [];
  lines.push("--[[");
  lines.push("  Baked finished XP sessions for character sheet page 6.");
  lines.push("  DO NOT EDIT BY HAND — regenerate: node .dev/scripts/bake_csheet_xp_log.js");
  lines.push(`  Source: ${pack.saveFileName || "(none)"}`);
  lines.push("]]");
  lines.push("");
  lines.push("local BAKE = {");
  lines.push(`  bakedForSessionNum = ${Math.floor(pack.bakedForSessionNum)},`);
  lines.push(`  bakeRevision = ${Math.floor(pack.bakeRevision)},`);
  lines.push(`  saveFileName = ${luaString(pack.saveFileName)},`);
  lines.push("  byCharKey = {");

  const keys = Object.keys(pack.byCharKey).sort();
  for (const ck of keys) {
    const entry = pack.byCharKey[ck];
    lines.push(`    [${luaString(ck)}] = {`);
    lines.push("      sessions = {");
    for (const s of entry.sessions) {
      lines.push("        {");
      lines.push(`          sessionNum = ${s.sessionNum},`);
      lines.push(`          sessionDisplay = ${luaString(s.sessionDisplay)},`);
      lines.push(`          titleUpper = ${luaString(s.titleUpper)},`);
      lines.push(`          dateDisplay = ${luaString(s.dateDisplay)},`);
      lines.push(`          prevTotal = ${s.prevTotal},`);
      lines.push(`          gainTotal = ${s.gainTotal},`);
      lines.push(`          spendTotal = ${s.spendTotal},`);
      lines.push(`          newTotal = ${s.newTotal},`);
      lines.push(`          summation = ${luaString(s.summation)},`);
      lines.push(`          totalDisplay = ${luaString(s.totalDisplay)},`);
      lines.push("          gains = {");
      for (const g of s.gains) {
        lines.push(
          `            { amount = ${g.amount}, description = ${luaString(g.description)} },`
        );
      }
      lines.push("          },");
      lines.push("          spends = {");
      for (const sp of s.spends) {
        lines.push(
          `            { amount = ${sp.amount}, description = ${luaString(sp.description)} },`
        );
      }
      lines.push("          },");
      lines.push("        },");
    }
    lines.push("      },");
    lines.push("    },");
  }

  lines.push("  },");
  lines.push("}");
  lines.push("");
  lines.push("function BAKE.getPack()");
  lines.push("  return BAKE");
  lines.push("end");
  lines.push("");
  lines.push("return BAKE");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const opts = parseArgs(process.argv);
  const cfg = loadConfig();
  const saveName = opts.saveName || cfg.defaultSaveName;
  const savesDir = opts.savesDir || cfg.savesDir;

  let savePath;
  let saveFileName;
  if (opts.save) {
    savePath = path.resolve(opts.save);
    saveFileName = path.basename(savePath);
  } else {
    const resolved = resolveSavePath(saveName, savesDir);
    savePath = resolved.savePath;
    saveFileName = resolved.saveFileName;
  }

  if (!fs.existsSync(savePath)) {
    console.warn(`[bake_csheet_xp_log] Save not found: ${savePath}`);
    console.warn("[bake_csheet_xp_log] Writing empty bake pack (bakedForSessionNum=1).");
    const empty = emitLua({
      bakedForSessionNum: 1,
      bakeRevision: Date.now(),
      saveFileName: "",
      byCharKey: {},
    });
    fs.writeFileSync(outPath, empty, "utf8");
    return;
  }

  const saveRoot = JSON.parse(fs.readFileSync(savePath, "utf8"));
  const state = parseLuaScriptState(saveRoot);
  const liveSessionNum = Math.max(1, Math.floor(Number(state.sessionNum) || 1));
  const playerData = state.playerData && typeof state.playerData === "object" ? state.playerData : {};
  const steamToChar = loadSteamIdToCharKey();

  const byCharKey = {};
  for (const [pid, row] of Object.entries(playerData)) {
    if (!row || typeof row !== "object") continue;
    let charKey = typeof row.charKey === "string" && row.charKey ? row.charKey : null;
    if (!charKey) charKey = steamToChar[String(pid)] || null;
    if (!charKey) continue;
    const sessions = collectSessions(row.xp, liveSessionNum);
    byCharKey[charKey] = { sessions };
  }

  const pack = {
    bakedForSessionNum: liveSessionNum,
    bakeRevision: Date.now(),
    saveFileName,
    byCharKey,
  };

  fs.writeFileSync(outPath, emitLua(pack), "utf8");
  const charCount = Object.keys(byCharKey).length;
  console.log(
    `Wrote ${outPath} (session ${liveSessionNum}, ${charCount} PCs, from ${saveFileName}; live slot cap ${LIVE_SLOT_CAP})`
  );
}

main();
