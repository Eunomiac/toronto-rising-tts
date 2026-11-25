"use strict";

const { ugcMatchKey } = require("./cloud_index.js");

const SAME_FILE_REASONS = new Set(["replaced locally", "superseded Cloud version"]);

/**
 * Same-filename replacements whose current Cloud link is already in the ledger.
 * `replaced locally` is the first sync after the file changes. `superseded Cloud version`
 * is an older upload that remained after the ledger moved on.
 *
 * @param {{ relPath: string, reason: string, row?: { url?: string } }[]} deleteCandidates
 * @param {Record<string, { url?: string }>} ledgerFiles
 * @returns {{ relPath: string, oldKey: string, newUrl: string }[]}
 */
function buildSupersededRetargets(deleteCandidates, ledgerFiles) {
  /** @type {Map<string, { relPath: string, oldKey: string, newUrl: string }>} */
  const byOld = new Map();
  const retargets = [];
  for (const candidate of deleteCandidates) {
    if (!SAME_FILE_REASONS.has(candidate.reason)) continue;
    const current = ledgerFiles[candidate.relPath];
    const newUrl = current && current.url;
    const oldKey = ugcMatchKey(candidate.row && candidate.row.url);
    const newKey = ugcMatchKey(newUrl);
    if (!oldKey || !newKey || oldKey === newKey) continue;
    const previous = byOld.get(oldKey);
    if (previous) {
      if (previous.newUrl !== newUrl) {
        throw new Error(`Cloud file ${oldKey} would be retargeted to two different links.`);
      }
      continue;
    }
    const item = { relPath: candidate.relPath, oldKey, newUrl };
    byOld.set(oldKey, item);
    retargets.push(item);
  }
  return retargets;
}

/**
 * Point every saved link at the current upload of a replaced file.
 * Matches `ugc/<handle>/<SHA1>` so a different Steam hostname still counts.
 * Mutates `root`.
 *
 * @param {Record<string, any>} root
 * @param {{ relPath: string, oldKey: string, newUrl: string }[]} retargets
 * @returns {{ relPath: string, count: number }[]}
 */
function retargetSaveUrls(root, retargets) {
  const byOld = new Map(retargets.map((item) => [item.oldKey, item]));
  /** @type {Map<string, number>} */
  const counts = new Map();
  const replaceText = (text) => {
    if (!text.includes("ugc/")) return text;
    return text.replace(
      /https?:\/\/[^\s"'<>\\]+?\/ugc\/(\d+)\/([0-9A-Fa-f]{40})\/?/g,
      (match, handle, sha) => {
        const item = byOld.get(`${handle}/${sha.toUpperCase()}`);
        if (!item) return match;
        counts.set(item.relPath, (counts.get(item.relPath) || 0) + 1);
        return item.newUrl;
      },
    );
  };
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        if (typeof value[i] === "string") value[i] = replaceText(value[i]);
        else if (value[i] && typeof value[i] === "object") visit(value[i]);
      }
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const key of Object.keys(value)) {
      const child = value[key];
      if (typeof child === "string") value[key] = replaceText(child);
      else if (child && typeof child === "object") visit(child);
    }
  };
  visit(root);
  const seen = new Set();
  const files = [];
  for (const item of retargets) {
    if (seen.has(item.relPath)) continue;
    seen.add(item.relPath);
    files.push({ relPath: item.relPath, count: counts.get(item.relPath) || 0 });
  }
  return files;
}

module.exports = { buildSupersededRetargets, retargetSaveUrls };
