"use strict";

const fs = require("node:fs");
const { parseCsv } = require("../../.dev/scripts/lib/skyboxes_sheet_csv.js");
const { readDecisions } = require("./session-start-assets.js");

// Static review area only. The dynamic inventory on the left is not reviewed data.
const REVIEW_URL = "https://docs.google.com/spreadsheets/d/1lldquR2mq6_a2F8yJ5ygwPylzHJ5MOVYTUJ7y-rG26U/export?format=csv&gid=1457924209&range=AA:BF";

function validateReview(snapshot) {
  if (snapshot.version !== 1 || snapshot.source !== REVIEW_URL ||
      !Number.isFinite(Date.parse(snapshot.fetchedAt)) || typeof snapshot.csv !== "string") {
    throw new Error("Invalid session-start review snapshot. Start a new FULL build.");
  }
  if (/^\s*<(?:!doctype|html)/i.test(snapshot.csv)) {
    throw new Error("Integrated assets returned a login page instead of CSV. Enable Anyone with the link — Viewer on the review sheet.");
  }
  const rows = parseCsv(snapshot.csv);
  for (const header of ["URL", "Known bytes", "Manual decision", "Manual notes"]) {
    if (rows[0]?.filter(cell => cell === header).length !== 1) {
      throw new Error(`Integrated assets static review must contain exactly one ${header} column.`);
    }
  }
  for (const [i, row] of rows.entries()) {
    for (const cell of row) {
      if (/^#(?:REF!|N\/A|VALUE!|ERROR!|DIV\/0!|NAME\?|NUM!|SPILL!)/.test(cell.trim())) {
        throw new Error(`Integrated assets contains a formula error at row ${i + 1}: ${cell}`);
      }
    }
  }
  return { snapshot, decisions: readDecisions(snapshot.csv) };
}

async function fetchReview(fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(REVIEW_URL, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(45000) });
  } catch (error) {
    throw new Error(`Could not download Integrated assets from Google Sheets: ${error.message}`, { cause: error });
  }
  if (!response.ok) {
    const access = [401, 403].includes(response.status)
      ? " Enable Anyone with the link — Viewer on the review sheet." : "";
    throw new Error(`Could not download Integrated assets: HTTP ${response.status}.${access}`);
  }
  const snapshot = { version: 1, source: REVIEW_URL, fetchedAt: new Date().toISOString(), csv: await response.text() };
  return validateReview(snapshot);
}

async function loadReview({ decisionsFile, snapshotFile, preflight = false }, fetchImpl = fetch) {
  if (decisionsFile) {
    return { decisions: readDecisions(fs.readFileSync(decisionsFile, "utf8")), source: decisionsFile, fetchedAt: null };
  }
  let review;
  if (snapshotFile && !preflight) {
    // This file belongs to this FULL invocation. A missing/invalid snapshot is an error.
    review = validateReview(JSON.parse(fs.readFileSync(snapshotFile, "utf8")));
  } else {
    review = await fetchReview(fetchImpl);
    if (snapshotFile) fs.writeFileSync(snapshotFile, JSON.stringify(review.snapshot), { flag: "wx" });
  }
  return { decisions: review.decisions, source: review.snapshot.source, fetchedAt: review.snapshot.fetchedAt };
}

module.exports = { REVIEW_URL, fetchReview, loadReview };
