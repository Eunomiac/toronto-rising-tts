"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { REVIEW_WIDTH } = require("./review-sheet-rows.js");

const ENV_PATH = path.resolve(__dirname, "../../.dev/storyteller-dashboard/.env");

function parseEnv(text) {
  const values = {};
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return values;
}

function loadWriteSettings(envText = null) {
  const urlFromEnv = process.env.ASSET_REVIEW_WRITE_URL?.trim() ?? "";
  const secretFromEnv = process.env.ASSET_REVIEW_WRITE_SECRET?.trim() ?? "";
  if (urlFromEnv && secretFromEnv) return { url: urlFromEnv, secret: secretFromEnv };
  const text = envText ?? (fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "");
  const file = parseEnv(text);
  return {
    url: urlFromEnv || file.ASSET_REVIEW_WRITE_URL || "",
    secret: secretFromEnv || file.ASSET_REVIEW_WRITE_SECRET || "",
  };
}

async function appendReviewRows(rows, { dryRun = false, fetchImpl = fetch, envText = null } = {}) {
  if (!Array.isArray(rows) || rows.some((row) => !Array.isArray(row) || row.length !== REVIEW_WIDTH)) {
    throw new Error(`Each review row must be ${REVIEW_WIDTH} cells.`);
  }
  const settings = loadWriteSettings(envText);
  if (!settings.url && !settings.secret) return { configured: false, appended: 0, startRow: null };
  if (!settings.url.startsWith("https://script.google.com/") || !settings.secret) {
    throw new Error("Set ASSET_REVIEW_WRITE_URL (https://script.google.com/…/exec) and ASSET_REVIEW_WRITE_SECRET in .dev/storyteller-dashboard/.env.");
  }
  const response = await fetchImpl(settings.url, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: settings.secret, action: "append", dryRun, integrated: rows }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Asset review sheet write failed: HTTP ${response.status}.`);
  let reply;
  try {
    reply = JSON.parse(text);
  } catch {
    throw new Error("Asset review sheet write returned a web page instead of JSON. Deploy the web app as Anyone and use the /exec URL.");
  }
  if (reply?.ok === false) throw new Error(`Asset review sheet write: ${reply.error}`);
  if (!reply || reply.appended !== rows.length) throw new Error("Asset review sheet write did not confirm every row.");
  return { configured: true, appended: reply.appended, startRow: reply.startRow };
}

module.exports = { loadWriteSettings, appendReviewRows };
