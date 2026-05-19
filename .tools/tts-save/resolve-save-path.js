#!/usr/bin/env node
"use strict";

// Agent guidance: .dev/TTS_BUNDLING_SETUP.md (save JSON inject).

const fs = require("fs");
const os = require("os");
const path = require("path");

/** Default TTS Saves folder on this machine (OneDrive Documents layout). */
const DEFAULT_SAVES_DIR = "D:/OneDrive/Documents/My Games/Tabletop Simulator/Saves";

/**
 * Normalize user-entered save identifier into TS save JSON filename.
 * Accepts examples: "123", "TS_Save_123", "TS_Save_123.json"
 * @param {string} raw
 * @returns {string}
 */
function toSaveFileName(raw) {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error("Save name input is empty.");
  }

  let name = trimmed;
  if (!/^TS_Save_/i.test(name)) {
    name = `TS_Save_${name}`;
  }
  if (!/\.json$/i.test(name)) {
    name = `${name}.json`;
  }
  return name;
}

/**
 * Resolve the Saves directory: CLI override, env, then repo default, then standard Documents path.
 * @param {string | undefined} savesDirArg
 * @returns {string}
 */
function resolveSavesDirectory(savesDirArg) {
  if (savesDirArg && savesDirArg.trim().length > 0) {
    return path.resolve(savesDirArg.trim());
  }

  const fromEnv = process.env.TTS_SAVES_DIR;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return path.resolve(fromEnv.trim());
  }

  if (fs.existsSync(DEFAULT_SAVES_DIR)) {
    return DEFAULT_SAVES_DIR;
  }

  const documentsFallback = path.join(
    os.homedir(),
    "Documents",
    "My Games",
    "Tabletop Simulator",
    "Saves"
  );
  return documentsFallback;
}

/**
 * Resolve full path to a TTS save JSON file from save id or filename.
 * @param {string} saveInput
 * @param {string | undefined} savesDirArg
 * @returns {{ savesDir: string, saveFileName: string, savePath: string }}
 */
function resolveSavePath(saveInput, savesDirArg) {
  const savesDir = resolveSavesDirectory(savesDirArg);
  const saveFileName = toSaveFileName(saveInput);
  const savePath = path.join(savesDir, saveFileName);
  return { savesDir, saveFileName, savePath };
}

module.exports = {
  DEFAULT_SAVES_DIR,
  toSaveFileName,
  resolveSavesDirectory,
  resolveSavePath,
};
