/**
 * Debounced mirror: `.tts/output/**` → `.dev/.debug/**` (relative paths preserved).
 * Survives Sebaestschjin TTS Editor purges of `.tts/` by copying on add/change.
 *
 * Run from repo root: npm run debug:mirror
 * Env: TTS_DEBUG_MIRROR_DEBOUNCE_MS (default 150)
 */
"use strict";

const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

const DEBOUNCE_MS = (() => {
  const raw = process.env.TTS_DEBUG_MIRROR_DEBOUNCE_MS;
  if (raw == null || raw === "") {
    return 150;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 150;
})();

/**
 * @param {string} projectRoot
 * @param {string} srcRoot
 * @param {string} destRoot
 * @param {string} absPath
 * @returns {string|null}
 */
function relativeUnderOutput(absPath, srcRoot) {
  const rel = path.relative(srcRoot, absPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return null;
  }
  return rel.split(path.sep).join("/");
}

/**
 * @param {string} srcFile
 * @param {string} destFile
 */
function copyOneFile(srcFile, destFile) {
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.copyFileSync(srcFile, destFile);
}

/**
 * @param {string} projectRoot
 */
function initialMirror(projectRoot) {
  const srcRoot = path.join(projectRoot, ".tts", "output");
  const destRoot = path.join(projectRoot, ".dev", ".debug");
  if (!fs.existsSync(srcRoot)) {
    return;
  }
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.isFile()) {
        const rel = relativeUnderOutput(full, srcRoot);
        if (rel) {
          copyOneFile(full, path.join(destRoot, rel));
        }
      }
    }
  };
  walk(srcRoot);
}

function main() {
  const projectRoot = path.resolve(__dirname, "..", "..");
  const srcRoot = path.join(projectRoot, ".tts", "output");
  const destRoot = path.join(projectRoot, ".dev", ".debug");

  fs.mkdirSync(destRoot, { recursive: true });
  initialMirror(projectRoot);

  /** @type {Map<string, ReturnType<typeof setTimeout>>} */
  const timers = new Map();

  /**
   * @param {string} absPath
   */
  const scheduleCopy = (absPath) => {
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      return;
    }
    const rel = relativeUnderOutput(absPath, srcRoot);
    if (!rel) {
      return;
    }
    const prev = timers.get(rel);
    if (prev) {
      clearTimeout(prev);
    }
    const t = setTimeout(() => {
      timers.delete(rel);
      try {
        copyOneFile(absPath, path.join(destRoot, rel));
      } catch (err) {
        console.error(`[tts-output-mirror] copy failed ${rel}:`, err);
      }
    }, DEBOUNCE_MS);
    timers.set(rel, t);
  };

  const watcher = chokidar.watch(srcRoot, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 80,
      pollInterval: 50,
    },
  });

  watcher.on("add", scheduleCopy);
  watcher.on("change", scheduleCopy);

  watcher.on("ready", () => {
    console.log(
      `[tts-output-mirror] watching .tts/output → .dev/.debug (debounce ${String(DEBOUNCE_MS)}ms)`,
    );
  });

  watcher.on("error", (err) => {
    console.error("[tts-output-mirror] watcher error:", err);
  });
}

main();
