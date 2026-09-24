"use strict";

/**
 * Bake Experience Log page 6 XML + thin Lua meta from the latest TTS save.
 *
 * - Templates: ui/.templates/csheet/page6.xml + partials/xp_*.xml
 * - Output XML: ui/player/csheets/page6_<charKey>.xml (per PC)
 * - Output meta: lib/csheet_xp_log_baked.ttslua (session nums / line counts only)
 *
 * Run from repo root: node .dev/scripts/bake_csheet_xp_log.js
 * Optional: --save <path> | --saveName <id>
 */

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("../../.tools/tts-save/resolve-save-path");
const { applyTemplate } = require("./lib/ui_xml_template_apply");
const {
  sessionDisplayForNum,
  sessionIdToken,
  sessionTitleUpper,
  formatShortDate,
  formatSummation,
  sessionLineCount,
  LIVE_SLOT_CAP,
  PAGE_LINE_BUDGET,
} = require("./xp_display");

const root = path.resolve(__dirname, "..", "..");
const metaOutPath = path.join(root, "lib", "csheet_xp_log_baked.ttslua");
const xmlOutDir = path.join(root, "ui", "player", "csheets");
const templateDir = path.join(root, "ui", ".templates", "csheet");
const configPath = path.join(root, "tts-assets.config.json");

const KNOWN_CHAR_KEYS = ["aishe", "blackCaesar", "fomorach", "lordLucien", "rashid"];

function readTemplate(relParts) {
  return fs.readFileSync(path.join(templateDir, ...relParts), "utf8");
}

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

function loadAllCharKeys() {
  const keys = new Set(KNOWN_CHAR_KEYS);
  const steamMap = loadSteamIdToCharKey();
  for (const ck of Object.values(steamMap)) {
    if (ck) keys.add(ck);
  }
  return [...keys].sort();
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
  const gainTotal = Math.floor(
    Number(block.gainTotal) || croppedGains.reduce((a, g) => a + g.amount, 0)
  );
  const spendTotal = Math.floor(
    Number(block.spendTotal) || croppedSpends.reduce((a, s) => a + s.amount, 0)
  );
  const newTotal = Math.floor(
    Number(block.newTotal) != null ? Number(block.newTotal) : prevTotal + gainTotal - spendTotal
  );
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
    lineCount: sessionLineCount(croppedGains.length, croppedSpends.length),
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

function firstPageActiveSet(finished) {
  const onPage = new Set();
  let used = 0;
  for (const s of finished) {
    let need = s.lineCount || sessionLineCount(s.gains.length, s.spends.length);
    if (need > PAGE_LINE_BUDGET) need = PAGE_LINE_BUDGET;
    if (used > 0 && used + need > PAGE_LINE_BUDGET) break;
    onPage.add(s.sessionNum);
    used += need;
  }
  return onPage;
}

function renderGainRows(token, gains, slotCount) {
  const tpl = readTemplate(["partials", "xp_gain_row.xml"]);
  const parts = [];
  for (let i = 1; i <= slotCount; i++) {
    const g = gains[i - 1];
    parts.push(
      applyTemplate(`xp_gain_row_${token}_${i}`, tpl, {
        TOKEN: token,
        INDEX: i,
        ACTIVE: g ? "true" : "false",
        NUM_TEXT: g ? `+${g.amount} XP` : "",
        DESC_TEXT: g ? g.description : "",
      })
    );
  }
  return parts.join("\n");
}

function renderSpendRows(token, spends, slotCount) {
  const tpl = readTemplate(["partials", "xp_spend_row.xml"]);
  const parts = [];
  for (let i = 1; i <= slotCount; i++) {
    const s = spends[i - 1];
    parts.push(
      applyTemplate(`xp_spend_row_${token}_${i}`, tpl, {
        TOKEN: token,
        INDEX: i,
        ACTIVE: s ? "true" : "false",
        NUM_TEXT: s ? `−${s.amount} XP` : "",
        DESC_TEXT: s ? s.description : "",
      })
    );
  }
  return parts.join("\n");
}

function renderLiveBlock(liveSessionNum) {
  const token = sessionIdToken(liveSessionNum);
  const tpl = readTemplate(["partials", "xp_live_session_block.xml"]);
  const empty = [];
  return applyTemplate(
    "xp_live_session_block",
    tpl,
    {
      TOKEN: token,
      TITLE_UPPER: sessionTitleUpper(null, liveSessionNum),
      GAIN_ROWS: renderGainRows(token, empty, LIVE_SLOT_CAP),
      SPEND_ROWS: renderSpendRows(token, empty, LIVE_SLOT_CAP),
    },
    { rawKeys: { GAIN_ROWS: true, SPEND_ROWS: true } }
  );
}

function renderFinishedBlock(session, active) {
  const token = sessionIdToken(session.sessionNum);
  const tpl = readTemplate(["partials", "xp_session_block.xml"]);
  return applyTemplate(
    `xp_session_block_${token}`,
    tpl,
    {
      TOKEN: token,
      ACTIVE: active ? "true" : "false",
      TITLE_UPPER: session.titleUpper,
      DATE_DISPLAY: session.dateDisplay,
      SUMMATION: session.summation,
      TOTAL_DISPLAY: session.totalDisplay,
      GAIN_ROWS: renderGainRows(token, session.gains, session.gains.length),
      SPEND_ROWS: renderSpendRows(token, session.spends, session.spends.length),
    },
    { rawKeys: { GAIN_ROWS: true, SPEND_ROWS: true } }
  );
}

function buildPage6Xml(liveSessionNum, finished) {
  const pageTpl = readTemplate(["page6.xml"]);
  const page1 = firstPageActiveSet(finished);
  const blocks = [renderLiveBlock(liveSessionNum)];
  for (const s of finished) {
    blocks.push(renderFinishedBlock(s, page1.has(s.sessionNum)));
  }
  return applyTemplate(
    "page6",
    pageTpl,
    { SESSION_BLOCKS: blocks.join("\n") },
    { rawKeys: { SESSION_BLOCKS: true } }
  );
}

function luaString(s) {
  return JSON.stringify(String(s ?? ""));
}

function emitMetaLua(pack) {
  const lines = [];
  lines.push("--[[");
  lines.push("  Thin XP page-6 bake meta (session nums / line counts for pagination).");
  lines.push("  Markup lives in ui/player/csheets/page6_<charKey>.xml");
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
      lines.push(`          lineCount = ${s.lineCount},`);
      lines.push(`          gainCount = ${s.gains.length},`);
      lines.push(`          spendCount = ${s.spends.length},`);
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

function writePageXml(charKey, xml) {
  const header =
    `<!-- GENERATED — do not edit by hand. npm run csheet-xp-log:bake → page6_${charKey}.xml -->\n`;
  const outPath = path.join(xmlOutDir, `page6_${charKey}.xml`);
  fs.writeFileSync(outPath, header + xml, "utf8");
  return outPath;
}

function main() {
  const opts = parseArgs(process.argv);
  const cfg = loadConfig();
  const saveName = opts.saveName || cfg.defaultSaveName;
  const savesDir = opts.savesDir || cfg.savesDir;
  const allCharKeys = loadAllCharKeys();

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

  let liveSessionNum = 1;
  /** @type {Record<string, { sessions: ReturnType<typeof collectSessions> }>} */
  const byCharKey = {};
  for (const ck of allCharKeys) {
    byCharKey[ck] = { sessions: [] };
  }

  if (!fs.existsSync(savePath)) {
    console.warn(`[bake_csheet_xp_log] Save not found: ${savePath}`);
    console.warn("[bake_csheet_xp_log] Writing empty page-6 XML + meta (bakedForSessionNum=1).");
  } else {
    const saveRoot = JSON.parse(fs.readFileSync(savePath, "utf8"));
    const state = parseLuaScriptState(saveRoot);
    liveSessionNum = Math.max(1, Math.floor(Number(state.sessionNum) || 1));
    const playerData =
      state.playerData && typeof state.playerData === "object" ? state.playerData : {};
    const steamToChar = loadSteamIdToCharKey();

    for (const [pid, row] of Object.entries(playerData)) {
      if (!row || typeof row !== "object") continue;
      let charKey = typeof row.charKey === "string" && row.charKey ? row.charKey : null;
      if (!charKey) charKey = steamToChar[String(pid)] || null;
      if (!charKey) continue;
      const sessions = collectSessions(row.xp, liveSessionNum);
      byCharKey[charKey] = { sessions };
    }
  }

  const pack = {
    bakedForSessionNum: liveSessionNum,
    bakeRevision: Date.now(),
    saveFileName: saveFileName || "",
    byCharKey,
  };

  fs.mkdirSync(xmlOutDir, { recursive: true });
  const writtenXml = [];
  for (const ck of Object.keys(byCharKey).sort()) {
    const xml = buildPage6Xml(liveSessionNum, byCharKey[ck].sessions);
    writtenXml.push(writePageXml(ck, xml));
  }

  // Shared stub Include target if something still points at page6.xml
  const stubXml = buildPage6Xml(liveSessionNum, []);
  fs.writeFileSync(
    path.join(xmlOutDir, "page6.xml"),
    `<!-- Fallback stub — prefer page6_<charKey>.xml via object stubs. -->\n${stubXml}`,
    "utf8"
  );

  fs.writeFileSync(metaOutPath, emitMetaLua(pack), "utf8");

  console.log(
    `Wrote ${writtenXml.length} page6_*.xml + ${metaOutPath} (session ${liveSessionNum}, from ${saveFileName || "(none)"}; live slot cap ${LIVE_SLOT_CAP})`
  );
}

main();
