#!/usr/bin/env node
"use strict";

/**
 * Trace every URL in assets/Protected Cloud Files/index.json through a TTS save.
 * Produces both a readable Markdown report and complete JSON evidence.
 *
 * Usage:
 *   npm run cloud:protected-usage
 *   npm run cloud:protected-usage -- --save <save.json> --index <index.json> --out <report-base>
 */

const fs = require("fs");
const path = require("path");

const { PROTECTED_CLOUD_FOLDER, loadCloudConfig } = require("./lib/cloud_config.js");
const { ugcKeysIn } = require("./lib/in_use.js");

const URL_RE = /https?:\/\/[^\s"'<>\\]+/gi;
const URL_FIELDS = new Set([
  "AssetbundleSecondaryURL",
  "AssetbundleURL",
  "BackURL",
  "ColliderURL",
  "DiffuseURL",
  "FaceURL",
  "ImageSecondaryURL",
  "ImageURL",
  "MeshURL",
  "NormalURL",
  "PDFUrl",
  "SkyURL",
  "URL",
]);

function parseArgs(argv) {
  const out = { save: null, index: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--save" || arg === "--index" || arg === "--out") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a path.`);
      out[arg.slice(2)] = value;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      out.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return out;
}

function appendJsonPath(base, key) {
  if (typeof key === "number") return `${base}[${key}]`;
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return `${base}.${key}`;
  return `${base}[${JSON.stringify(key)}]`;
}

function objectSummary(value, jsonPath) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.GUID !== "string" || typeof value.Name !== "string") return null;
  const transform = value.Transform && typeof value.Transform === "object"
    ? {
        x: value.Transform.posX,
        y: value.Transform.posY,
        z: value.Transform.posZ,
      }
    : null;
  return {
    jsonPath,
    guid: value.GUID,
    type: value.Name,
    nickname: typeof value.Nickname === "string" ? value.Nickname : "",
    description: typeof value.Description === "string" ? value.Description : "",
    tags: Array.isArray(value.Tags) ? value.Tags.filter((tag) => typeof tag === "string") : [],
    position: transform,
  };
}

function classifyReference(parts, objectChain) {
  const field = String(parts.at(-1) ?? "");
  const has = (name) => parts.includes(name);
  if (has("CustomUIAssets")) return objectChain.length > 0 ? "Object Custom UI" : "Global Custom UI";
  if (has("AttachedDecals")) return "Attached decal";
  if (has("DecalPallet")) return "Global decal pallet";
  if (has("CustomAssetbundle")) return "Object asset bundle";
  if (has("CustomPDF")) return "Object PDF";
  if (has("CustomMesh")) return "Object mesh or material";
  if (has("CustomImage") || has("CustomDeck") || URL_FIELDS.has(field)) {
    if (field === "SkyURL" && objectChain.length === 0) return "Global skybox";
    return objectChain.length > 0 ? "Object image or asset field" : "Global save asset field";
  }
  if (field === "LuaScript") return objectChain.length > 0 ? "Object Lua script" : "Global Lua script";
  if (field === "LuaScriptState") return objectChain.length > 0 ? "Object serialized Lua state" : "Global serialized Lua state";
  return objectChain.length > 0 ? "Other object data" : "Other global save data";
}

function containingEntry(parts, parent) {
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) return null;
  if (parts.includes("CustomUIAssets")) {
    return { assetName: typeof parent.Name === "string" ? parent.Name : "" };
  }
  if (parts.includes("DecalPallet") || parts.includes("AttachedDecals")) {
    const decal = parent.CustomDecal && typeof parent.CustomDecal === "object" ? parent.CustomDecal : parent;
    return {
      decalName: typeof decal.Name === "string" ? decal.Name : "",
      decalType: decal.Type ?? null,
    };
  }
  return null;
}

function excerpt(value, matchedUrl) {
  if (value === matchedUrl) return null;
  const needle = matchedUrl || "ugc/";
  const at = value.indexOf(needle);
  const start = Math.max(0, at - 100);
  const end = Math.min(value.length, (at < 0 ? 0 : at + needle.length) + 100);
  return `${start > 0 ? "…" : ""}${value.slice(start, end).replace(/\r?\n/g, "\\n")}${end < value.length ? "…" : ""}`;
}

function urlsForKey(value, key) {
  const urls = [];
  for (const match of value.matchAll(URL_RE)) {
    if (ugcKeysIn(match[0]).has(key) && !urls.includes(match[0])) urls.push(match[0]);
  }
  return urls;
}

function locationInString(value, matchedUrl) {
  if (!matchedUrl) return null;
  const offset = value.indexOf(matchedUrl);
  if (offset < 0) return null;
  const before = value.slice(0, offset);
  const lines = before.split(/\r?\n/);
  const nearby = before.slice(Math.max(0, before.length - 1200));
  const keys = [];
  for (const match of nearby.matchAll(/(?:^|[\n{,])\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/g)) {
    keys.push(match[1]);
  }
  return {
    offset,
    line: lines.length,
    column: lines.at(-1).length + 1,
    nearbyKeys: keys.slice(-4),
  };
}

/**
 * @param {Record<string, any>} saveRoot
 * @param {{ path: string, cloudPath?: string, url: string, key?: string }[]} protectedFiles
 */
function traceProtectedUrls(saveRoot, protectedFiles) {
  const targets = new Map();
  const reports = protectedFiles.map((file) => {
    const keys = [...ugcKeysIn(String(file.url || ""))];
    if (keys.length !== 1) throw new Error(`Protected file ${file.path} does not have one recognizable Steam UGC URL.`);
    const report = { ...file, matchKey: keys[0], occurrences: [] };
    if (!targets.has(keys[0])) targets.set(keys[0], []);
    targets.get(keys[0]).push(report);
    return report;
  });

  const walk = (value, jsonPath, parts, objectChain, parent) => {
    if (typeof value === "string") {
      const present = ugcKeysIn(value);
      for (const key of present) {
        const matchingReports = targets.get(key);
        if (!matchingReports) continue;
        const urls = urlsForKey(value, key);
        const actualUrls = urls.length > 0 ? urls : [null];
        for (const report of matchingReports) {
          for (const actualUrl of actualUrls) {
            report.occurrences.push({
              category: classifyReference(parts, objectChain),
              jsonPath,
              field: String(parts.at(-1) ?? ""),
              matchedUrl: actualUrl,
              exactUrlMatch: actualUrl === report.url,
              entry: containingEntry(parts, parent),
              object: objectChain.length > 0 ? objectChain.at(-1) : null,
              objectChain: [...objectChain],
              stringLocation: locationInString(value, actualUrl),
              excerpt: excerpt(value, actualUrl),
            });
          }
        }
      }
      return;
    }
    if (!value || typeof value !== "object") return;

    const summary = objectSummary(value, jsonPath);
    const nextChain = summary ? [...objectChain, summary] : objectChain;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        walk(value[i], appendJsonPath(jsonPath, i), [...parts, i], nextChain, value);
      }
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      walk(child, appendJsonPath(jsonPath, key), [...parts, key], nextChain, value);
    }
  };

  walk(saveRoot, "$", [], [], null);
  return reports;
}

function md(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function objectLabel(object) {
  if (!object) return "None (save-global data)";
  const name = object.nickname || "Unnamed object";
  return `${name} — ${object.type}, GUID \`${object.guid}\``;
}

function renderMarkdown(report) {
  const lines = [
    "# Protected Cloud URL usage",
    "",
    `Save: \`${report.saveFile}\``,
    "",
    `Protected files checked: **${report.summary.files}**  `,
    `Files with references: **${report.summary.filesWithReferences}**  `,
    `Total references: **${report.summary.references}**`,
    "",
    "Each match uses the Steam UGC handle and content hash, so it remains valid when Steam changes only the URL hostname.",
    "",
  ];
  for (const file of report.files) {
    lines.push(`## ${file.path}`, "", `Cloud path: \`${file.cloudPath || ""}\`  `, `Protected URL: ${file.url}  `, `References found: **${file.occurrences.length}**`, "");
    if (file.occurrences.length === 0) {
      lines.push("No reference was found in the parsed save.", "");
      continue;
    }
    file.occurrences.forEach((occurrence, index) => {
      lines.push(`### Reference ${index + 1}: ${occurrence.category}`, "");
      lines.push(`- JSON path: \`${occurrence.jsonPath}\``);
      lines.push(`- Object: ${objectLabel(occurrence.object)}`);
      if (occurrence.object?.description) lines.push(`- Description: ${md(occurrence.object.description)}`);
      if (occurrence.object?.tags?.length) lines.push(`- Tags: ${occurrence.object.tags.map((tag) => `\`${md(tag)}\``).join(", ")}`);
      if (occurrence.entry?.assetName) lines.push(`- Custom UI asset name: \`${md(occurrence.entry.assetName)}\``);
      if (occurrence.entry?.decalName) lines.push(`- Decal name: \`${md(occurrence.entry.decalName)}\``);
      if (occurrence.matchedUrl) lines.push(`- URL stored in save: ${occurrence.matchedUrl}`);
      lines.push(`- Exact URL match: ${occurrence.exactUrlMatch ? "yes" : "no; the Steam hostname or URL form differs, but the UGC identity is the same"}`);
      if (occurrence.excerpt && occurrence.stringLocation) {
        lines.push(`- Position inside \`${occurrence.field}\`: line ${occurrence.stringLocation.line}, column ${occurrence.stringLocation.column}, character offset ${occurrence.stringLocation.offset}`);
        if (occurrence.stringLocation.nearbyKeys.length > 0) {
          lines.push(`- Nearby Lua/data keys: ${occurrence.stringLocation.nearbyKeys.map((key) => `\`${md(key)}\``).join(" → ")}`);
        }
      }
      if (occurrence.objectChain.length > 1) {
        lines.push(`- Containment: ${occurrence.objectChain.map(objectLabel).join(" → ")}`);
      }
      if (occurrence.excerpt) lines.push(`- Surrounding string: \`${md(occurrence.excerpt)}\``);
      lines.push("");
    });
  }
  return `${lines.join("\n")}\n`;
}

function createReport(saveFile, indexFile) {
  const saveRoot = JSON.parse(fs.readFileSync(saveFile, "utf8"));
  const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  if (!Array.isArray(index.files)) throw new Error(`Protected index has no files array: ${indexFile}`);
  const files = traceProtectedUrls(saveRoot, index.files);
  return {
    generatedAt: new Date().toISOString(),
    saveFile: path.resolve(saveFile),
    protectedIndex: path.resolve(indexFile),
    summary: {
      files: files.length,
      filesWithReferences: files.filter((file) => file.occurrences.length > 0).length,
      references: files.reduce((sum, file) => sum + file.occurrences.length, 0),
    },
    files,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: npm run cloud:protected-usage -- [--save <save.json>] [--index <index.json>] [--out <report-base>]");
    return;
  }
  const cfg = loadCloudConfig();
  const root = path.join(cfg.assetsDir, PROTECTED_CLOUD_FOLDER);
  const saveFile = path.resolve(args.save || cfg.saveFile);
  const indexFile = path.resolve(args.index || path.join(root, "index.json"));
  const outBase = path.resolve(args.out || path.join(root, "usage-report"));
  const report = createReport(saveFile, indexFile);
  const jsonFile = `${outBase}.json`;
  const markdownFile = `${outBase}.md`;
  fs.mkdirSync(path.dirname(outBase), { recursive: true });
  fs.writeFileSync(jsonFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownFile, renderMarkdown(report), "utf8");
  console.log(`Protected files checked: ${report.summary.files}`);
  console.log(`Files with references: ${report.summary.filesWithReferences}`);
  console.log(`Total references: ${report.summary.references}`);
  console.log(`Markdown: ${markdownFile}`);
  console.log(`JSON: ${jsonFile}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

module.exports = {
  appendJsonPath,
  classifyReference,
  createReport,
  renderMarkdown,
  traceProtectedUrls,
};
