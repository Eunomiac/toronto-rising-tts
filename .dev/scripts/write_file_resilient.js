"use strict";

const fs = require("fs");
const path = require("path");

/** @param {number} ms */
function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* build-script sync backoff */
  }
}

/** @param {NodeJS.ErrnoException} err */
function isRetriableWriteError(err) {
  if (!err || typeof err !== "object") {
    return false;
  }
  const code = err.code;
  if (code === "EBUSY" || code === "EPERM" || code === "EACCES" || code === "UNKNOWN") {
    return true;
  }
  const errno = err.errno;
  return typeof errno === "number" && (errno === -4094 || errno === -4082);
}

function removeIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (_) {
    /* ignore cleanup failure */
  }
}

/**
 * Write UTF-8 with retries for Windows file locks (e.g. TTS Tools holding ui XML open).
 * Stages to a sibling `.tmp` file first, then rename or direct overwrite.
 * @param {string} filePath
 * @param {string} content
 * @param {{ maxAttempts?: number, delayMs?: number, encoding?: BufferEncoding }} [options]
 */
function writeFileResilient(filePath, content, options = {}) {
  const maxAttempts = options.maxAttempts ?? 10;
  const baseDelayMs = options.delayMs ?? 100;
  const encoding = options.encoding ?? "utf8";
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tmpPath = path.join(dir, `.${base}.${process.pid}.tmp`);

  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      fs.writeFileSync(tmpPath, content, encoding);
      try {
        fs.renameSync(tmpPath, filePath);
        return;
      } catch (renameErr) {
        fs.writeFileSync(filePath, content, encoding);
        removeIfExists(tmpPath);
        return;
      }
    } catch (err) {
      lastErr = err;
      removeIfExists(tmpPath);
      if (!isRetriableWriteError(err) || attempt === maxAttempts) {
        throw err;
      }
      sleepMs(baseDelayMs * attempt);
    }
  }
  throw lastErr;
}

module.exports = { writeFileResilient };
