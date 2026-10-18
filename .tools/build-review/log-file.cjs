"use strict";

const fs = require("fs");
const path = require("path");
const { sanitize } = require("./classify.cjs");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_LOG = path.join(REPO_ROOT, ".dev", "build-logs", "full-build-review.txt");

function reviewLogPath() {
  const override = process.env.TORONTO_RISING_BUILD_REVIEW_LOG;
  if (typeof override === "string" && override.trim() !== "") return path.resolve(override);
  return DEFAULT_LOG;
}

function scratchPath() {
  return `${reviewLogPath()}.partial`;
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
  ].join("\n");
}

/** Drop any notes left by a build that did not finish publishing. */
function beginReview() {
  const scratch = scratchPath();
  if (fs.existsSync(scratch)) fs.rmSync(scratch);
}

/**
 * Keep one note for this build. The review file itself is not touched until publishReview.
 * @param {string} text
 */
function appendEntry(text) {
  const body = sanitize(text);
  if (body === "") return;
  const file = scratchPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(body)}\n`, "utf8");
}

/**
 * @returns {string[]}
 */
function readEntries() {
  const file = scratchPath();
  if (!fs.existsSync(file)) return [];
  const entries = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    try {
      const body = sanitize(JSON.parse(line));
      if (body !== "") entries.push(body);
    } catch {
      const body = sanitize(line);
      if (body !== "") entries.push(body);
    }
  }
  return entries;
}

/**
 * Replace the review file with this build's notes. A build with nothing to flag removes the previous file.
 * @returns {number}
 */
function publishReview() {
  const entries = readEntries();
  const finalPath = reviewLogPath();
  const scratch = scratchPath();
  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  if (entries.length === 0) {
    if (fs.existsSync(finalPath)) fs.rmSync(finalPath);
  } else {
    fs.writeFileSync(finalPath, `${headerText()}\n\n${entries.join("\n\n")}\n`, "utf8");
  }
  if (fs.existsSync(scratch)) fs.rmSync(scratch);
  return entries.length;
}

module.exports = {
  REPO_ROOT,
  DEFAULT_LOG,
  reviewLogPath,
  scratchPath,
  beginReview,
  appendEntry,
  readEntries,
  publishReview,
};
