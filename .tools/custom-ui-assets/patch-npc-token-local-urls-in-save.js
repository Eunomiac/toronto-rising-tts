#!/usr/bin/env node
"use strict";

// Replace file:///…/NPC Tokens/tokenFront_*|tokenBack_* on control-board tokens
// with Steam-hosted URLs from the custom-ui-assets upload pipeline.
//
// Prerequisite: npm run custom-ui-assets:extract-npc-token-urls
// (writes .dev/custom-ui-assets/npc-token-hosted-urls.json)
//
// Usage:
//   node .tools/custom-ui-assets/patch-npc-token-local-urls-in-save.js --dry-run
//   node .tools/custom-ui-assets/patch-npc-token-local-urls-in-save.js --save .dev/TS_Save_230.json

const fs = require("fs");
const path = require("path");

const LOCAL_NPC_TOKEN_PATH_RE = /file:\/\/\/[^"]*\/NPC Tokens\/token(Front|Back)_([A-Za-z0-9_]+)\.webp/i;
const GM_NOTES_PREFIX = "npcToken:";
const FRONT_NAME_RE = /^tokenFront_([A-Za-z0-9_]+)$/i;
const BACK_NAME_RE = /^tokenBack_([A-Za-z0-9_]+)$/i;

/**
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = "1";
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

/**
 * @param {string} filePath
 * @returns {unknown}
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isHostedSteamUrl(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /^https?:\/\/(?:cloud-\d+\.steamusercontent\.com|steamusercontent-a\.akamaihd\.net)\/ugc\//i.test(value);
}

/**
 * @param {string} url
 * @returns {boolean}
 */
function isLocalNpcTokenImageUrl(url) {
  return typeof url === "string" && LOCAL_NPC_TOKEN_PATH_RE.test(url);
}

/**
 * @param {string} url
 * @returns {string|null}
 */
function characterKeyFromLocalTokenUrl(url) {
  const match = LOCAL_NPC_TOKEN_PATH_RE.exec(url);
  if (!match) {
    return null;
  }
  return match[2];
}

/**
 * @param {unknown} obj
 * @returns {boolean}
 */
function objectHasNpcControlTokenTag(obj) {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  const tags = /** @type {Record<string, unknown>} */ (obj).Tags;
  if (!Array.isArray(tags)) {
    return false;
  }
  return tags.some((tag) => tag === "npc_control_token");
}

/**
 * @param {unknown} obj
 * @returns {string|null}
 */
function characterKeyFromGmNotes(obj) {
  if (!obj || typeof obj !== "object") {
    return null;
  }
  const notes = /** @type {Record<string, unknown>} */ (obj).GMNotes;
  if (typeof notes !== "string" || !notes.startsWith(GM_NOTES_PREFIX)) {
    return null;
  }
  const key = notes.slice(GM_NOTES_PREFIX.length).trim();
  return key !== "" ? key : null;
}

/**
 * @param {unknown} obj
 * @returns {string|null}
 */
function characterKeyFromNickname(obj) {
  if (!obj || typeof obj !== "object") {
    return null;
  }
  const nickname = /** @type {Record<string, unknown>} */ (obj).Nickname;
  if (typeof nickname !== "string" || nickname.trim() === "") {
    return null;
  }
  return nickname.trim();
}

/**
 * Load paired front/back URLs keyed by characterKey.
 * @param {string} hostedJsonPath
 * @param {string} generatedAssetsPath
 * @param {string} savePath
 * @returns {Record<string, { front: string; back: string }>}
 */
function loadHostedPairsByCharacterKey(hostedJsonPath, generatedAssetsPath, savePath) {
  if (fs.existsSync(hostedJsonPath)) {
    const raw = readJson(hostedJsonPath);
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const byKey = /** @type {Record<string, unknown>} */ (raw).byCharacterKey;
      if (byKey && typeof byKey === "object" && !Array.isArray(byKey)) {
        /** @type {Record<string, { front: string; back: string }>} */
        const out = {};
        for (const [key, row] of Object.entries(/** @type {Record<string, unknown>} */ (byKey))) {
          if (!row || typeof row !== "object") {
            continue;
          }
          const rec = /** @type {Record<string, unknown>} */ (row);
          if (isHostedSteamUrl(rec.front) && isHostedSteamUrl(rec.back)) {
            out[key] = { front: rec.front, back: rec.back };
          }
        }
        if (Object.keys(out).length > 0) {
          return out;
        }
      }
    }
  }

  /** @type {Map<string, string>} */
  const nameToUrl = new Map();

  const mergeFromGenerated = (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) {
      return;
    }
    const raw = readJson(filePath);
    if (!Array.isArray(raw)) {
      return;
    }
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const name = entry.Name;
      const url = entry.URL;
      if (
        typeof name === "string"
        && (FRONT_NAME_RE.test(name) || BACK_NAME_RE.test(name))
        && isHostedSteamUrl(url)
      ) {
        nameToUrl.set(name, url);
      }
    }
  };

  mergeFromGenerated(generatedAssetsPath);
  mergeFromGenerated(path.resolve(".dev/custom-ui-assets/generated-assets.json"));

  if (nameToUrl.size === 0 && fs.existsSync(savePath)) {
    const saveRoot = readJson(savePath);
    if (saveRoot && typeof saveRoot === "object" && !Array.isArray(saveRoot)) {
      const root = /** @type {Record<string, unknown>} */ (saveRoot);
      const assets = Array.isArray(root.CustomUIAssets)
        ? root.CustomUIAssets
        : Array.isArray(root.CustomAssets)
          ? root.CustomAssets
          : [];
      for (const entry of assets) {
        if (!entry || typeof entry !== "object") {
          continue;
        }
        const row = /** @type {Record<string, unknown>} */ (entry);
        if (typeof row.Name === "string" && isHostedSteamUrl(row.URL)) {
          nameToUrl.set(row.Name, row.URL);
        }
      }
    }
  }

  /** @type {Record<string, { front: string; back: string }>} */
  const paired = {};
  for (const [name, url] of nameToUrl.entries()) {
    const frontMatch = FRONT_NAME_RE.exec(name);
    if (frontMatch) {
      const key = frontMatch[1];
      paired[key] = paired[key] || { front: "", back: "" };
      paired[key].front = url;
      continue;
    }
    const backMatch = BACK_NAME_RE.exec(name);
    if (backMatch) {
      const key = backMatch[1];
      paired[key] = paired[key] || { front: "", back: "" };
      paired[key].back = url;
    }
  }

  /** @type {Record<string, { front: string; back: string }>} */
  const complete = {};
  for (const [key, row] of Object.entries(paired)) {
    if (isHostedSteamUrl(row.front) && isHostedSteamUrl(row.back)) {
      complete[key] = { front: row.front, back: row.back };
    }
  }
  return complete;
}

/**
 * @param {unknown} node
 * @param {Record<string, { front: string; back: string }>} hostedByKey
 * @param {boolean} requireControlTokenTag
 * @param {{
 *   scanned: number;
 *   patched: number;
 *   alreadyHosted: number;
 *   missingHosted: string[];
 *   details: string[];
 * }} acc
 */
function walkAndPatch(node, hostedByKey, requireControlTokenTag, acc) {
  if (node === null || node === undefined) {
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      walkAndPatch(node[i], hostedByKey, requireControlTokenTag, acc);
    }
    return;
  }
  if (typeof node !== "object") {
    return;
  }

  const obj = /** @type {Record<string, unknown>} */ (node);
  const customImage = obj.CustomImage;
  if (customImage && typeof customImage === "object" && !Array.isArray(customImage)) {
    const img = /** @type {Record<string, unknown>} */ (customImage);
    const imageUrl = img.ImageURL;
    const imageSecondary = img.ImageSecondaryURL;
    const hasLocalFront = isLocalNpcTokenImageUrl(imageUrl);
    const hasLocalBack = isLocalNpcTokenImageUrl(imageSecondary);
    if (hasLocalFront || hasLocalBack) {
      const isControlToken = objectHasNpcControlTokenTag(obj)
        || characterKeyFromGmNotes(obj) !== null;
      if (!requireControlTokenTag || isControlToken) {
        acc.scanned += 1;
        let characterKey = characterKeyFromGmNotes(obj);
        if (!characterKey) {
          characterKey = characterKeyFromLocalTokenUrl(
            typeof imageUrl === "string" ? imageUrl : typeof imageSecondary === "string" ? imageSecondary : "",
          );
        }
        if (!characterKey) {
          characterKey = characterKeyFromNickname(obj);
        }
        const guid = typeof obj.GUID === "string" ? obj.GUID : "?";
        const hosted = characterKey ? hostedByKey[characterKey] : undefined;
        if (!characterKey || !hosted) {
          acc.missingHosted.push(`${guid} (${String(characterKey || "unknown")})`);
        } else if (
          imageUrl === hosted.front
          && imageSecondary === hosted.back
        ) {
          acc.alreadyHosted += 1;
        } else {
          img.ImageURL = hosted.front;
          img.ImageSecondaryURL = hosted.back;
          acc.patched += 1;
          acc.details.push(`${characterKey} :: ${guid}`);
        }
      }
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key === "LuaScript") {
      continue;
    }
    walkAndPatch(value, hostedByKey, requireControlTokenTag, acc);
  }
}

/**
 * @param {string} savePath
 * @param {{ patched: number; details: string[]; missingHosted: string[] }} summary
 */
function printReloadAlert(savePath, summary) {
  const border = "================================================================================";
  console.log("");
  console.log(border);
  console.log("  SAVE FILE UPDATED — RELOAD REQUIRED IN TABLETOP SIMULATOR");
  console.log(border);
  console.log("");
  console.log(`  Patched NPC control token CustomImage URLs in:`);
  console.log(`  ${savePath}`);
  console.log("");
  console.log(`  Tokens updated: ${summary.patched}`);
  if (summary.details.length > 0) {
    console.log("");
    console.log("  Updated character keys:");
    for (const line of summary.details) {
      console.log(`    ${line}`);
    }
  }
  if (summary.missingHosted.length > 0) {
    console.log("");
    console.log("  WARNING — local token(s) with no hosted pair (skipped):");
    for (const line of summary.missingHosted) {
      console.log(`    ${line}`);
    }
  }
  console.log("");
  console.log("  >>> Reload this save in TTS (File → Load) so token images update.");
  console.log("");
  console.log(border);
  console.log("");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args["dry-run"] === "1" || args.dryRun === "1";
  const savePath = path.resolve(args.save || ".dev/TS_Save_230.json");
  const hostedJsonPath = path.resolve(
    args.urls || ".dev/custom-ui-assets/npc-token-hosted-urls.json",
  );
  const generatedAssetsPath = path.resolve(
    args.generatedAssets || ".dev/custom-ui-assets/npc-generated-assets.json",
  );
  const requireControlTokenTag = args.allCustomTiles !== "1";

  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file does not exist: ${savePath}`);
  }

  const hostedByKey = loadHostedPairsByCharacterKey(
    hostedJsonPath,
    generatedAssetsPath,
    savePath,
  );
  const hostedCount = Object.keys(hostedByKey).length;
  if (hostedCount === 0) {
    throw new Error(
      "No hosted NPC token URL pairs found. Run:\n"
        + "  npm run custom-ui-assets:extract-npc-token-urls\n"
        + `Expected: ${hostedJsonPath}`,
    );
  }

  const saveRootRaw = readJson(savePath);
  if (saveRootRaw === null || typeof saveRootRaw !== "object" || Array.isArray(saveRootRaw)) {
    throw new Error("Save root must be an object.");
  }
  const saveRoot = /** @type {Record<string, unknown>} */ (saveRootRaw);

  const acc = {
    scanned: 0,
    patched: 0,
    alreadyHosted: 0,
    missingHosted: /** @type {string[]} */ ([]),
    details: /** @type {string[]} */ ([]),
  };

  walkAndPatch(saveRoot.ObjectStates, hostedByKey, requireControlTokenTag, acc);

  console.log(`Hosted character pairs loaded: ${hostedCount}`);
  console.log(`Local NPC token CustomImage objects scanned: ${acc.scanned}`);
  console.log(`Would patch / patched: ${acc.patched}`);
  console.log(`Already hosted (unchanged): ${acc.alreadyHosted}`);
  if (acc.missingHosted.length > 0) {
    console.log(`Missing hosted mapping: ${acc.missingHosted.length}`);
    for (const line of acc.missingHosted.slice(0, 15)) {
      console.log(`  - ${line}`);
    }
    if (acc.missingHosted.length > 15) {
      console.log(`  ... and ${acc.missingHosted.length - 15} more`);
    }
  }

  if (acc.patched === 0) {
    if (acc.missingHosted.length > 0) {
      process.exitCode = 2;
    }
    return;
  }

  if (dryRun) {
    console.log("");
    console.log("Dry run — save file not written. Re-run without --dry-run to apply.");
    return;
  }

  fs.writeFileSync(savePath, `${JSON.stringify(saveRoot, null, 2)}\n`, "utf8");
  printReloadAlert(savePath, {
    patched: acc.patched,
    details: acc.details,
    missingHosted: acc.missingHosted,
  });
}

main();
