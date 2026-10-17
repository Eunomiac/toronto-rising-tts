"use strict";

/**
 * Decides which Full-build console lines are worth opening afterwards.
 *
 * Collected (unless listed below as routine):
 * - every console.warn — sheet import warnings, empty templates, unknown districts,
 *   asset-gate warnings, NPC art discrepancies, missing optional NPC art files,
 *   XP-log bake when the save is missing
 * - every console.error and direct stderr write — gate failures, import FAILs,
 *   backup soft-fails ("continuing build"), emitter skip/failure, stub repair errors,
 *   uncaught exceptions
 * - a short console.log allow-list: NPC token auto-crop, stub files actually repaired,
 *   NPC stat import/push when something changed, and any line starting with [build-review]
 *
 * Left in the terminal only:
 * - "[npc-art] No NPC art discrepancies."
 * - daily backup throttle and the successful copy line
 * - "all emitters already on silent"
 * - cloud-asset-sync progress (per-file "uploaded", per-job counts, PASS) when nothing
 *   was uploaded, moved, deleted, skipped, or written into the save
 * - npc-stats "all unchanged", "no dashboard edits waiting", and the expected
 *   "skipped rows with no stats" list
 * - npm warn / npm notice, and Node's own DeprecationWarning / ExperimentalWarning lines
 *
 * cloud-asset-sync logs through console.error. New progress lines are treated as
 * routine unless they match the keep rules in isRoutineCloudBody. A new warning
 * should use that file's warn() helper (the line then contains "WARN").
 */

const CLOUD_PREFIX = "[cloud-asset-sync] ";
const NO_ART_DISCREPANCIES = "[npc-art] No NPC art discrepancies.";

/**
 * @param {string} body text after "[cloud-asset-sync] "
 * @returns {boolean} true when the line is ordinary progress
 */
function isRoutineCloudBody(body) {
  if (body.startsWith("WARN ") || body.startsWith("FAIL")) return false;
  if (body.startsWith("Wrote save ")) return false;
  if (body.includes("DRY RUN")) return false;
  if (body.startsWith("SKIP ")) return false;
  if (body.startsWith("Save Only:")) return false;
  if (body.startsWith("moved ")) return false;
  if (body.startsWith("deleted from Cloud:")) return false;
  if (body.includes("→")) return false;
  if (body.startsWith("Push:")) {
    const upload = /([0-9]+) to upload/.exec(body);
    const move = /([0-9]+) to move/.exec(body);
    const del = /([0-9]+) to delete/.exec(body);
    const cloudOnly = /([0-9]+) Cloud-only/.exec(body);
    if (!upload || !move || !del) return false;
    const cloudOnlyCount = cloudOnly ? Number(cloudOnly[1]) : 0;
    return upload[1] === "0" && move[1] === "0" && del[1] === "0" && cloudOnlyCount === 0;
  }
  return true;
}

/**
 * @param {string} line one physical line, already trimmed
 * @returns {boolean}
 */
function isNodeRuntimeNoise(line) {
  if (/^\(node:\d+\) /.test(line) && /Warning:/.test(line)) return true;
  if (line.startsWith("(Use `node --")) return true;
  return false;
}

function isRoutineProgress(line) {
  if (line.startsWith("[tts-save:backup-daily] Throttled ")) return true;
  if (line.startsWith("[tts-save:backup-daily] Copied ")) return true;
  if (/^\[tts-save:silence-emitters\] All \d+ emitters already on silent\.$/.test(line)) return true;
  if (line.startsWith("npm warn ") || line.startsWith("npm notice ")) return true;
  if (isNodeRuntimeNoise(line)) return true;
  if (line.startsWith(CLOUD_PREFIX)) return isRoutineCloudBody(line.slice(CLOUD_PREFIX.length));
  return false;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function nonEmptyLines(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/**
 * @param {string} text
 * @returns {"warn"|null}
 */
function classifyWarn(text) {
  const lines = nonEmptyLines(text);
  if (lines.length === 0) return null;
  if (lines.length === 1 && lines[0] === NO_ART_DISCREPANCIES) return null;
  if (lines.every((line) => isRoutineProgress(line))) return null;
  return "warn";
}

/**
 * @param {string} text
 * @returns {"error"|null}
 */
function classifyError(text) {
  const lines = nonEmptyLines(text);
  if (lines.length === 0) return null;
  if (lines.every((line) => isRoutineProgress(line))) return null;
  return "error";
}

/**
 * @param {string} text
 * @returns {"note"|null}
 */
function classifyLog(text) {
  const lines = nonEmptyLines(text);
  if (lines.length === 0) return null;
  const worth = lines.some((line) => {
    if (line.startsWith("[build-review]")) return true;
    if (line.includes("automatic head crop")) return true;
    if (line.startsWith("TTS object stubs: repaired ")) return true;
    if (line.startsWith("npc-stats:import: ")) {
      if (line.includes("all unchanged")) return false;
      if (line.startsWith("npc-stats:import: skipped ")) return false;
      return true;
    }
    if (line.startsWith("npc-stats:push: ")) {
      if (line.includes("no dashboard edits waiting")) return false;
      return true;
    }
    if (line.includes(" · ") && line.includes("→")) return true;
    return false;
  });
  return worth ? "note" : null;
}

module.exports = {
  CLOUD_PREFIX,
  NO_ART_DISCREPANCIES,
  isRoutineProgress,
  isRoutineCloudBody,
  classifyWarn,
  classifyError,
  classifyLog,
};
