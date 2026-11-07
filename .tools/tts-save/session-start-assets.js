"use strict";

const { parseCsv } = require("../../.dev/scripts/lib/skyboxes_sheet_csv.js");
const { ugcMatchKey } = require("../tts-cloud/lib/cloud_index.js");

const DECISIONS = new Set(["Keep", "Prune", "Purge", "Investigate", "ForcePurge", "Resolve", "RemoveFromSheet"]);
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
      resolutionInstructions: cell(row, "Author Resolution Instructions"),
      knownBytes: /^\d+$/.test(bytes) ? Number(bytes) : null,
      mirrorPaths: cell(row, "Existing mirror paths").split(" | ").filter(Boolean),
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

// A new upload changes the URL, but the job's mirror path identifies the asset
// being replaced. Keep URL-specific actions tied to the URL the author reviewed.
function resolveReviewedReplacements(urls, decisions, manifest) {
  const pathsByUrl = new Map();
  const urlsByPath = new Map();
  const add = (map, key, value) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(value);
  };
  const current = new Map();
  for (const job of Object.values(manifest.jobs)) {
    for (const row of job.rows) {
      const key = ugcMatchKey(row.url);
      if (!key) continue;
      const mirror = `assets/${row.path}`;
      add(pathsByUrl, key, mirror);
      add(urlsByPath, mirror, key);
      current.set(key, row);
    }
  }
  const byPath = new Map();
  for (const [key, row] of decisions) {
    if (!ugcMatchKey(row.url) || row.mirrorPaths?.length !== 1) continue;
    add(byPath, row.mirrorPaths[0].trim().replaceAll("\\", "/"), key);
  }
  const effective = new Map(decisions);
  const inherited = [];
  for (const [mirror, keys] of byPath) {
    const matches = urlsByPath.get(mirror);
    if (matches?.size !== 1) continue;
    const [key] = matches;
    if (!urls.has(key) || pathsByUrl.get(key).size !== 1) continue;
    const previous = [...keys].filter(old => old !== key);
    if (!previous.length || previous.some(old => urls.has(old))) continue;
    if (!decisions.has(key)) {
      const rows = previous.map(old => decisions.get(old));
      const { decision } = rows[0];
      if (!["Keep", "Prune"].includes(decision) || rows.some(row => row.decision !== decision)) continue;
      const { url, size } = current.get(key);
      effective.set(key, {
        ...rows[0], url, knownBytes: Number.isSafeInteger(size) && size >= 0 ? size : null,
      });
      inherited.push({ path: mirror, url, decision, previousUrls: rows.map(row => row.url) });
    }
    for (const old of previous) if (decisions.get(old).decision === "Prune") effective.delete(old);
  }
  return { effective, inherited };
}

function assertReviewResolved(decisions) {
  const unresolved = [...decisions.values()].filter(row => row.decision === "Resolve");
  if (unresolved.length) throw new Error(`Resolve decisions need author-directed action before building: ${unresolved.map(row => row.label || row.url).join(" | ")}`);
  const sheetCleanup = [...decisions.values()].filter(row => row.decision === "RemoveFromSheet");
  if (sheetCleanup.length) throw new Error(`RemoveFromSheet decisions need verified static-sheet cleanup before building: ${sheetCleanup.map(row => row.label || row.url).join(" | ")}`);
}

function forcePurgeAssets(save, decisions) {
  const targets = new Map([...decisions].filter(([, row]) => row.decision === "ForcePurge"));
  const matches = url => typeof url === "string" && targets.has(urlKey(url));
  const before = scanAssetUrls(save);
  let registrationsRemoved = 0;
  const registrationFields = { CustomUIAssets: "URL", AudioLibrary: "Item1", DecalPallet: "ImageURL", Decals: "ImageURL" };
  const visit = (node, path) => {
    if (typeof node === "string") return matches(node) && !isSkyboxReference({ path }) ? "" : node;
    if (Array.isArray(node)) {
      const field = registrationFields[path.at(-1)];
      return node.filter(row => {
        if (field && matches(row?.[field])) { registrationsRemoved++; return false; }
        return true;
      }).map((child, i) => visit(child, [...path, i]));
    }
    if (!node || typeof node !== "object") return node;
    const out = {};
    for (const [field, child] of Object.entries(node)) {
      if (path.at(-1) === "CustomDeck" && (matches(child?.FaceURL) || matches(child?.BackURL))) {
        registrationsRemoved++;
        continue;
      }
      out[field] = SCRIPT_FIELDS.has(field) ? child : visit(child, [...path, field]);
    }
    if (path.at(-1) === "MusicPlayer" && matches(node.CurrentAudioURL)) {
      out.CurrentAudioTitle = "";
      out.PlaylistEntry = 0;
    }
    return out;
  };
  const cleaned = targets.size ? visit(save, []) : save;
  const after = scanAssetUrls(cleaned);
  const entries = [...targets].map(([key, row]) => {
    const references = (before.get(key) ?? []).filter(ref => !isSkyboxReference(ref));
    if ((after.get(key) ?? []).some(ref => !isSkyboxReference(ref))) throw new Error(`ForcePurge left a reference to ${row.url}`);
    return { ...row, references };
  });
  return { save: cleaned, entries, registrationsRemoved };
}

function planSessionStart(save, decisions, manifest = { jobs: {} }) {
  assertReviewResolved(decisions);
  if (!Array.isArray(save.ObjectStates)) throw new Error("The source save has no ObjectStates array.");
  const originalUrls = scanAssetUrls(save);
  const originalUrlCount = originalUrls.size;
  const { effective, inherited } = resolveReviewedReplacements(originalUrls, decisions, manifest);
  decisions = effective;
  const forced = forcePurgeAssets(save, decisions);
  save = forced.save;
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
    if (reviewed.decision === "Purge" && references.length) purge.push(entry);
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
    objects, retained, source: save,
    report: {
      distinctAssetUrls: { before: originalUrlCount, after: after.size },
      topLevelObjects: { before: save.ObjectStates.length, after: retained.length },
      retainedSkybox: skybox?.url ?? null,
      inheritedDecisions: inherited,
      unreviewedUrls: [...urls].filter(([key, references]) =>
        !decisions.has(key) && references.some(ref => !isSkyboxReference(ref))).length,
      pruned, purge, investigate,
      forcePurged: forced.entries,
      forcePurgedRegistrations: forced.registrationsRemoved,
      forcePurgedReferences: forced.entries.reduce((sum, row) => sum + row.references.length, 0),
      deferredKnownBytes: pruned.reduce((sum, entry) => sum + (entry.knownBytes ?? 0), 0),
      deferredUnknownSizes: pruned.filter(entry => entry.knownBytes === null).length,
    },
  };
}

module.exports = { readDecisions, scanAssetUrls, planSessionStart, forcePurgeAssets, assertReviewResolved };
