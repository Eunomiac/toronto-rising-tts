/**
 * Toronto Rising — NPC stat write-back for the Storyteller Dashboard.
 *
 * Bound to the Toronto Rising sheet (Extensions → Apps Script) and deployed as a web app. The dashboard's build
 * POSTs stat edits here; this script writes them into the CHARACTERS tab. Only the stat columns in WRITABLE can be
 * written, and only for rows whose API key already exists.
 *
 * Setup: Project Settings → Script properties → SECRET = the NPC_SHEET_WRITE_SECRET value in
 * .dev/storyteller-dashboard/.env. Source: .dev/storyteller-dashboard/scripts/npc-stats/apps-script/Code.gs.
 *
 * Request body (JSON):
 *   { "secret": "…", "action": "ping" }
 *   { "secret": "…", "action": "write", "dryRun": false,
 *     "rows": [ { "key": "<API key>", "cells": { "<header>": "<value>" | <number> } } ] }
 * Reply (JSON): { "ok": true, … } or { "ok": false, "error": "…" }.
 */

var TAB = "CHARACTERS";
var KEY_HEADER = "API key";
var WRITABLE = [
  "Type", "Clan", "Generation", "Rank", "Blood Potency", "Humanity", "Difficulty", "Health", "Willpower",
  "Phy", "Soc", "Men", "Pow", "Exceptional Pools", "Attacks", "Powers", "Ancilla Power(s)"
];

function doGet() {
  return reply({ ok: false, error: "POST only." });
}

function doPost(e) {
  try {
    var body = JSON.parse(e && e.postData ? e.postData.contents : "{}");
    var secret = PropertiesService.getScriptProperties().getProperty("SECRET");
    if (!secret) {
      return reply({ ok: false, error: "The SECRET script property is not set." });
    }
    if (body.secret !== secret) {
      return reply({ ok: false, error: "Wrong secret." });
    }
    if (body.action === "ping") {
      return reply(ping());
    }
    if (body.action === "write") {
      var lock = LockService.getDocumentLock();
      lock.waitLock(30000);
      try {
        return reply(write(body.rows || [], body.dryRun === true));
      } finally {
        lock.releaseLock();
      }
    }
    return reply({ ok: false, error: "Unknown action: " + body.action });
  } catch (error) {
    return reply({ ok: false, error: String(error && error.stack ? error.stack : error) });
  }
}

function reply(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function headerName(cell) {
  return String(cell).replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** The tab, its column numbers (1-based) for KEY_HEADER and WRITABLE, and each API key's row number. */
function layout() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(TAB);
  if (!sheet) {
    throw new Error("No tab named " + TAB);
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(headerName);
  var columns = {};
  var missing = [];
  [KEY_HEADER].concat(WRITABLE).forEach(function (label) {
    var index = headers.indexOf(label.toLowerCase());
    if (index < 0) {
      missing.push(label);
    } else {
      columns[label] = index + 1;
    }
  });
  var rows = {};
  if (columns[KEY_HEADER] && sheet.getLastRow() > 1) {
    sheet.getRange(2, columns[KEY_HEADER], sheet.getLastRow() - 1, 1).getValues().forEach(function (cells, offset) {
      var key = String(cells[0]).trim();
      if (key !== "" && !(key in rows)) {
        rows[key] = offset + 2;
      }
    });
  }
  return { sheet: sheet, columns: columns, missing: missing, rows: rows };
}

function ping() {
  var found = layout();
  return {
    ok: found.missing.length === 0,
    tab: TAB,
    keys: Object.keys(found.rows).length,
    missingHeaders: found.missing
  };
}

function write(updates, dryRun) {
  var found = layout();
  if (found.missing.length > 0) {
    throw new Error("Missing header(s): " + found.missing.join(", "));
  }
  var problems = [];
  updates.forEach(function (update) {
    if (!(update.key in found.rows)) {
      problems.push("No row with API key " + update.key);
    }
    Object.keys(update.cells || {}).forEach(function (label) {
      if (WRITABLE.indexOf(label) < 0) {
        problems.push(update.key + ": " + label + " is not a writable column");
      }
      var value = update.cells[label];
      if (typeof value !== "string" && typeof value !== "number") {
        problems.push(update.key + ": " + label + " must be text or a number");
      }
    });
  });
  if (problems.length > 0) {
    throw new Error(problems.join("; "));
  }

  var changes = [];
  updates.forEach(function (update) {
    var row = found.rows[update.key];
    Object.keys(update.cells).forEach(function (label) {
      var range = found.sheet.getRange(row, found.columns[label]);
      var before = range.getValue();
      var after = update.cells[label];
      if (String(before) === String(after)) {
        return;
      }
      changes.push({ key: update.key, column: label, before: before, after: after });
      if (!dryRun) {
        if (typeof after === "string") {
          range.setNumberFormat("@");
        }
        range.setValue(after);
      }
    });
  });
  return { ok: true, dryRun: dryRun, changes: changes };
}
