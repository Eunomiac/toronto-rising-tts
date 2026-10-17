"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_LOG = path.join(REPO_ROOT, ".dev", "build-logs", "full-build-review.txt");

function reviewLogPath() {
  const override = process.env.TORONTO_RISING_BUILD_REVIEW_LOG;
  if (typeof override === "string" && override.trim() !== "") return path.resolve(override);
  return DEFAULT_LOG;
}

function headerText() {
  const when = new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return [
    `Full build review — ${when}`,
    "",
    "These are the warnings, errors, and other notes worth reading from this Full build.",
    "Routine progress stayed in the terminal.",
    "",
  ].join("\n");
}

/**
 * @param {string} text
 */
function appendEntry(text) {
  const body = String(text).trim();
  if (body === "") return;
  const file = reviewLogPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fresh = !fs.existsSync(file) || fs.statSync(file).size === 0;
  if (fresh) fs.writeFileSync(file, headerText(), "utf8");
  fs.appendFileSync(file, `---\n${body}\n\n`, "utf8");
}

/**
 * @param {string} text
 * @returns {number}
 */
function countEntries(text) {
  return (String(text).match(/^---$/gm) || []).length;
}

module.exports = {
  REPO_ROOT,
  DEFAULT_LOG,
  reviewLogPath,
  appendEntry,
  countEntries,
};
