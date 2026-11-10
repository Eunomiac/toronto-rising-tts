/**
 * Toronto Rising — append asset-review rows that still need a decision.
 *
 * Bound to the asset review workbook (Extensions → Apps Script) and deployed as a web app
 * (Execute as: Me; Who has access: Anyone). FULL posts new Integrated assets rows here.
 *
 * Setup: Project Settings → Script properties → SECRET = ASSET_REVIEW_WRITE_SECRET in
 * .dev/storyteller-dashboard/.env. The web app URL goes in that file as ASSET_REVIEW_WRITE_URL.
 *
 * Request body (JSON):
 *   { "secret": "…", "action": "ping" }
 *   { "secret": "…", "action": "append", "dryRun": false, "integrated": [ [ "url", … ] ] }
 * Each integrated row is 35 cells, written at the next empty URL in columns AA:BI.
 * Existing cells are never overwritten.
 */

var TAB = "Integrated assets";
var START_COLUMN = 27; // AA
var WIDTH = 35; // AA:BI

function doGet() {
  return reply({ ok: false, error: "POST only." });
}

function doPost(e) {
  try {
    var body = JSON.parse(e && e.postData ? e.postData.contents : "{}");
    var secret = PropertiesService.getScriptProperties().getProperty("SECRET");
    if (!secret) return reply({ ok: false, error: "The SECRET script property is not set." });
    if (body.secret !== secret) return reply({ ok: false, error: "Wrong secret." });
    if (body.action === "ping") return reply(ping());
    if (body.action === "append") {
      var lock = LockService.getDocumentLock();
      lock.waitLock(30000);
      try {
        return reply(appendIntegrated(body.integrated || [], body.dryRun === true));
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

function ping() {
  var sheet = sheetByName();
  return { ok: true, tab: TAB, lastUrlRow: lastFilledRow(sheet) };
}

function appendIntegrated(rows, dryRun) {
  if (!Array.isArray(rows)) throw new Error("integrated must be a list of rows.");
  rows.forEach(function (row, index) {
    if (!Array.isArray(row) || row.length !== WIDTH || !String(row[0] || "").trim()) {
      throw new Error("Row " + (index + 1) + " must contain " + WIDTH + " cells and a URL.");
    }
  });
  var sheet = sheetByName();
  var start = lastFilledRow(sheet) + 1;
  if (!rows.length) return { ok: true, dryRun: dryRun, appended: 0, startRow: start };
  if (!dryRun) {
    var needed = start + rows.length - 1;
    if (needed > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), needed - sheet.getMaxRows());
    var target = sheet.getRange(start, START_COLUMN, rows.length, WIDTH);
    var existing = target.getValues();
    existing.forEach(function (row, index) {
      row.forEach(function (cell) {
        if (String(cell || "").trim()) throw new Error("Refusing to overwrite " + TAB + " row " + (start + index) + ".");
      });
    });
    target.setNumberFormat("@");
    target.setValues(rows.map(function (row) {
      return row.map(function (cell) { return cell == null ? "" : String(cell); });
    }));
  }
  return { ok: true, dryRun: dryRun, appended: rows.length, startRow: start };
}

function sheetByName() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(TAB);
  if (!sheet) throw new Error("No tab named " + TAB);
  return sheet;
}

function lastFilledRow(sheet) {
  var values = sheet.getRange(1, START_COLUMN, sheet.getMaxRows(), 1).getValues();
  var last = 1;
  values.forEach(function (row, index) {
    if (String(row[0] || "").trim()) last = index + 1;
  });
  return last;
}
