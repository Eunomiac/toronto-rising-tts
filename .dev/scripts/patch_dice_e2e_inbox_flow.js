"use strict";

const fs = require("fs");
const path = require("path");

const playbookPath = path.join(__dirname, "..", "E2E Playbooks", "Dice-E2E.md");
let s = fs.readFileSync(playbookPath, "utf8");

// Remove ad-hoc debug snippets at top of playbook.
s = s.replace(
  /\nRunTest\("Dice"\)\nRunTest\("Dice", 49\)\n\n\nRunTest\(\)\n\n\nprint\("\\n>>> AFTER Clicking Oblivion-Rouse Bag twice:"\)\nDEBUG\.rollState\("Purple"\)\n/,
  "\n"
);

const skipOpenRollTests = [
  'rollTest("Brown", 3, C.RollType.STANDARD, "E2E A2 pool", 4)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E J2 Surge compound", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E K1a2 hunger", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2a", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2b", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2c surge", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2d surge rouse", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2e rouse", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2f surge off", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2f2 hunger right noop", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2h compound rouse", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E K2i bag vis", 0)',
  'rollTest("Purple", 2, C.RollType.STANDARD, "E2E K2g Purple", 0)',
  'rollTest("Brown", 1, C.RollType.ROUSE, "E2E K3a")',
  'rollTest("Brown", 1, C.RollType.ROUSE, "E2E K3b")',
  'rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E K3c")',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E K4", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E N1 surge", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E N2 surge rouse add", 0)',
  'rollTest("Brown", 2, C.RollType.STANDARD, "E2E N3 surge cancel", 0)',
  'rollTest("Purple", 2, C.RollType.STANDARD, "E2E P-F compound", 0)',
];

for (const line of skipOpenRollTests) {
  const hungerMatch = line.match(/,\s*(\d+)\)$/);
  const rouseNoHunger = line.match(/,\s*"E2E K3[abc]"\)$/);
  let replacement;
  if (hungerMatch) {
    replacement = line.replace(/,\s*\d+\)$/, `, { hunger = ${hungerMatch[1]}, skipOpen = true })`);
  } else if (rouseNoHunger) {
    replacement = line.replace(/\)$/, ", { skipOpen = true })");
  } else if (line.endsWith('")')) {
    replacement = line.replace(/\)$/, ", { skipOpen = true })");
  } else {
    replacement = line;
  }
  s = s.split(line).join(replacement);
}

// A2 first pool assert: SETUP phase during bag build.
s = s.replace(
  'function() rollConfirm("Brown", { active = { pool = { normal = 1, hunger = 4 } } }) end,',
  'function() rollConfirm("Brown", { phase = "setup", active = { pool = { normal = 1, hunger = 4 } } }) end,'
);

// A3: ST Open before Roll.
s = s.replace(
  'printHeader("[HUMAN] Click Roll → Roll the dice → wait for settle", 3)',
  'printHeader("[HUMAN] ST: Open roll on dashboard → Brown clicks Roll → throw dice → wait for settle", 3)'
);

// POST_ROLL confirm baton is player-held (INBOX).
s = s.replace('batonHolder = "storyteller",', 'batonHolder = "player",');

s = s.replace(
  'printHeader("[HUMAN] ST clicks Confirm on Brown (or rollForceConfirm)", 3)',
  'printHeader("[HUMAN] Brown clicks Confirm on roll panel (or rollForceConfirm in next block)", 3)'
);

// J2: pool confirm before settle (not mixed with return settle).
s = s.replace(
  `  rollE2eWaitForDiceTray,
  function()
    rollConfirm("Brown", {
      meta = { bloodSurgeActive = true },
      pool = { bloodSurgeRouse = 1, normal = 2, hunger = 0 },
    })
    return rollE2eSettlePresetCheck("Brown", { normal = { 7, 7 }, bloodSurgeRouse = { 4 } }, { skipSpawn = true })
  end,`,
  `  rollE2eWaitForDiceTray,
  function()
    rollConfirm("Brown", {
      meta = { bloodSurgeActive = true },
      pool = { bloodSurgeRouse = 1, normal = 2, hunger = 0 },
    })
  end,
  function()
    return rollE2eSettlePresetCheck("Brown", { normal = { 7, 7 }, bloodSurgeRouse = { 4 } }, { skipSpawn = true })
  end,`
);

// P-F: human already rolled — confirm + player confirm, no harness startRolling.
s = s.replace(
  `U.RunSequence({
  function()
    rollSetFaces("Purple", { normal = { 7, 7 }, oblivRouse = { 3, 10 } })
    RC.startRolling("Purple")
    RC.onDiceSettled("Purple")
    rollConfirm("Purple", {
      phase = "postRoll",
      rouseOutcomeStripsMin = 1,
      active = { pendingResolution = "oblivHungerStain" },
    })
    rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
    rollCancel("Purple")
  end,`,
  `U.RunSequence({
  function()
    rollConfirm("Purple", {
      phase = "postRoll",
      active = { result = { present = true } },
    })
  end,
  function()
    M.setCamera("ALL", "rollPurple")
    printHeader("[HUMAN] Resolve Oblivion choice if prompted; click Confirm on Purple roll panel", 3)
  end,
  function()
    rollConfirm("Purple", { noActive = true })
    rollConfirmTracker("Purple", { hunger = 1, stains = 2 })
    rollCancel("Purple")
  end,`
);

// H2: broadcast needs confirm first.
s = s.replace(
  `U.RunSequence({
  function()
    rollE2eExpectBroadcast({
      color = "Brown",
      visible = true,
      resultClass = "Failure",
      successes = 2,
      margin = -1,
    })
  end,
  function() printHeader("", 2) end,
  function() printHeader("H2b - Take Half + rouse, no ST difficulty", 2) end,`,
  `U.RunSequence({
  function()
    rollForceConfirm("Brown")
    rollE2eExpectBroadcast({
      color = "Brown",
      visible = true,
      resultClass = "Failure",
      successes = 2,
      margin = -1,
    })
  end,
  function() printHeader("", 2) end,
  function() printHeader("H2b - Take Half + rouse, no ST difficulty", 2) end,`
);

fs.writeFileSync(playbookPath, s);
console.log("[patch_dice_e2e_inbox_flow] done");
