"use strict";

/**
 * Preloaded for every Node process in `npm run build:full` (NODE_OPTIONS --require).
 * Active only when TORONTO_RISING_BUILD_REVIEW=1, so a leaked NODE_OPTIONS does nothing.
 */

const util = require("util");
const { classifyWarn, classifyError, classifyLog } = require("./classify.cjs");
const { appendEntry } = require("./log-file.cjs");

function formatArgs(args) {
  if (args.length === 0) return "";
  try {
    return util.format(...args);
  } catch {
    return args.map((arg) => String(arg)).join(" ");
  }
}

function install() {
  if (global.__TORONTO_RISING_BUILD_REVIEW_CAPTURED) return;
  global.__TORONTO_RISING_BUILD_REVIEW_CAPTURED = true;

  const origWarn = console.warn;
  const origError = console.error;
  const origLog = console.log;
  const origStderrWrite = process.stderr.write.bind(process.stderr);

  let fromConsole = false;
  let recording = false;
  let announcedWriteFailure = false;

  function record(text) {
    if (recording) return;
    const body = String(text).trim();
    if (body === "") return;
    recording = true;
    try {
      appendEntry(body);
    } catch (err) {
      if (!announcedWriteFailure) {
        announcedWriteFailure = true;
        origStderrWrite(`[build-review] Could not write the review log: ${err && err.message ? err.message : err}\n`);
      }
    } finally {
      recording = false;
    }
  }

  function callConsole(orig, args) {
    fromConsole = true;
    try {
      return orig.apply(console, args);
    } finally {
      fromConsole = false;
    }
  }

  console.warn = function warn(...args) {
    const text = formatArgs(args);
    if (classifyWarn(text)) record(text);
    return callConsole(origWarn, args);
  };

  console.error = function error(...args) {
    const text = formatArgs(args);
    if (classifyError(text)) record(text);
    return callConsole(origError, args);
  };

  console.log = function log(...args) {
    const text = formatArgs(args);
    if (classifyLog(text)) record(text);
    return callConsole(origLog, args);
  };

  process.stderr.write = function write(chunk, encoding, cb) {
    if (!fromConsole && !recording) {
      const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      if (classifyError(text)) record(text);
    }
    return origStderrWrite(chunk, encoding, cb);
  };

  const entry = String(process.argv[1] || "").replace(/\\/g, "/");
  const isNpm = /\/npm-cli\.js$/i.test(entry);
  if (!isNpm) {
    process.on("uncaughtException", (err) => {
      record(err && err.stack ? err.stack : String(err));
      process.exit(1);
    });
    process.on("unhandledRejection", (err) => {
      const text = err && err.stack ? err.stack : String(err);
      record(text);
      process.exit(1);
    });
  }
}

if (process.env.TORONTO_RISING_BUILD_REVIEW === "1") {
  install();
}
