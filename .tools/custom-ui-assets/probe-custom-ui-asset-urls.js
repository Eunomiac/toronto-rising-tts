"use strict";

/**
 * Probe CustomUIAsset URLs for Content-Type and Content-Length.
 *
 * Inputs (pick one):
 *   --dump <path>   DEBUG.dumpCustomAssetsToFile JSON (default:
 *                   .dev/.debug/debug_logs/custom_ui_assets.json)
 *   --save <path>   TTS save JSON (reads root CustomUIAssets / CustomAssets)
 *   --urls <file>   Text file, one URL per line (optional `name\turl`)
 *
 * Usage (repo root):
 *   npm run custom-ui-assets:probe-urls
 *   npm run custom-ui-assets:probe-urls -- --dump .dev/.debug/debug_logs/custom_ui_assets.json
 *   npm run custom-ui-assets:probe-urls -- --saveName 230 --concurrency 12 --out .dev/.debug/custom_ui_assets_probe.csv
 *
 * Agent guidance: .dev/DEBUG_FILE_LOGGING.md; .dev/Multiplayer Functionality/Join-Load Inventory.md
 */

const fs = require("fs");
const path = require("path");
const {
  findExistingConfig,
} = require("./lib/tts-assets-config.js");
const {
  resolveExistingSave,
} = require("./lib/custom-ui-assets-save.js");

const DEFAULT_DUMP = path.join(
  ".dev",
  ".debug",
  "debug_logs",
  "custom_ui_assets.json",
);

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
 * @returns {{ name: string, url: string } | null}
 */
function normalizeEntry(entry) {
  if (typeof entry === "string" && /^https?:\/\//i.test(entry)) {
    return { name: "", url: entry };
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
  return { name, url };
}

/**
 * @param {string} filePath
 * @returns {{ name: string, url: string }[]}
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
  /** @type {{ name: string, url: string }[]} */
  const out = [];
  for (const entry of list) {
    const norm = normalizeEntry(entry);
    if (norm) {
      out.push(norm);
    }
  }
  return out;
}

/**
 * @param {string} filePath
 * @returns {{ name: string, url: string }[]}
 */
function loadFromSave(filePath) {
  const save = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const list = Array.isArray(save.CustomUIAssets)
    ? save.CustomUIAssets
    : Array.isArray(save.CustomAssets)
      ? save.CustomAssets
      : null;
  if (!list) {
    throw new Error(`No CustomUIAssets/CustomAssets array in ${filePath}`);
  }
  /** @type {{ name: string, url: string }[]} */
  const out = [];
  for (const entry of list) {
    const norm = normalizeEntry(entry);
    if (norm) {
      out.push(norm);
    }
  }
  return out;
}

/**
 * @param {string} filePath
 * @returns {{ name: string, url: string }[]}
 */
function loadFromUrlList(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  /** @type {{ name: string, url: string }[]} */
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    if (trimmed.includes("\t")) {
      const [name, url] = trimmed.split("\t");
      const norm = normalizeEntry({ name, url });
      if (norm) {
        out.push(norm);
      }
      continue;
    }
    const norm = normalizeEntry(trimmed);
    if (norm) {
      out.push(norm);
    }
  }
  return out;
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
  --dump <path>         DEBUG.dumpCustomAssetsToFile JSON (default: ${DEFAULT_DUMP})
  --save <path>         TTS save JSON path
  --saveName <id>       Resolve live save via tts-assets.config.json
  --urls <path>         Text file of URLs (optional name\\turl lines)
  --concurrency <n>     Parallel probes (default: 8)
  --timeoutMs <n>       Per-URL timeout (default: 20000)
  --out <path>          Write CSV report
  --jsonOut <path>      Write JSON report
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

  /** @type {{ name: string, url: string }[]} */
  let entries;
  if (args.urls) {
    entries = loadFromUrlList(path.resolve(args.urls));
  } else if (args.save) {
    entries = loadFromSave(path.resolve(args.save));
  } else if (args.saveName) {
    const existing = findExistingConfig();
    if (!existing) {
      throw new Error("No tts-assets.config.json — run npm run tts-assets:configure");
    }
    const savePath = resolveExistingSave(args.saveName, undefined, existing.config);
    entries = loadFromSave(savePath);
  } else {
    const dumpPath = path.resolve(args.dump || DEFAULT_DUMP);
    if (!fs.existsSync(dumpPath)) {
      printUsage();
      throw new Error(
        `Dump not found: ${dumpPath}\nRun in TTS: lua DEBUG.dumpCustomAssetsToFile()`,
      );
    }
    entries = loadFromDump(dumpPath);
  }

  // Dedupe by URL, keep first name
  /** @type {Map<string, string>} */
  const byUrl = new Map();
  for (const e of entries) {
    if (!byUrl.has(e.url)) {
      byUrl.set(e.url, e.name);
    }
  }
  const unique = [...byUrl.entries()].map(([url, name]) => ({ name, url }));

  console.error(`[probe] ${unique.length} unique URL(s), concurrency=${concurrency}`);

  /** @type {Array<{
   *   name: string,
   *   url: string,
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
  }

  // Console report (top 30 by size + summary)
  console.log("");
  console.log("name\tsize\ttype\tstatus\turl");
  const show = rows.slice(0, 40);
  for (const row of show) {
    console.log(
      [
        row.name || "(unnamed)",
        row.sizeHuman,
        row.contentType || "?",
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
  console.log(`URLs: ${rows.length}  sized: ${known}  failed/unknown: ${failed}`);
  console.log(`Total (known Content-Length): ${formatBytes(totalBytes)} (${totalBytes} bytes)`);
  console.log("By Content-Type:");
  const typeRows = Object.entries(byType).sort((a, b) => b[1].bytes - a[1].bytes);
  for (const [t, info] of typeRows) {
    console.log(`  ${t}: ${info.count} file(s), ${formatBytes(info.bytes)}`);
  }

  if (args.out) {
    const outPath = path.resolve(args.out);
    const lines = [
      "name,url,ok,status,method,contentType,contentLength,sizeHuman,error",
    ];
    for (const row of rows) {
      lines.push(
        [
          csvEscape(row.name),
          csvEscape(row.url),
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
          totalBytes,
          known,
          failed,
          byType,
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

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
