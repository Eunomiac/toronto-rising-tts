"use strict";

const { parseCsv } = require("../../.dev/scripts/lib/skyboxes_sheet_csv.js");
const { ugcMatchKey } = require("../tts-cloud/lib/cloud_index.js");

const DECISIONS = new Set(["Keep", "Prune", "Purge", "Investigate"]);
const SCRIPT_FIELDS = new Set(["LuaScript", "LuaScriptState", "XmlUI"]);
const urlKey = (url) => ugcMatchKey(url) ?? url;
const isSkyboxReference = ({ path }) => path.length === 1 && path[0] === "SkyURL";

function readDecisions(csv) {
  const [headers, ...rows] = parseCsv(csv.replace(/^\uFEFF/, ""));
  const decisionColumn = headers?.indexOf("Manual decision") ?? -1;
  // The sheet has two URL columns. The static copy sits closest to Manual decision.
  const urlColumn = headers?.slice(0, decisionColumn).lastIndexOf("URL") ?? -1;
  if (decisionColumn < 0 || urlColumn < 0) throw new Error("Expected the Integrated assets CSV with URL and Manual decision columns.");
  const columns = headers.slice(urlColumn);
  const cell = (row, name) => {
    const index = columns.lastIndexOf(name);
    return index < 0 ? "" : row[urlColumn + index] ?? "";
  };
  const decisions = new Map();
  for (const [index, row] of rows.entries()) {
    const url = row[urlColumn]?.trim();
    const decision = row[decisionColumn]?.trim();
    if (!decision) continue;
    if (!DECISIONS.has(decision) || !/^(?:https?|file):\/\//i.test(url ?? "")) {
      throw new Error(`Integrated assets row ${index + 2}: invalid URL or decision (${decision}).`);
    }
    const key = urlKey(url);
    if (decisions.has(key)) throw new Error(`Integrated assets row ${index + 2}: duplicate reviewed URL ${url}.`);
    const bytes = cell(row, "Known bytes").replace(/,/g, "");
    decisions.set(key, {
      url, decision, label: cell(row, "Helper Label"), notes: cell(row, "Manual notes"),
      knownBytes: /^\d+$/.test(bytes) ? Number(bytes) : null,
    });
  }
  if (!decisions.size) throw new Error("No manual asset decisions in the CSV.");
  return decisions;
}

function scanAssetUrls(value) {
  const found = new Map();
  const visit = (node, path) => {
    if (typeof node === "string") {
      if (!/^(?:https?|file):\/\/[^\s]+$/i.test(node)) return;
      const key = urlKey(node);
      if (!found.has(key)) found.set(key, []);
      found.get(key).push({ url: node, path });
    } else if (Array.isArray(node)) {
      node.forEach((child, i) => visit(child, [...path, i]));
    } else if (node && typeof node === "object") {
      for (const [field, child] of Object.entries(node)) {
        if (!SCRIPT_FIELDS.has(field)) visit(child, [...path, field]);
      }
    }
  };
  visit(value, []);
  return found;
}

function planSessionStart(save, decisions) {
  if (!Array.isArray(save.ObjectStates)) throw new Error("The source save has no ObjectStates array.");
  const urls = scanAssetUrls(save);
  const skyboxKey = typeof save.SkyURL === "string" ? urlKey(save.SkyURL) : null;
  const skybox = urls.get(skyboxKey)?.find(isSkyboxReference);
  const pruned = [];
  const purge = [];
  const investigate = [];
  const removedObjects = new Set();
  for (const [key, reviewed] of decisions) {
    const references = (urls.get(key) ?? []).filter(ref => !isSkyboxReference(ref));
    if (skybox && key === skyboxKey && !references.length) continue;
    const entry = { ...reviewed, references };
    if (reviewed.decision === "Purge") purge.push(entry);
    if (reviewed.decision === "Investigate") investigate.push(entry);
    if (reviewed.decision !== "Prune") continue;
    if (!references.length) throw new Error(`Prune URL no longer occurs in the save. Review ${reviewed.label || reviewed.url}.`);
    for (const { path } of references) {
      const [root, index, field, property] = path;
      const object = save.ObjectStates[index];
      if (path.length !== 4 || root !== "ObjectStates" || field !== "CustomAssetbundle" ||
          !/^Assetbundle(?:Secondary)?URL$/.test(property) || !/^[0-9a-f]{6}$/i.test(object?.GUID ?? "")) {
        throw new Error(`Prune needs a restore handler for ${JSON.stringify(path)} (${reviewed.label || reviewed.url}).`);
      }
      removedObjects.add(index);
    }
    pruned.push(entry);
  }
  if (!pruned.length) throw new Error("No assets are marked Prune.");
  for (const index of removedObjects) {
    for (const [key, references] of scanAssetUrls(save.ObjectStates[index])) {
      if (decisions.get(key)?.decision !== "Prune") {
        throw new Error(`Removing ${save.ObjectStates[index].GUID} would also remove ${references[0].url}, which is not marked Prune.`);
      }
    }
  }
  const objects = [...removedObjects].sort((a, b) => a - b).map(index => save.ObjectStates[index]);
  if (new Set(objects.map(object => object.GUID.toLowerCase())).size !== objects.length) {
    throw new Error("Deferred objects must have distinct GUIDs.");
  }
  const retained = save.ObjectStates.filter((_, index) => !removedObjects.has(index));
  const after = scanAssetUrls({ ...save, ObjectStates: retained });
  return {
    objects, retained,
    report: {
      distinctAssetUrls: { before: urls.size, after: after.size },
      topLevelObjects: { before: save.ObjectStates.length, after: retained.length },
      retainedSkybox: skybox?.url ?? null,
      unreviewedUrls: [...urls].filter(([key, references]) =>
        !decisions.has(key) && references.some(ref => !isSkyboxReference(ref))).length,
      pruned, purge, investigate,
      deferredKnownBytes: pruned.reduce((sum, entry) => sum + (entry.knownBytes ?? 0), 0),
      deferredUnknownSizes: pruned.filter(entry => entry.knownBytes === null).length,
    },
  };
}

module.exports = { readDecisions, scanAssetUrls, planSessionStart };
