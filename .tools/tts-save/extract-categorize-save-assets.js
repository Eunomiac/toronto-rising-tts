#!/usr/bin/env node
"use strict";

// Scan a TTS save JSON: list Custom UI / decal / embedded URLs, categorize by name,
// and mark where each asset is referenced (XmlUI, objects, repo sources).
// Agent guidance: .dev/custom-ui-assets/; .dev/TTS_BUNDLING_SETUP.md

const fs = require("fs");
const path = require("path");
const { resolveSavePath } = require("./resolve-save-path");

/**
 * Parse CLI args: `--key value` or boolean `--flag`.
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = "1";
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

/**
 * @param {string} filePath
 * @returns {unknown}
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * @param {string} outputPath
 * @param {string} text
 */
function writeText(outputPath, text) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, text, "utf8");
}

/**
 * Heuristic category from Custom UI asset Name.
 * @param {string} name
 * @returns {string}
 */
function categorizeAssetName(name) {
  if (/^siteCard_/i.test(name)) {
    return "siteCard";
  }
  if (/^token(?:Front|Back)_/i.test(name)) {
    return "npcToken";
  }
  if (/^(bloodSurge|mending|baneSeverity|discBonus|discReroll)\d/i.test(name)) {
    return "bloodPotencyDecal";
  }
  if (/^toggle(?:District|Overlay)?_/i.test(name) || /^hud-toggle-/i.test(name)) {
    return "hudToggle";
  }
  if (/^map(?:Overlay|Base)?_/i.test(name) || /^overlay(?:Divider)?_/i.test(name)) {
    return "mapOverlay";
  }
  if (/^district(?:Card|Divider)_/i.test(name)) {
    return "district";
  }
  if (/^dieFace_/i.test(name)) {
    return "dieFace";
  }
  if (/^refPanel_/i.test(name)) {
    return "referencePanel";
  }
  if (/^border-|^hud-border-/i.test(name)) {
    return "border";
  }
  if (/^pin_/i.test(name)) {
    return "pin";
  }
  if (/^nameLabel_/i.test(name)) {
    return "nameLabel";
  }
  if (/^bg_/i.test(name)) {
    return "background";
  }
  if (/^button/i.test(name)) {
    return "button";
  }
  if (/^popout/i.test(name)) {
    return "popout";
  }
  if (/^moderator/i.test(name)) {
    return "moderator";
  }
  return "other";
}

/**
 * @param {string} url
 * @returns {string}
 */
function urlHostKind(url) {
  if (/steamusercontent/i.test(url)) {
    return "steam_ugc";
  }
  if (/tabletopsimulator/i.test(url)) {
    return "tts_cdn";
  }
  if (/^file:/i.test(url)) {
    return "file_local";
  }
  return "other_host";
}

/**
 * @param {Record<string, unknown>} saveRoot
 * @returns {{ field: "CustomUIAssets" | "CustomAssets"; entries: { index: number; name: string; url: string; type: string; category: string }[] }}
 */
function extractCustomUiRegistry(saveRoot) {
  /** @type {"CustomUIAssets" | "CustomAssets" | null} */
  let field = null;
  /** @type {unknown[]} */
  let raw = [];
  if (Array.isArray(saveRoot.CustomUIAssets)) {
    field = "CustomUIAssets";
    raw = saveRoot.CustomUIAssets;
  } else if (Array.isArray(saveRoot.CustomAssets)) {
    field = "CustomAssets";
    raw = saveRoot.CustomAssets;
  } else {
    return { field: "CustomUIAssets", entries: [] };
  }

  /** @type {{ index: number; name: string; url: string; type: string; category: string }[]} */
  const entries = [];
  for (let i = 0; i < raw.length; i += 1) {
    const row = raw[i];
    if (!row || typeof row !== "object") {
      continue;
    }
    const rec = /** @type {Record<string, unknown>} */ (row);
    const name = typeof rec.Name === "string" ? rec.Name : `<index_${i}>`;
    const url = typeof rec.URL === "string" ? rec.URL : "";
    const type = rec.Type === undefined || rec.Type === null ? "" : String(rec.Type);
    entries.push({
      index: i,
      name,
      url,
      type,
      category: categorizeAssetName(name),
    });
  }
  return { field: /** @type {"CustomUIAssets" | "CustomAssets"} */ (field), entries };
}

/**
 * @param {unknown} pallet
 * @returns {{ name: string; url: string; category: string }[]}
 */
function extractDecalPallet(pallet) {
  if (!Array.isArray(pallet)) {
    return [];
  }
  /** @type {{ name: string; url: string; category: string }[]} */
  const rows = [];
  for (const entry of pallet) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const rec = /** @type {Record<string, unknown>} */ (entry);
    const name = typeof rec.Name === "string" ? rec.Name : "";
    const url = typeof rec.ImageURL === "string"
      ? rec.ImageURL
      : typeof rec.URL === "string"
        ? rec.URL
        : "";
    if (!name && !url) {
      continue;
    }
    rows.push({
      name: name || "<unnamed>",
      url,
      category: categorizeAssetName(name) === "other"
        ? "decalPallet"
        : categorizeAssetName(name),
    });
  }
  return rows;
}

/**
 * Collect `image="..."` and `url="..."` asset ids from XML text.
 * @param {string} xml
 * @param {Set<string>} nameHits
 * @param {Map<string, number>} nameCounts
 * @param {string} sourceLabel
 */
function collectXmlAssetRefs(xml, nameHits, nameCounts, sourceLabel) {
  if (typeof xml !== "string" || xml.length === 0) {
    return;
  }
  const patterns = [
    /\bimage="([^"]+)"/g,
    /\burl="([^"]+)"/g,
    /\bsprite="([^"]+)"/g,
  ];
  for (const re of patterns) {
    let match = re.exec(xml);
    while (match !== null) {
      const id = match[1];
      if (id && !/^https?:\/\//i.test(id)) {
        nameHits.add(id);
        const key = `${sourceLabel}\0${id}`;
        nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
      }
      match = re.exec(xml);
    }
  }
}

/**
 * Extract quoted tokens from Lua/XML text that match known asset names.
 * @param {string} text
 * @param {Set<string>} assetNames
 * @param {Set<string>} out
 */
function collectQuotedAssetNames(text, assetNames, out) {
  if (typeof text !== "string" || text.length === 0 || assetNames.size === 0) {
    return;
  }
  const re = /["']([A-Za-z0-9][A-Za-z0-9._-]{2,})["']/g;
  let match = re.exec(text);
  while (match !== null) {
    const token = match[1];
    if (assetNames.has(token)) {
      out.add(token);
    }
    match = re.exec(text);
  }
}

/**
 * Walk object tree for URL / name references (skip huge script bodies except XmlUI).
 * @param {unknown} node
 * @param {string} pathLabel
 * @param {number} depth
 * @param {Set<string>} urlHits
 * @param {Set<string>} nameHits
 * @param {Map<string, string>} urlToName
 * @param {Set<string>} assetNames
 */
function walkObjectRefs(node, pathLabel, depth, urlHits, nameHits, urlToName, assetNames) {
  if (depth > 30 || node === null || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      walkObjectRefs(node[i], `${pathLabel}[${i}]`, depth + 1, urlHits, nameHits, urlToName, assetNames);
    }
    return;
  }

  const obj = /** @type {Record<string, unknown>} */ (node);

  if (typeof obj.XmlUI === "string") {
    const localCounts = new Map();
    collectXmlAssetRefs(obj.XmlUI, nameHits, localCounts, `${pathLabel}.XmlUI`);
  }

  if (typeof obj.Name === "string" && assetNames.has(obj.Name)) {
    nameHits.add(obj.Name);
  }

  const urlFields = ["ImageURL", "ImageUrl", "URL", "AssetbundleURL", "AssetbundleSecondaryURL"];
  for (const key of urlFields) {
    const val = obj[key];
    if (typeof val === "string" && val.length > 0) {
      urlHits.add(val);
      if (urlToName.has(val)) {
        nameHits.add(urlToName.get(val));
      }
    }
  }

  if (obj.CustomAssetbundle && typeof obj.CustomAssetbundle === "object") {
    const ab = /** @type {Record<string, unknown>} */ (obj.CustomAssetbundle);
    for (const key of ["AssetbundleURL", "AssetbundleSecondaryURL"]) {
      const val = ab[key];
      if (typeof val === "string" && val.length > 0) {
        urlHits.add(val);
      }
    }
  }

  if (Array.isArray(obj.AttachedDecals)) {
    for (let i = 0; i < obj.AttachedDecals.length; i += 1) {
      const decal = obj.AttachedDecals[i];
      if (!decal || typeof decal !== "object") {
        continue;
      }
      const d = /** @type {Record<string, unknown>} */ (decal);
      if (typeof d.Name === "string") {
        nameHits.add(d.Name);
      }
      if (typeof d.URL === "string") {
        urlHits.add(d.URL);
      }
      if (d.CustomDecal && typeof d.CustomDecal === "object") {
        const cd = /** @type {Record<string, unknown>} */ (d.CustomDecal);
        if (typeof cd.Name === "string") {
          nameHits.add(cd.Name);
        }
        const cdUrl = typeof cd.ImageURL === "string"
          ? cd.ImageURL
          : typeof cd.URL === "string"
            ? cd.URL
            : null;
        if (cdUrl) {
          urlHits.add(cdUrl);
        }
      }
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key === "LuaScript" || key === "ContainedObjects") {
      continue;
    }
    walkObjectRefs(value, `${pathLabel}.${key}`, depth + 1, urlHits, nameHits, urlToName, assetNames);
  }
}

/**
 * Recursively list files under dir matching extensions.
 * @param {string} dir
 * @param {string[]} exts
 * @param {string[]} out
 */
function listFilesRecursive(dir, exts, out) {
  if (!fs.existsSync(dir)) {
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === ".tts") {
        continue;
      }
      listFilesRecursive(full, exts, out);
      continue;
    }
    const ext = path.extname(ent.name).toLowerCase();
    if (exts.includes(ext)) {
      out.push(full);
    }
  }
}

/**
 * @param {string} repoRoot
 * @returns {Set<string>}
 */
function collectRepoRequiredAssetNames(repoRoot) {
  /** @type {Set<string>} */
  const names = new Set();

  const constantsPath = path.join(repoRoot, "lib", "constants.ttslua");
  if (fs.existsSync(constantsPath)) {
    const text = fs.readFileSync(constantsPath, "utf8");
    const imageRe = /\bimage\s*=\s*["']([A-Za-z0-9._-]+)["']/g;
    let m = imageRe.exec(text);
    while (m !== null) {
      names.add(m[1]);
      m = imageRe.exec(text);
    }
  }

  const uiDir = path.join(repoRoot, "ui");
  /** @type {string[]} */
  const xmlFiles = [];
  listFilesRecursive(uiDir, [".xml"], xmlFiles);
  for (const filePath of xmlFiles) {
    const text = fs.readFileSync(filePath, "utf8");
    const hits = new Set();
    const counts = new Map();
    collectXmlAssetRefs(text, hits, counts, filePath);
    for (const hit of hits) {
      names.add(hit);
    }
  }

  const manifestPaths = [
    path.join(repoRoot, ".dev", "custom-ui-assets", "manifest.json"),
    path.join(repoRoot, ".dev", "custom-ui-assets", "npc-token-manifest.json"),
    path.join(repoRoot, ".dev", "custom-ui-assets", "grid-buttons.manifest.json"),
  ];
  for (const manifestPath of manifestPaths) {
    if (!fs.existsSync(manifestPath)) {
      continue;
    }
    const manifest = readJson(manifestPath);
    if (!manifest || typeof manifest !== "object") {
      continue;
    }
    const assets = /** @type {Record<string, unknown>} */ (manifest).assets;
    if (!Array.isArray(assets)) {
      continue;
    }
    for (const row of assets) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const name = /** @type {Record<string, unknown>} */ (row).name;
      if (typeof name === "string") {
        names.add(name);
      }
    }
  }

  const npcManifestLua = path.join(repoRoot, "lib", "npc_token_upload_manifest.ttslua");
  if (fs.existsSync(npcManifestLua)) {
    const text = fs.readFileSync(npcManifestLua, "utf8");
    const nameRe = /\bname\s*=\s*["']([A-Za-z0-9._-]+)["']/g;
    let m = nameRe.exec(text);
    while (m !== null) {
      names.add(m[1]);
      m = nameRe.exec(text);
    }
  }

  const pruneList = path.join(repoRoot, ".dev", "custom-ui-assets", "prune-custom-ui-assets.txt");
  if (fs.existsSync(pruneList)) {
    const lines = fs.readFileSync(pruneList, "utf8").split(/\r?\n/u);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith("#")) {
        continue;
      }
      names.add(trimmed);
    }
  }

  return names;
}

/**
 * @param {string[]} cells
 * @returns {string}
 */
function toCsvRow(cells) {
  return cells.map((cell) => {
    const s = String(cell);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, "\"\"")}"`;
    }
    return s;
  }).join(",");
}

/**
 * @param {Record<string, unknown>} saveRoot
 * @param {string} repoRoot
 * @param {boolean} scanRepo
 * @param {Set<string>} pruneNames
 */
function buildReport(saveRoot, repoRoot, scanRepo, pruneNames) {
  const registry = extractCustomUiRegistry(saveRoot);
  const decalPallet = extractDecalPallet(saveRoot.DecalPallet);

  /** @type {Map<string, string>} */
  const urlToName = new Map();
  /** @type {Set<string>} */
  const assetNames = new Set();
  for (const entry of registry.entries) {
    assetNames.add(entry.name);
    if (entry.url) {
      urlToName.set(entry.url, entry.name);
    }
  }

  /** @type {Set<string>} */
  const xmlNameRefs = new Set();
  const xmlCounts = new Map();
  if (typeof saveRoot.XmlUI === "string") {
    collectXmlAssetRefs(saveRoot.XmlUI, xmlNameRefs, xmlCounts, "saveRoot.XmlUI");
  }

  /** @type {Set<string>} */
  const objectNameRefs = new Set();
  /** @type {Set<string>} */
  const objectUrlRefs = new Set();
  walkObjectRefs(
    saveRoot.ObjectStates,
    "ObjectStates",
    0,
    objectUrlRefs,
    objectNameRefs,
    urlToName,
    assetNames,
  );

  /** @type {Set<string>} */
  const decalNames = new Set(decalPallet.map((d) => d.name));
  /** @type {Set<string>} */
  const bundledLuaRefs = new Set();
  collectQuotedAssetNames(
    typeof saveRoot.LuaScript === "string" ? saveRoot.LuaScript : "",
    assetNames,
    bundledLuaRefs,
  );

  /** @type {Set<string>} */
  const repoRequired = scanRepo ? collectRepoRequiredAssetNames(repoRoot) : new Set();

  /** @type {Map<string, { count: number; entries: typeof registry.entries }>} */
  const byCategory = new Map();
  for (const entry of registry.entries) {
    if (!byCategory.has(entry.category)) {
      byCategory.set(entry.category, { count: 0, entries: [] });
    }
    const bucket = byCategory.get(entry.category);
    if (bucket) {
      bucket.count += 1;
      bucket.entries.push(entry);
    }
  }

  /** @type {Record<string, unknown>[]} */
  const assets = [];
  for (const entry of registry.entries) {
    /** @type {string[]} */
    const refSources = [];
    if (xmlNameRefs.has(entry.name)) {
      refSources.push("xml_global");
    }
    if (objectNameRefs.has(entry.name)) {
      refSources.push("object_tree");
    }
    if (decalNames.has(entry.name)) {
      refSources.push("decal_pallet");
    }
    if (objectUrlRefs.has(entry.url)) {
      refSources.push("object_url");
    }
    if (bundledLuaRefs.has(entry.name)) {
      refSources.push("save_lua_quoted");
    }
    if (repoRequired.has(entry.name)) {
      refSources.push("repo_source");
    }

    let pruneHint = "keep";
    if (refSources.length === 0) {
      pruneHint = "candidate_prune";
    } else if (
      refSources.length === 1
      && refSources[0] === "save_lua_quoted"
      && !repoRequired.has(entry.name)
    ) {
      pruneHint = "review";
    } else if (repoRequired.has(entry.name)) {
      pruneHint = "keep";
    }

    let xmlRefCount = 0;
    for (const [key, count] of xmlCounts.entries()) {
      if (key.endsWith(`\0${entry.name}`)) {
        xmlRefCount += count;
      }
    }

    let xmlUsage = "none";
    if (xmlRefCount >= 5) {
      xmlUsage = "heavy";
    } else if (xmlRefCount > 0) {
      xmlUsage = "light";
    } else if (refSources.includes("repo_source") || refSources.includes("save_lua_quoted")) {
      xmlUsage = "dynamic_only";
    }

    assets.push({
      source: registry.field,
      index: entry.index,
      name: entry.name,
      url: entry.url,
      type: entry.type,
      category: entry.category,
      urlHost: entry.url ? urlHostKind(entry.url) : "",
      referenceSources: refSources,
      xmlRefCount,
      xmlUsage,
      inRepoSources: repoRequired.has(entry.name),
      listedInPruneFile: pruneNames.has(entry.name),
      pruneHint,
    });
  }

  const unknownXmlRefs = [...xmlNameRefs].filter((n) => !assetNames.has(n)).sort();
  const repoNotInSave = [...repoRequired].filter((n) => !assetNames.has(n)).sort();

  /** @type {Record<string, { url: string; category: string; inCustomUi: boolean }>} */
  const embeddedUrls = {};
  for (const url of objectUrlRefs) {
    if (urlToName.has(url)) {
      continue;
    }
    embeddedUrls[url] = {
      url,
      category: "embedded_object_url",
      inCustomUi: false,
    };
  }

  const summary = {
    customUiField: registry.field,
    customUiCount: registry.entries.length,
    decalPalletCount: decalPallet.length,
    xmlDistinctRefs: xmlNameRefs.size,
    xmlRefsMissingFromRegistry: unknownXmlRefs.length,
    objectUrlRefsNotInRegistry: Object.keys(embeddedUrls).length,
    repoRequiredCount: repoRequired.size,
    repoRequiredMissingFromSave: repoNotInSave.length,
    byCategory: [...byCategory.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([category, data]) => ({ category, count: data.count })),
    pruneHintCounts: {
      keep: assets.filter((a) => a.pruneHint === "keep").length,
      review: assets.filter((a) => a.pruneHint === "review").length,
      candidate_prune: assets.filter((a) => a.pruneHint === "candidate_prune").length,
    },
  };

  return {
    summary,
    customUiAssets: assets,
    decalPallet,
    unknownXmlRefs,
    repoRequiredMissingFromSave: repoNotInSave,
    embeddedUrls: Object.values(embeddedUrls),
  };
}

/**
 * @param {ReturnType<typeof buildReport>} report
 * @returns {string}
 */
function formatMarkdownSummary(report) {
  const lines = [
    "# TTS save asset report",
    "",
    "## Summary",
    "",
    `- Custom UI registry (\`${report.summary.customUiField}\`): **${report.summary.customUiCount}** entries`,
    `- Decal pallet: **${report.summary.decalPalletCount}**`,
    `- Distinct XmlUI asset ids: **${report.summary.xmlDistinctRefs}** (${report.summary.xmlRefsMissingFromRegistry} not in registry)`,
    `- Object URLs not in registry: **${report.summary.objectUrlRefsNotInRegistry}**`,
    `- Repo-required names: **${report.summary.repoRequiredCount}** (${report.summary.repoRequiredMissingFromSave} missing from save)`,
    "",
    "### By category",
    "",
    "| Category | Count |",
    "| --- | ---: |",
  ];

  for (const row of report.summary.byCategory) {
    lines.push(`| ${row.category} | ${row.count} |`);
  }

  lines.push(
    "",
    "### Prune hints (Custom UI only)",
    "",
    "| Hint | Count | Meaning |",
    "| --- | ---: | --- |",
    `| keep | ${report.summary.pruneHintCounts.keep} | Referenced in save and/or repo sources |`,
    `| review | ${report.summary.pruneHintCounts.review} | Only found as quoted string in bundled save Lua |`,
    `| candidate_prune | ${report.summary.pruneHintCounts.candidate_prune} | No references detected — safe to review first |`,
    "",
  );

  if (report.unknownXmlRefs.length > 0) {
    lines.push("## XmlUI refs not in Custom UI registry (sample)", "");
    for (const name of report.unknownXmlRefs.slice(0, 40)) {
      lines.push(`- \`${name}\``);
    }
    if (report.unknownXmlRefs.length > 40) {
      lines.push(`- … and ${report.unknownXmlRefs.length - 40} more`);
    }
    lines.push("");
  }

  if (report.repoRequiredMissingFromSave.length > 0) {
    lines.push("## Repo expects asset but save lacks it (sample)", "");
    for (const name of report.repoRequiredMissingFromSave.slice(0, 40)) {
      lines.push(`- \`${name}\``);
    }
    if (report.repoRequiredMissingFromSave.length > 40) {
      lines.push(`- … and ${report.repoRequiredMissingFromSave.length - 40} more`);
    }
    lines.push("");
  }

  const candidates = report.customUiAssets
    .filter((a) => a.pruneHint === "candidate_prune")
    .slice(0, 50);
  if (candidates.length > 0) {
    lines.push("## candidate_prune (first 50)", "");
    for (const row of candidates) {
      lines.push(`- \`${row.name}\` (${row.category}) — ${row.url}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * @param {string} filePath
 * @returns {Set<string>}
 */
function readPruneNameSet(filePath) {
  if (!fs.existsSync(filePath)) {
    return new Set();
  }
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/u);
  /** @type {Set<string>} */
  const names = new Set();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    names.add(trimmed);
  }
  return names;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(args.repoRoot || process.cwd());
  const scanRepo = args.noRepo !== "1";
  const pruneListPath = path.resolve(
    args.pruneList || path.join(repoRoot, ".dev", "custom-ui-assets", "prune-custom-ui-assets.txt"),
  );
  const pruneNames = readPruneNameSet(pruneListPath);

  let savePath;
  if (args.save) {
    savePath = path.resolve(args.save);
  } else {
    const saveInput = args.saveName || "230";
    const resolved = resolveSavePath(saveInput, args.savesDir);
    savePath = resolved.savePath;
  }

  if (!fs.existsSync(savePath)) {
    throw new Error(`Save file does not exist: ${savePath}`);
  }

  const saveRootRaw = readJson(savePath);
  if (saveRootRaw === null || typeof saveRootRaw !== "object" || Array.isArray(saveRootRaw)) {
    throw new Error("Save root JSON must be an object.");
  }

  const saveRoot = /** @type {Record<string, unknown>} */ (saveRootRaw);
  const report = buildReport(saveRoot, repoRoot, scanRepo, pruneNames);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultOutDir = path.join(repoRoot, ".dev", "build-logs");
  const baseName = args.outBasename || `save-assets-${stamp}`;
  const jsonOut = args.jsonOut
    ? path.resolve(args.jsonOut)
    : path.join(defaultOutDir, `${baseName}.json`);
  const csvOut = args.csvOut
    ? path.resolve(args.csvOut)
    : path.join(defaultOutDir, `${baseName}.csv`);
  const mdOut = args.mdOut
    ? path.resolve(args.mdOut)
    : path.join(defaultOutDir, `${baseName}.md`);

  const pruneListedInSave = report.customUiAssets.filter((a) => a.listedInPruneFile).length;
  const pruneListedMissing = [...pruneNames].filter(
    (name) => !report.customUiAssets.some((a) => a.name === name),
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    savePath,
    repoRoot: scanRepo ? repoRoot : null,
    pruneListPath,
    pruneListCount: pruneNames.size,
    pruneListedInSave,
    pruneListedMissingFromSave: pruneListedMissing,
    ...report,
  };

  writeText(jsonOut, `${JSON.stringify(payload, null, 2)}\n`);

  const csvHeader = [
    "pruneHint",
    "listedInPruneFile",
    "category",
    "name",
    "index",
    "type",
    "urlHost",
    "xmlUsage",
    "referenceSources",
    "xmlRefCount",
    "inRepoSources",
    "url",
  ];
  const csvLines = [toCsvRow(csvHeader)];
  for (const row of report.customUiAssets) {
    csvLines.push(toCsvRow([
      row.pruneHint,
      row.listedInPruneFile ? "yes" : "no",
      row.category,
      row.name,
      row.index,
      row.type,
      row.urlHost,
      row.xmlUsage,
      (/** @type {string[]} */ (row.referenceSources)).join("|"),
      row.xmlRefCount,
      row.inRepoSources ? "yes" : "no",
      row.url,
    ]));
  }
  writeText(csvOut, `${csvLines.join("\n")}\n`);

  writeText(mdOut, formatMarkdownSummary(report));

  console.log(`Save: ${savePath}`);
  console.log(`Custom UI: ${report.summary.customUiCount} (${report.summary.customUiField})`);
  console.log(`Decal pallet: ${report.summary.decalPalletCount}`);
  console.log("By category:");
  for (const row of report.summary.byCategory) {
    console.log(`  ${row.category}: ${row.count}`);
  }
  console.log("Prune hints:", report.summary.pruneHintCounts);
  console.log(`Prune list (${pruneListPath}): ${pruneNames.size} names, ${pruneListedInSave} found in save`);
  if (pruneListedMissing.length > 0) {
    console.log(`  ${pruneListedMissing.length} prune-list names not in save (legacy/stale names)`);
  }
  const dynamicOnly = report.customUiAssets.filter((a) => a.xmlUsage === "dynamic_only").length;
  console.log(`XmlUI usage: dynamic_only (repo/Lua, not in bundled HUD XML): ${dynamicOnly}`);
  console.log("");
  console.log(`JSON: ${jsonOut}`);
  console.log(`CSV:  ${csvOut}`);
  console.log(`MD:   ${mdOut}`);
}

main();
