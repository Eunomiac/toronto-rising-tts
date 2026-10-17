"use strict";

/**
 * `npm run build:full`
 *
 * Runs the Full pipeline (daily save backup, silence soundscape emitters, then
 * build:all-tooling) and, when any step printed something worth reading, writes
 * .dev/build-logs/full-build-review.txt and opens it.
 */

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { REPO_ROOT, reviewLogPath, appendEntry, countEntries } = require("./log-file.cjs");

const CAPTURE = path.join(__dirname, "capture.cjs").replace(/\\/g, "/");
const PIPELINE =
  "npm run tts-save:backup-daily && npm run tts-save:silence-emitters && npm run build:all-tooling";

function childEnv() {
  const env = { ...process.env, TORONTO_RISING_BUILD_REVIEW: "1" };
  const requireFlag = `--require ${CAPTURE}`;
  const existing = env.NODE_OPTIONS || "";
  if (!existing.includes(CAPTURE)) {
    env.NODE_OPTIONS = `${existing} ${requireFlag}`.trim();
  }
  return env;
}

function clearLog() {
  const file = reviewLogPath();
  if (fs.existsSync(file)) fs.rmSync(file);
}

/**
 * @param {string} file
 * @returns {boolean} true when an editor or the default app accepted the file
 */
function openForReview(file) {
  const comspec = process.env.ComSpec || "cmd.exe";
  for (const cmd of ["cursor", "code"]) {
    const result = spawnSync(comspec, ["/d", "/s", "/c", cmd, "--reuse-window", file], {
      stdio: "ignore",
      windowsHide: true,
      timeout: 20000,
    });
    if (result.status === 0 || (result.error && result.error.code === "ETIMEDOUT")) return true;
  }
  if (process.platform === "win32") {
    const opened = spawn(comspec, ["/d", "/c", "start", "", file], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    opened.unref();
    return true;
  }
  return false;
}

let finished = false;

function finish(exitCode) {
  if (finished) return;
  finished = true;
  const file = reviewLogPath();
  if (exitCode !== 0 && !fs.existsSync(file)) {
    appendEntry(
      `The Full build stopped with exit code ${exitCode} before it printed a warning or error this log collects. The terminal output above has the rest.`,
    );
  }

  if (!fs.existsSync(file)) {
    console.log("Full build review: nothing to flag.");
    process.exit(exitCode);
  }

  const text = fs.readFileSync(file, "utf8");
  const count = countEntries(text);
  const rel = path.relative(REPO_ROOT, file);
  const opened = openForReview(file);
  const where = opened ? `Opened ${rel}` : `Could not open ${rel} — open that file yourself`;
  console.log(`Full build review: ${count} item(s). ${where}.`);
  process.exit(exitCode);
}

function main() {
  clearLog();
  const child = spawn(PIPELINE, {
    cwd: REPO_ROOT,
    env: childEnv(),
    stdio: "inherit",
    shell: true,
  });
  child.on("error", (err) => {
    appendEntry(`The Full build could not be started: ${err.message}`);
    finish(1);
  });
  child.on("close", (code) => {
    finish(code == null ? 1 : code);
  });
}

main();
