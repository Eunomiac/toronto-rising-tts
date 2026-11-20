"use strict";

/**
 * Pure Play-as-NPC contract helpers (no TTS).
 * @see .dev/PC-As-NPC Assignment/PC-As-NPC Assignment.md
 */

const selectiveHide = require("./selective-hide.json");

/** @param {object|null|undefined} seatRow */
function shouldStampMapPinOnSceneApply(seatRow) {
  if (!seatRow || typeof seatRow !== "object") return false;
  if (seatRow.isPlayingNPC === true) return false;
  if (seatRow.isPresent === false) return false;
  return true;
}

/**
 * Mid-scene assign: stamp last-seen to the current site (not a transition clear).
 * @returns {{ action: "stampCurrent", siteKey: string, districtKey: string|null, activeAt: object }}
 */
function midSceneAssignMapPinAction({ siteKey, districtKey = null, clock }) {
  if (typeof siteKey !== "string" || siteKey.trim() === "") {
    throw new Error("midSceneAssignMapPinAction requires siteKey");
  }
  return {
    action: "stampCurrent",
    siteKey: siteKey.trim(),
    districtKey: districtKey == null || districtKey === "" ? null : String(districtKey),
    activeAt: clock && typeof clock === "object" ? clock : {},
  };
}

function selectiveKeepRoleList() {
  return [...selectiveHide.keepRolePrefixes];
}

function selectiveHideRoleList() {
  return [...selectiveHide.hideRolePrefixes];
}

/**
 * @param {{ stageKeys?: string[], homelandSeatKeys?: string[], assignKey: string }} input
 * @returns {{ removeFromStage: string[], clearHomelandSeats: string[] }}
 */
function doubleBookRemovals({ stageKeys = [], homelandSeatKeys = [], assignKey }) {
  if (typeof assignKey !== "string" || assignKey === "") {
    throw new Error("doubleBookRemovals requires assignKey");
  }
  return {
    removeFromStage: stageKeys.filter((k) => k === assignKey),
    clearHomelandSeats: homelandSeatKeys.filter((k) => k === assignKey),
  };
}

module.exports = {
  shouldStampMapPinOnSceneApply,
  midSceneAssignMapPinAction,
  selectiveKeepRoleList,
  selectiveHideRoleList,
  doubleBookRemovals,
  selectiveHide,
};
