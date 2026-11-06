"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const TRANSIENT_WINDOWS_ERRORS = new Set(["EBUSY", "EPERM", "EACCES", "UNKNOWN"]);
const DELAYS = [50, 100, 200, 400, 800];
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Offline code generation only. Never truncate the published module, and avoid
// opening it for writing when a watcher/editor already has identical contents.
function writeGeneratedFile(file, text, { io = fs, platform = process.platform, wait = sleep } = {}) {
  const retry = action => {
    for (let attempt = 0; ; attempt++) {
      try { return action(); } catch (error) {
        if (platform !== "win32" || !TRANSIENT_WINDOWS_ERRORS.has(error.code) || attempt >= DELAYS.length) throw error;
        wait(DELAYS[attempt]);
      }
    }
  };
  try {
    if (retry(() => io.readFileSync(file, "utf8")) === text) return false;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  io.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  let failure;
  try {
    io.writeFileSync(temporary, text, { encoding: "utf8", flag: "wx" });
    retry(() => io.renameSync(temporary, file));
    return true;
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    try { retry(() => io.rmSync(temporary, { force: true })); } catch (error) {
      if (!failure) throw error;
      failure.message += ` (temporary-file cleanup also failed: ${error.message})`;
    }
  }
}

module.exports = { writeGeneratedFile };
