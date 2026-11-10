"use strict";

const path = require("node:path");
const { parseCsv } = require("../../.dev/scripts/lib/skyboxes_sheet_csv.js");
const { ugcMatchKey } = require("../tts-cloud/lib/cloud_index.js");

const REVIEW_WIDTH = 35;
const keyOf = (url) => ugcMatchKey(url) ?? url;

function staticUrlKeys(csv) {
  const [headers, ...rows] = parseCsv(String(csv).replace(/^\uFEFF/, ""));
  const decisionColumn = headers?.indexOf("Manual decision") ?? -1;
  const urlColumn = headers?.slice(0, decisionColumn).lastIndexOf("URL") ?? -1;
  if (decisionColumn < 0 || urlColumn < 0) throw new Error("Expected the Integrated assets CSV with URL and Manual decision columns.");
  const keys = new Set();
  for (const row of rows) {
    const url = row[urlColumn]?.trim();
    if (url) keys.add(keyOf(url));
  }
  return keys;
}

function selectPendingReviewRows(inventoryRows, csv, skipKeys = []) {
  const seen = staticUrlKeys(csv);
  for (const key of skipKeys) if (key) seen.add(key);
  return inventoryRows.filter((row) => {
    const url = String(row[0] ?? "").trim();
    return url !== "" && !seen.has(keyOf(url));
  }).sort((a, b) => (Number(b[8]) || 0) - (Number(a[8]) || 0) || String(a[0]).localeCompare(String(b[0])));
}

function assetType(file) {
  switch (path.extname(file).toLowerCase()) {
    case ".webp":
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".gif":
      return "Image";
    case ".unity3d":
      return "Asset bundle";
    case ".mp3":
    case ".ogg":
    case ".wav":
      return "Audio";
    case ".obj":
    case ".fbx":
      return "Model";
    default:
      return "";
  }
}

function labelFor(row) {
  const mirrors = String(row[12] ?? "").split(" | ").map((item) => item.trim()).filter(Boolean);
  if (mirrors.length === 1) return mirrors[0].replaceAll("/", "\\");
  if (mirrors.length > 1) return mirrors.map((item) => item.replaceAll("/", "\\")).join(" | ");
  return String(row[15] || row[16] || "").split(" | ")[0] || "";
}

/** One Integrated assets static row, columns AA:BI. Manual decision is left blank. */
function buildReviewRow(inventoryRow) {
  if (!Array.isArray(inventoryRow) || inventoryRow.length < 22) throw new Error("An inventory row needs the join-assets columns.");
  const cells = inventoryRow.slice(0, 22).map((value) => value == null ? "" : String(value));
  const label = labelFor(inventoryRow);
  const file = String(inventoryRow[12] ?? "").split(" | ").find((item) => item.trim()) ?? label;
  cells.push(
    file ? path.posix.basename(file.replaceAll("\\", "/")) : label,
    assetType(file),
    "",
    "",
    label,
    "",
    label,
    "",
    "",
    "",
    "Current",
    "Needs a decision.",
    "",
  );
  if (cells.length !== REVIEW_WIDTH) throw new Error(`Review row has ${cells.length} cells; Integrated assets AA:BI is ${REVIEW_WIDTH}.`);
  return cells;
}

module.exports = { REVIEW_WIDTH, staticUrlKeys, selectPendingReviewRows, buildReviewRow };
