#!/usr/bin/env node
/**
 * Object-script bundle size gate — catches sudden Save & Play payload regressions.
 *
 * Luabundles representative object entry points (no Save & Play required), compares
 * against hard byte ceilings and `.dev/build-logs/bundle-size-gate.json` baseline.
 *
 * Fails when:
 *   - bundled size exceeds per-entry maxBytes (absolute ceiling)
 *   - bundled size exceeds baseline + spike threshold (sudden growth)
 *   - forbidCore entries embed __bundle_register("core.*
 *   - dice_bag / tarot embed lib.constants
 *
 * Agent guidance: .dev/TTS_BUNDLING_SETUP.md; .cursor/rules/toronto-rising-object-script-bundling.mdc
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bundleString } = require("luabundle");

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const LOG_DIR = join(REPO_ROOT, ".dev", "build-logs");
const BASELINE_FILE = join(LOG_DIR, "bundle-size-gate.json");

/** Minimum absolute growth (bytes) before spike detection applies. */
const SPIKE_MIN_BYTES = 8 * 1024;
/** Fractional growth over baseline that counts as a spike (e.g. 0.2 = 20%). */
const SPIKE_RATIO = 0.2;

/**
 * Representative object-script entry points (see fix_tts_object_stubs LUA_STUB_RULES).
 * @type {Array<{
 *   id: string,
 *   entry: string,
 *   maxBytes: number,
 *   forbidCore?: boolean,
 *   forbidConstants?: boolean,
 * }>}
 */
const GATE_ENTRIES = [
  {
    id: "objects.dice_bag",
    entry: 'require("objects.dice_bag")\n',
    maxBytes: 80 * 1024,
    forbidCore: true,
    forbidConstants: true,
  },
  {
    id: "ui.ui_csheet",
    entry: 'require("ui.ui_csheet")\n',
    maxBytes: 120 * 1024,
    forbidCore: true,
  },
  {
    id: "ui.ui_csheet_page3",
    entry: 'require("ui.ui_csheet_page3")\n',
    maxBytes: 160 * 1024,
    forbidCore: true,
  },
  {
    id: "ui.ui_csheet_page4",
    entry: 'require("ui.ui_csheet_page4")\n',
    maxBytes: 200 * 1024,
    forbidCore: true,
  },
  {
    id: "ui.ui_csheet_page5",
    entry: 'require("ui.ui_csheet_page5")\n',
    maxBytes: 120 * 1024,
    forbidCore: true,
  },
  {
    id: "ui.ui_csheet_page6",
    entry: 'require("ui.ui_csheet_page6")\n',
    maxBytes: 120 * 1024,
    forbidCore: true,
  },
  {
    id: "ui.ui_signal_candle",
    entry: 'require("ui.ui_signal_candle")\n',
    maxBytes: 40 * 1024,
    forbidCore: true,
  },
  {
    id: "ui.ui_tarot_button",
    entry: 'require("ui.ui_tarot_button")\n',
    maxBytes: 100 * 1024,
    forbidCore: true,
    forbidConstants: true,
  },
  {
    id: "ui.ui_companion_toggle",
    entry: 'require("ui.ui_companion_toggle")\n',
    maxBytes: 20 * 1024,
    forbidCore: true,
    forbidConstants: true,
  },
  {
    id: "objects.npc_control_board",
    entry: 'require("objects.npc_control_board")\n',
    maxBytes: 10 * 1024,
    forbidCore: true,
  },
  {
    id: "objects.npc_control_board_palette",
    entry: 'require("objects.npc_control_board_palette")\n',
    maxBytes: 10 * 1024,
    forbidCore: true,
  },
  {
    id: "core.soundscape_emitter_object",
    entry: 'require("core.soundscape_emitter_object")\n',
    maxBytes: 50 * 1024,
    forbidCore: false,
  },
];

/**
 * @param {string} name
 * @returns {string|null}
 */
function resolveModule(name) {
  const rel = name.replace(/\./g, "/");
  for (const pattern of ["?.ttslua", "?.lua"]) {
    const candidate = join(REPO_ROOT, pattern.replace("?", rel));
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * @param {string} bundled
 * @returns {number}
 */
function countBundleModules(bundled) {
  const matches = bundled.match(/__bundle_register\(/g);
  return matches ? matches.length : 0;
}

/**
 * @param {string} bundled
 * @returns {boolean}
 */
function bundlesCoreModule(bundled) {
  return bundled.includes('__bundle_register("core.');
}

/**
 * @param {string} bundled
 * @returns {boolean}
 */
function bundlesLibConstants(bundled) {
  return bundled.includes('__bundle_register("lib.constants"');
}

/**
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

/**
 * @returns {Record<string, { id: string, bytes: number, modules: number }>}
 */
function measureAll() {
  /** @type {Record<string, { id: string, bytes: number, modules: number }>} */
  const out = {};
  for (const spec of GATE_ENTRIES) {
    const bundled = bundleString(spec.entry, {
      rootModuleName: "__root",
      paths: ["?.ttslua", "?.lua"],
      resolveModule,
      metadata: false,
    });
    const bytes = Buffer.byteLength(bundled, "utf8");
    out[spec.id] = {
      id: spec.id,
      bytes,
      modules: countBundleModules(bundled),
      bundled,
    };
  }
  return out;
}

/**
 * @returns {{ version: number, updated: string, entries: Record<string, { bytes: number, modules: number }> } | null}
 */
function readBaseline() {
  if (!existsSync(BASELINE_FILE)) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
    if (parsed && typeof parsed.entries === "object") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * @param {Record<string, { id: string, bytes: number, modules: number }>} measured
 */
function writeBaseline(measured) {
  mkdirSync(LOG_DIR, { recursive: true });
  const entries = {};
  for (const [id, row] of Object.entries(measured)) {
    entries[id] = { bytes: row.bytes, modules: row.modules };
  }
  const doc = {
    version: 1,
    updated: new Date().toISOString(),
    entries,
  };
  writeFileSync(BASELINE_FILE, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}

/**
 * @param {number} current
 * @param {number} baseline
 * @returns {boolean}
 */
function isSpikeOverBaseline(current, baseline) {
  const delta = current - baseline;
  if (delta <= 0) {
    return false;
  }
  const threshold = Math.max(SPIKE_MIN_BYTES, Math.floor(baseline * SPIKE_RATIO));
  return delta > threshold;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const quiet = args.has("--quiet");
  const writeOnly = args.has("--write-baseline");

  const measured = measureAll();
  const failures = [];

  for (const spec of GATE_ENTRIES) {
    const row = measured[spec.id];
    const bundled = row.bundled;
    delete row.bundled;

    if (row.bytes > spec.maxBytes) {
      failures.push(
        `${spec.id}: ${formatBytes(row.bytes)} exceeds hard ceiling ${formatBytes(spec.maxBytes)}`
      );
    }
    if (spec.forbidCore && bundlesCoreModule(bundled)) {
      failures.push(`${spec.id}: bundles core.* modules (object-script regression)`);
    }
    if (spec.forbidConstants && bundlesLibConstants(bundled)) {
      failures.push(`${spec.id}: bundles lib.constants (use thin object modules or Global.call)`);
    }
  }

  const baseline = readBaseline();

  if (baseline === null || writeOnly) {
    writeBaseline(measured);
    if (!quiet) {
      process.stdout.write(
        `[bundle-size-gate] ${baseline === null ? "First run" : "Baseline rewritten"} → ${relative(REPO_ROOT, BASELINE_FILE)}\n`
      );
      for (const spec of GATE_ENTRIES) {
        const row = measured[spec.id];
        process.stdout.write(
          `  ${spec.id}: ${formatBytes(row.bytes)} (${row.modules} modules)\n`
        );
      }
    }
    if (failures.length > 0) {
      process.stderr.write(
        ["[bundle-size-gate] FAILED (ceilings / heavy modules):", ...failures.map((f) => `  - ${f}`), ""].join(
          "\n"
        )
      );
      process.exitCode = 1;
    }
    return;
  }

  for (const spec of GATE_ENTRIES) {
    const row = measured[spec.id];
    const prev = baseline.entries[spec.id];
    if (!prev || typeof prev.bytes !== "number") {
      continue;
    }
    if (isSpikeOverBaseline(row.bytes, prev.bytes)) {
      failures.push(
        `${spec.id}: ${formatBytes(row.bytes)} spiked from baseline ${formatBytes(prev.bytes)} (+${formatBytes(row.bytes - prev.bytes)}; threshold ${formatBytes(Math.max(SPIKE_MIN_BYTES, Math.floor(prev.bytes * SPIKE_RATIO)))})`
      );
    }
  }

  if (failures.length > 0) {
    process.stderr.write(
      [
        "[bundle-size-gate] FAILED:",
        ...failures.map((f) => `  - ${f}`),
        `To approve intentional growth, run:`,
        `  npm run check:bundle-size-gate -- --write-baseline`,
        `or edit entries in ${relative(REPO_ROOT, BASELINE_FILE)}`,
        "",
      ].join("\n")
    );
    process.exitCode = 1;
    return;
  }

  writeBaseline(measured);
  if (!quiet) {
    process.stdout.write(`[bundle-size-gate] OK (${GATE_ENTRIES.length} object entry points) → ${relative(REPO_ROOT, BASELINE_FILE)}\n`);
    for (const spec of GATE_ENTRIES) {
      const row = measured[spec.id];
      const prev = baseline.entries[spec.id];
      const prevLabel =
        prev && typeof prev.bytes === "number" ? formatBytes(prev.bytes) : "—";
      process.stdout.write(
        `  ${spec.id}: ${formatBytes(row.bytes)} (baseline ${prevLabel}, ${row.modules} modules)\n`
      );
    }
  }
}

main();
