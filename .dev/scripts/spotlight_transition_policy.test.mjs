import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");
const [phases, spotlight, blindfold, soundscape] = await Promise.all([
  read("core/phases.ttslua"),
  read("core/spotlight.ttslua"),
  read("core/hud_blindfold.ttslua"),
  read("core/soundscape.ttslua"),
]);

assert.ok(phases.includes("skipLocationCardGate = true"), "Spotlight transitions must skip the scene location-card gate");
assert.ok(phases.includes("leadInDelaySec = 2"), "Spotlight transitions must use the short lead-in");
assert.ok(phases.includes("settleDelaySec = 2.5"), "Spotlight enter must use the short settle budget");
assert.ok(phases.includes("settleDelaySec = 1"), "Spotlight exit must use the short settle budget");
assert.ok(blindfold.includes("phases.fadeIn(not workFailed)"), "Staged transitions must attempt audio recovery after failed work");
assert.ok(
  blindfold.includes("Soundscape.recoverAfterTransition({ reconcile = workFailed })"),
  "Every staged transition must close its fade window",
);
assert.ok(soundscape.includes("function Soundscape.recoverAfterTransition(opts)"), "Soundscape must expose transition recovery");
assert.ok(soundscape.includes("deferApplySeconds = 0"), "Failed transition recovery must reapply state without another delay");

const enterStart = spotlight.indexOf("function Spotlight.applyEnterWorld()");
const enterEnd = spotlight.indexOf("function Spotlight.applyExitWorld()", enterStart);
assert.notEqual(enterStart, -1, "Spotlight enter function is missing");
assert.notEqual(enterEnd, -1, "Spotlight exit function is missing");
const enterBody = spotlight.slice(enterStart, enterEnd);
assert.ok(!enterBody.includes("force = true"), "Spotlight enter must not force every reconciliation slice");
assert.ok(!enterBody.includes("applyCarouselSnapFromState()"), "Spotlight enter must not repeat the carousel after Sync.full");
assert.ok(!enterBody.includes("applyPlayfieldToysFromPhase()"), "Spotlight enter must not repeat playfield parking after Sync.full");
assert.ok(!enterBody.includes("GameStateOverlay.reconcileFromState()"), "Spotlight enter must not repeat the overlay after Sync.full");

console.log("spotlight transition policy tests passed");
