"use strict";

// Read-only inventory for the raw toronto-rising-join-assets sheet.
const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("node:util");
const { scanAssetUrls } = require("./session-start-assets.js");
const { ugcMatchKey } = require("../tts-cloud/lib/cloud_index.js");

const HEADERS = ["URL", "Host", "Save scopes", "Reference count", "Global UI refs", "Object UI refs",
  "Contained object refs", "Alternate state refs", "Known bytes", "Conflicting byte counts", "Sync jobs",
  "Cloud metadata sources", "Existing mirror paths", "Mirror extensions", "SHA-1", "UI asset names",
  "Object names", "Object GUIDs", "Save JSON paths", "Alternate URL spellings", "Batch", "Decision"];
const join = values => [...new Set(values.filter(value => value !== "" && value != null))].sort().join(" | ");
const key = url => ugcMatchKey(url) ?? url;

function inventory(save, manifest, ledger, mirrorExists) {
  const metadata = new Map();
  const add = (url, row) => {
    if (!metadata.has(key(url))) metadata.set(key(url), []);
    metadata.get(key(url)).push(row);
  };
  for (const [job, data] of Object.entries(manifest.jobs)) {
    for (const row of data.rows) add(row.url, { ...row, job, source: "Sync job" });
  }
  for (const [file, row] of Object.entries(ledger.files)) {
    add(row.url, { ...row, path: file, source: "Cloud ledger" });
  }
  return [...scanAssetUrls(save)].map(([identity, references]) => {
    const urls = [...new Set(references.map(ref => ref.url))];
    const url = urls[0];
    const meta = metadata.get(identity) ?? [];
    const sizes = [...new Set(meta.map(row => row.size).filter(size => Number.isSafeInteger(size) && size >= 0))];
    const mirrors = meta.map(row => row.path).filter(file => mirrorExists(file));
    const scopes = [], uiNames = [], objectNames = [], guids = [];
    let globalUi = 0, objectUi = 0;
    for (const ref of references) {
      const ui = ref.path.indexOf("CustomUIAssets");
      const isObject = ref.path[0] === "ObjectStates";
      scopes.push(ui >= 0 ? (isObject ? "Object UI" : "Global UI") : (isObject ? "Object field" : "Save field"));
      if (ui >= 0) {
        let asset = save;
        for (const segment of ref.path.slice(0, ui + 2)) asset = asset[segment];
        uiNames.push(asset.Name);
        if (isObject) objectUi++; else globalUi++;
      }
      if (isObject) {
        let node = save, object;
        for (const segment of ref.path) {
          node = node?.[segment];
          if (node && typeof node === "object" && !Array.isArray(node) && node.GUID) object = node;
        }
        if (object) {
          objectNames.push(object.Nickname || object.Name);
          guids.push(object.GUID);
        }
      }
    }
    return [url, new URL(url).host, join(scopes), references.length, globalUi, objectUi,
      references.filter(ref => ref.path.includes("ContainedObjects")).length,
      references.filter(ref => ref.path.includes("States")).length,
      sizes.length === 1 ? sizes[0] : "", sizes.length > 1 ? sizes.sort((a,b) => a-b).join(" | ") : "",
      join(meta.map(row => row.job)), join(meta.map(row => row.source)) || "Unmatched",
      join(mirrors.map(file => `assets/${file.replaceAll("\\", "/")}`)),
      join(mirrors.map(file => path.extname(file))),
      url.match(/ugc\/\d+\/([a-f0-9]{40})/i)?.[1].toUpperCase() ?? join(meta.map(row => row.sha1)),
      join(uiNames), join(objectNames), join(guids),
      references.map(ref => ref.path.map((segment, i) => typeof segment === "number" ? `[${segment}]` : `${i ? "." : ""}${segment}`).join("")).join(" | "),
      join(urls.slice(1)), "", ""];
  }).sort((a,b) => (Number(b[8]) || 0) - (Number(a[8]) || 0) || a[0].localeCompare(b[0]));
}

function toCsv(rows) {
  return rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n") + "\r\n";
}

if (require.main === module) {
  const { values } = parseArgs({ options: { source: { type: "string" }, output: { type: "string" } } });
  if (!values.source || !values.output) throw new Error("Usage: node .tools/tts-save/export-join-assets.js --source <full-save.json> --output <inventory.csv>");
  const root = path.resolve(__dirname, "../..");
  const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = inventory(read(values.source), read(path.join(root, "lib/json/cloud-assets.json")),
    read(path.join(root, "assets/.cloud-ledger.json")), file => fs.existsSync(path.join(root, "assets", file)));
  fs.mkdirSync(path.dirname(path.resolve(values.output)), { recursive: true });
  fs.writeFileSync(values.output, toCsv([HEADERS, ...rows]));
  console.log(`Wrote ${rows.length} asset URLs to ${path.resolve(values.output)}. No save or Cloud files changed.`);
}

module.exports = { HEADERS, inventory, toCsv };
