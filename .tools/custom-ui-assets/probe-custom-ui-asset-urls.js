"use strict";

/**
 * Probe Custom UI / Loading-bar URLs for Content-Type and Content-Length.
 *
 * Inputs (pick one):
 *   --dump <path>     DEBUG.dumpCustomAssetsToFile JSON
 *                     (tries .dev/.debug/… then .tts/output/…)
 *   --saveName <id>   Live save via tts-assets.config.json — **Loading model**
 *                     (global CustomUIAssets + ObjectStates images + nested
 *                     object CustomUIAssets). Use --globalOnly for Global only.
 *   --save <path>     Same as --saveName but explicit save JSON path
 *   --urls <file>     Text file, one URL per line (optional `name\turl`)
 *
 * Usage (repo root):
 *   npm run custom-ui-assets:probe-urls -- --saveName 230
 *   npm run custom-ui-assets:probe-urls -- --saveName 230 --out .dev/.debug/loading_urls_probe.csv
 *   npm run custom-ui-assets:probe-urls -- --dump .tts/output/debug_logs/custom_ui_assets.json
 *
 * Loading model matches `.tools/tts-save/list-save-loading-assets.js`
 * (same formula as TTS Loading N/M for this mod).
 *
 * Agent guidance: .dev/DEBUG_FILE_LOGGING.md; Join-Load Inventory.md
 */

const fs = require("fs");
const path = require("path");
const {
  findExistingConfig,
} = require("./lib/tts-assets-config.js");
const {
  resolveExistingSave,
} = require("./lib/custom-ui-assets-save.js");
const {
  buildLoadingInventory,
  loadGGuidsRegistry,
} = require("../tts-save/list-save-loading-assets.js");

const DEFAULT_DUMP_CANDIDATES = [
  path.join(".dev", ".debug", "debug_logs", "custom_ui_assets.json"),
  path.join(".tts", "output", "debug_logs", "custom_ui_assets.json"),
];

/**
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
 * @param {number} n
 * @returns {string}
 */
function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) {
    return "?";
  }
  if (n < 1024) {
    return `${n} B`;
  }
  const units = ["KB", "MB", "GB"];
  let v = n;
  let u = -1;
  do {
    v /= 1024;
    u += 1;
  } while (v >= 1024 && u < units.length - 1);
  return `${v.toFixed(v >= 10 || u === 0 ? 1 : 2)} ${units[u]}`;
}

/**
 * @param {unknown} entry
 * @returns {{ name: string, url: string, source: string } | null}
 */
function normalizeEntry(entry, source) {
  if (typeof entry === "string" && /^https?:\/\//i.test(entry)) {
    return { name: "", url: entry, source: source || "url" };
  }
  if (entry == null || typeof entry !== "object") {
    return null;
  }
  const rec = /** @type {Record<string, unknown>} */ (entry);
  const nameRaw = rec.name ?? rec.Name;
  const urlRaw = rec.url ?? rec.URL;
  const name = typeof nameRaw === "string" ? nameRaw : "";
  const url = typeof urlRaw === "string" ? urlRaw : "";
  if (url === "") {
    return null;
  }
  return { name, url, source: source || "entry" };
}

/**
 * @param {string} filePath
 * @returns {{ name: string, url: string, source: string }[]}
 */
function loadFromDump(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object" && Array.isArray(raw.assets)) {
    list = raw.assets;
  } else {
    throw new Error(
      `Unrecognized dump shape in ${filePath} (want { assets: [...] } or an array)`,
    );
  }
  /** @type {{ name: string, url: string, source: string }[]} */
  const out = [];
  for (const entry of list) {
    const norm = normalizeEntry(entry, "dump:global");
    if (norm) {
      out.push(norm);
    }
  }
  return out;
}

/**
 * Collect nested object-local CustomUIAssets (object XmlUI; not in Loading N/M
 * formula but still downloaded for object UI).
 * @param {unknown} node
 * @param {string} pathLabel
 * @param {{ name: string, url: string, source: string }[]} out
 */
function collectNestedObjectCustomUi(node, pathLabel, out) {
  if (!node || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      collectNestedObjectCustomUi(node[i], `${pathLabel}[${i}]`, out);
    }
    return;
  }
  const obj = /** @type {Record<string, unknown>} */ (node);
  const guid = typeof obj.GUID === "string" ? obj.GUID : "";
  const nickname = typeof obj.Nickname === "string" ? obj.Nickname : "";
  const name = typeof obj.Name === "string" ? obj.Name : "";
  const label = nickname || name || guid || pathLabel;
  if (Array.isArray(obj.CustomUIAssets)) {
    for (const entry of obj.CustomUIAssets) {
      const norm = normalizeEntry(entry, `object_ui:${label}`);
      if (norm) {
        out.push(norm);
      }
    }
  }
  if (Array.isArray(obj.ContainedObjects)) {
    collectNestedObjectCustomUi(obj.ContainedObjects, `${pathLabel}.ContainedObjects`, out);
  }
}

/**
 * Global CustomUIAssets only (legacy).
 * @param {string} filePath
 * @returns {{ name: string, url: string, source: string }[]}
 */
function loadFromSaveGlobalOnly(filePath) {
  const save = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const list = Array.isArray(save.CustomUIAssets)
    ? save.CustomUIAssets
    : Array.isArray(save.CustomAssets)
      ? save.CustomAssets
      : null;
  if (!list) {
    throw new Error(`No CustomUIAssets/CustomAssets array in ${filePath}`);
  }
  /** @type {{ name: string, url: string, source: string }[]} */
  const out = [];
  for (const entry of list) {
    const norm = normalizeEntry(entry, "global");
    if (norm) {
      out.push(norm);
    }
  }
  return out;
}

/**
 * Full Loading-bar model + nested object CustomUIAssets (+ optional extras).
 * @param {string} filePath
 * @param {{ includeExtras?: boolean, repoRoot?: string }} opts
 * @returns {{
 *   entries: { name: string, url: string, source: string }[],
 *   summary: Record<string, unknown>,
 * }}
 */
function loadFromSaveLoading(filePath, opts) {
  const includeExtras = opts.includeExtras === true;
  const repoRoot = opts.repoRoot || process.cwd();
  const save = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (save === null || typeof save !== "object" || Array.isArray(save)) {
    throw new Error(`Save root must be an object: ${filePath}`);
  }
  const saveRoot = /** @type {Record<string, unknown>} */ (save);
  const gGuids = loadGGuidsRegistry(repoRoot);
  const { loadingRows, extraRows, summary } = buildLoadingInventory(
    saveRoot,
    gGuids,
    includeExtras,
  );

  /** @type {{ name: string, url: string, source: string }[]} */
  const out = [];

  /**
   * @param {Record<string, unknown>} row
   * @param {string} kind
   */
  function pushRow(row, kind) {
    const name = typeof row.customAssetName === "string"
      ? row.customAssetName
      : typeof row.objectNickname === "string" && row.objectNickname !== ""
        ? String(row.objectNickname)
        : typeof row.objectName === "string"
          ? String(row.objectName)
          : "";
    const bucket = typeof row.bucket === "string" ? row.bucket : kind;
    const guid = typeof row.objectGuid === "string" && row.objectGuid !== ""
      ? `:${row.objectGuid}`
      : "";
    const source = `${bucket}${guid}`;
    const primary = typeof row.primaryUrl === "string" ? row.primaryUrl : "";
    const secondary = typeof row.secondaryUrl === "string" ? row.secondaryUrl : "";
    if (primary) {
      out.push({ name, url: primary, source });
    }
    if (secondary && secondary !== primary) {
      out.push({ name: `${name} (secondary)`, url: secondary, source: `${source}:secondary` });
    }
  }

  for (const row of loadingRows) {
    pushRow(/** @type {Record<string, unknown>} */ (row), "loading");
  }
  if (includeExtras) {
    for (const row of extraRows) {
      pushRow(/** @type {Record<string, unknown>} */ (row), "extra");
    }
  }

  collectNestedObjectCustomUi(saveRoot.ObjectStates, "ObjectStates", out);

  return { entries: out, summary };
}

/**
 * @param {string} filePath
 * @returns {{ name: string, url: string, source: string }[]}
 */
function loadFromUrlList(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  /** @type {{ name: string, url: string, source: string }[]} */
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    if (trimmed.includes("\t")) {
      const [name, url] = trimmed.split("\t");
      const norm = normalizeEntry({ name, url }, "urls");
      if (norm) {
        out.push(norm);
      }
      continue;
    }
    const norm = normalizeEntry(trimmed, "urls");
    if (norm) {
      out.push(norm);
    }
  }
  return out;
}

/**
 * @returns {string | null}
 */
function resolveDefaultDumpPath() {
  for (const rel of DEFAULT_DUMP_CANDIDATES) {
    const abs = path.resolve(rel);
    if (fs.existsSync(abs)) {
      return abs;
    }
  }
  return null;
}

/**
 * @param {Headers} headers
 * @returns {{ contentType: string, contentLength: number | null }}
 */
function readMeta(headers) {
  const contentType = (headers.get("content-type") || "").split(";")[0].trim();
  const cr = headers.get("content-range") || "";
  const crMatch = /\/(\d+)\s*$/.exec(cr);
  if (crMatch) {
    const total = Number(crMatch[1]);
    if (Number.isFinite(total)) {
      return { contentType, contentLength: total };
    }
  }
  const lenRaw = headers.get("content-length");
  const contentLength =
    lenRaw != null && lenRaw !== "" && Number.isFinite(Number(lenRaw))
      ? Number(lenRaw)
      : null;
  return { contentType, contentLength };
}

/**
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<{
 *   ok: boolean,
 *   status: number,
 *   method: string,
 *   contentType: string,
 *   contentLength: number | null,
 *   error: string,
 * }>}
 */
async function probeUrl(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  /**
   * @param {string} method
   * @param {Record<string, string>} [extraHeaders]
   */
  async function attempt(method, extraHeaders) {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: extraHeaders,
    });
    const meta = readMeta(res.headers);
    // Some hosts omit Content-Length on HEAD; try Range GET.
    if (
      method === "HEAD" &&
      (meta.contentLength == null || res.status === 405 || res.status === 501)
    ) {
      return null;
    }
    return {
      ok: res.ok || res.status === 206,
      status: res.status,
      method,
      contentType: meta.contentType,
      contentLength: meta.contentLength,
      error: res.ok || res.status === 206 ? "" : `HTTP ${res.status}`,
    };
  }

  try {
    const head = await attempt("HEAD");
    if (head && head.contentLength != null) {
      return head;
    }
    const ranged = await attempt("GET", { Range: "bytes=0-0" });
    if (ranged) {
      // Content-Range: bytes 0-0/12345
      // Prefer total size from Content-Range when present.
      return ranged;
    }
    // Last resort: GET body (avoid for huge files — only if HEAD/Range failed entirely)
    const full = await attempt("GET");
    if (full) {
      return full;
    }
    return {
      ok: false,
      status: 0,
      method: "NONE",
      contentType: "",
      contentLength: null,
      error: "no response",
    };
  } catch (err) {
    const message = err && err.name === "AbortError" ? "timeout" : String(err && err.message ? err.message : err);
    return {
      ok: false,
      status: 0,
      method: "ERR",
      contentType: "",
      contentLength: null,
      error: message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Re-probe with GET Range and parse Content-Range total when length missing.
 * @param {string} url
 * @param {number} timeoutMs
 * @param {{ contentLength: number | null, contentType: string, status: number, method: string, ok: boolean, error: string }} base
 */
async function enrichWithContentRange(url, timeoutMs, base) {
  if (base.contentLength != null) {
    return base;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Range: "bytes=0-0" },
    });
    const cr = res.headers.get("content-range") || "";
    const m = /\/(\d+)\s*$/.exec(cr);
    const meta = readMeta(res.headers);
    const contentLength = m ? Number(m[1]) : meta.contentLength;
    return {
      ok: res.ok || res.status === 206,
      status: res.status,
      method: "GET-Range",
      contentType: meta.contentType || base.contentType,
      contentLength: Number.isFinite(contentLength) ? contentLength : null,
      error: res.ok || res.status === 206 ? base.error : `HTTP ${res.status}`,
    };
  } catch {
    return base;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<void>} worker
 */
async function mapPool(items, concurrency, worker) {
  let next = 0;
  const runners = [];
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  for (let r = 0; r < n; r += 1) {
    runners.push(
      (async () => {
        while (next < items.length) {
          const i = next;
          next += 1;
          await worker(items[i], i);
        }
      })(),
    );
  }
  await Promise.all(runners);
}

/**
 * @param {string} value
 * @returns {string}
 */
function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function printUsage() {
  console.error(`Usage:
  node .tools/custom-ui-assets/probe-custom-ui-asset-urls.js [options]

Options:
  --dump <path>         DEBUG.dumpCustomAssetsToFile JSON
                        (default: first existing of ${DEFAULT_DUMP_CANDIDATES.join(" | ")})
  --saveName <id>       Live save — Loading model (global UI + object images + nested object UI)
  --save <path>         Same Loading model from an explicit save JSON path
  --globalOnly          With --save / --saveName: Global CustomUIAssets only (no objects)
  --includeExtras       Also probe asset bundles / sky / decal pallet (excluded from Loading N/M)
  --urls <path>         Text file of URLs (optional name\\turl lines)
  --concurrency <n>     Parallel probes (default: 8)
  --timeoutMs <n>       Per-URL timeout (default: 20000)
  --out <path>          Write CSV report
  --jsonOut <path>      Write JSON report

Examples:
  npm run custom-ui-assets:probe-urls -- --saveName 230 --out .dev/.debug/loading_urls_probe.csv
  npm run custom-ui-assets:probe-urls -- --dump .tts/output/debug_logs/custom_ui_assets.json
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === "1" || args.h === "1") {
    printUsage();
    process.exit(0);
  }

  const concurrency = Math.max(1, Number(args.concurrency || 8) || 8);
  const timeoutMs = Math.max(1000, Number(args.timeoutMs || 20000) || 20000);
  const globalOnly = args.globalOnly === "1";
  const includeExtras = args.includeExtras === "1";

  /** @type {{ name: string, url: string, source: string }[]} */
  let entries;
  /** @type {Record<string, unknown> | null} */
  let loadingSummary = null;

  if (args.urls) {
    entries = loadFromUrlList(path.resolve(args.urls));
  } else if (args.save || args.saveName) {
    let savePath;
    if (args.save) {
      savePath = path.resolve(args.save);
    } else {
      const existing = findExistingConfig();
      if (!existing) {
        throw new Error("No tts-assets.config.json — run npm run tts-assets:configure");
      }
      savePath = resolveExistingSave(args.saveName, undefined, existing.config);
    }
    if (globalOnly) {
      entries = loadFromSaveGlobalOnly(savePath);
      console.error(`[probe] Global CustomUIAssets only from ${savePath}`);
    } else {
      const loaded = loadFromSaveLoading(savePath, {
        includeExtras,
        repoRoot: process.cwd(),
      });
      entries = loaded.entries;
      loadingSummary = loaded.summary;
      console.error(
        `[probe] Loading model from ${savePath}: ` +
          `${loadingSummary.loadingBarTotal} loading rows ` +
          `(${loadingSummary.customUiGlobalCount} UI + ${loadingSummary.objectStateLoadingCount} objects)` +
          (includeExtras ? " + extras" : ""),
      );
    }
  } else {
    const dumpPath = args.dump
      ? path.resolve(args.dump)
      : resolveDefaultDumpPath();
    if (!dumpPath || !fs.existsSync(dumpPath)) {
      printUsage();
      throw new Error(
        `Dump not found. Tried: ${(args.dump && path.resolve(args.dump)) || DEFAULT_DUMP_CANDIDATES.join(", ")}\n` +
          `Run in TTS: lua DEBUG.dumpCustomAssetsToFile()\n` +
          `Or probe a save: npm run custom-ui-assets:probe-urls -- --saveName 230`,
      );
    }
    entries = loadFromDump(dumpPath);
    console.error(`[probe] Dump ${dumpPath}`);
  }

  // Dedupe by URL, keep first name + source; count refs
  /** @type {Map<string, { name: string, source: string, refs: number }>} */
  const byUrl = new Map();
  for (const e of entries) {
    const prev = byUrl.get(e.url);
    if (!prev) {
      byUrl.set(e.url, { name: e.name, source: e.source, refs: 1 });
    } else {
      prev.refs += 1;
    }
  }
  const unique = [...byUrl.entries()].map(([url, meta]) => ({
    name: meta.name,
    url,
    source: meta.source,
    refs: meta.refs,
  }));

  console.error(`[probe] ${entries.length} listed → ${unique.length} unique URL(s), concurrency=${concurrency}`);

  /** @type {Array<{
   *   name: string,
   *   url: string,
   *   source: string,
   *   refs: number,
   *   ok: boolean,
   *   status: number,
   *   method: string,
   *   contentType: string,
   *   contentLength: number | null,
   *   sizeHuman: string,
   *   error: string,
   * }>} */
  const rows = new Array(unique.length);

  let done = 0;
  await mapPool(unique, concurrency, async (item, index) => {
    let result = await probeUrl(item.url, timeoutMs);
    if (result.contentLength == null) {
      result = await enrichWithContentRange(item.url, timeoutMs, result);
    }
    rows[index] = {
      name: item.name,
      url: item.url,
      source: item.source,
      refs: item.refs,
      ok: result.ok,
      status: result.status,
      method: result.method,
      contentType: result.contentType,
      contentLength: result.contentLength,
      sizeHuman: formatBytes(result.contentLength == null ? NaN : result.contentLength),
      error: result.error,
    };
    done += 1;
    if (done % 25 === 0 || done === unique.length) {
      console.error(`[probe] ${done}/${unique.length}`);
    }
  });

  rows.sort((a, b) => (b.contentLength || 0) - (a.contentLength || 0));

  let totalBytes = 0;
  let known = 0;
  let failed = 0;
  /** @type {Record<string, { count: number, bytes: number }>} */
  const byType = {};
  /** @type {Record<string, { count: number, bytes: number }>} */
  const bySourcePrefix = {};

  for (const row of rows) {
    if (!row.ok || row.contentLength == null) {
      failed += 1;
    }
    if (row.contentLength != null) {
      totalBytes += row.contentLength;
      known += 1;
    }
    const t = row.contentType || "(unknown)";
    if (!byType[t]) {
      byType[t] = { count: 0, bytes: 0 };
    }
    byType[t].count += 1;
    byType[t].bytes += row.contentLength || 0;

    const prefix = String(row.source || "").split(":")[0] || "(unknown)";
    if (!bySourcePrefix[prefix]) {
      bySourcePrefix[prefix] = { count: 0, bytes: 0 };
    }
    bySourcePrefix[prefix].count += 1;
    bySourcePrefix[prefix].bytes += row.contentLength || 0;
  }

  console.log("");
  console.log("name\tsize\ttype\tsource\trefs\tstatus\turl");
  const show = rows.slice(0, 40);
  for (const row of show) {
    console.log(
      [
        row.name || "(unnamed)",
        row.sizeHuman,
        row.contentType || "?",
        row.source,
        row.refs,
        row.ok ? String(row.status) : `ERR:${row.error || row.status}`,
        row.url,
      ].join("\t"),
    );
  }
  if (rows.length > show.length) {
    console.log(`… ${rows.length - show.length} more (see --out / --jsonOut)`);
  }

  console.log("");
  console.log("=== Summary ===");
  if (loadingSummary) {
    console.log(
      `Loading N/M model rows: ${loadingSummary.loadingBarTotal} ` +
        `(UI ${loadingSummary.customUiGlobalCount} + objects ${loadingSummary.objectStateLoadingCount})`,
    );
  }
  console.log(`Unique URLs: ${rows.length}  sized: ${known}  failed/unknown: ${failed}`);
  console.log(`Total (known Content-Length): ${formatBytes(totalBytes)} (${totalBytes} bytes)`);
  console.log("By source prefix:");
  for (const [k, info] of Object.entries(bySourcePrefix).sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`  ${k}: ${info.count} URL(s), ${formatBytes(info.bytes)}`);
  }
  console.log("By Content-Type:");
  const typeRows = Object.entries(byType).sort((a, b) => b[1].bytes - a[1].bytes);
  for (const [t, info] of typeRows) {
    console.log(`  ${t}: ${info.count} file(s), ${formatBytes(info.bytes)}`);
  }

  if (args.out) {
    const outPath = path.resolve(args.out);
    const lines = [
      "name,url,source,refs,ok,status,method,contentType,contentLength,sizeHuman,error",
    ];
    for (const row of rows) {
      lines.push(
        [
          csvEscape(row.name),
          csvEscape(row.url),
          csvEscape(row.source),
          row.refs,
          row.ok ? "1" : "0",
          row.status,
          csvEscape(row.method),
          csvEscape(row.contentType),
          row.contentLength == null ? "" : row.contentLength,
          csvEscape(row.sizeHuman),
          csvEscape(row.error),
        ].join(","),
      );
    }
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
    console.error(`[probe] Wrote CSV ${outPath}`);
  }

  if (args.jsonOut) {
    const outPath = path.resolve(args.jsonOut);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      `${JSON.stringify(
        {
          probedAt: new Date().toISOString(),
          loadingSummary,
          totalBytes,
          known,
          failed,
          byType,
          bySourcePrefix,
          rows,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.error(`[probe] Wrote JSON ${outPath}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
}
