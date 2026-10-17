import type { ActionId, DragKind, DropBin, DropKind, MatrixCell, PanelEdge } from "./types";
import { DRAG_KINDS, DROP_KINDS, PANEL_DROP } from "./types";

const noop = (): MatrixCell => ({ kind: "noop" });
const impossible = (): MatrixCell => ({ kind: "impossible" });
const action = (id: ActionId, secretSafe?: boolean): MatrixCell =>
  secretSafe ? { kind: "action", action: id, secretSafe: true } : { kind: "action", action: id };
const panel = (...bins: DropBin[]): MatrixCell => ({ kind: "panel", bins });
const hover = (...bins: DropBin[]): MatrixCell => ({ kind: "hover", bins });
const bin = (id: string, label: string, actionId: ActionId, secretSafe?: boolean): DropBin => ({
  id,
  label,
  action: actionId,
  ...(secretSafe ? { secretSafe: true } : {})
});

const CHAR_A = panel(
  bin("std", "Standard Roll", "initiateStandard"),
  bin("disc", "Discipline Roll", "initiateDiscipline"),
  bin("frenzy", "Frenzy Roll", "initiateFrenzy"),
  bin("wp", "Willpower Roll", "initiateWillpower"),
  bin("contested", "Contested Roll…", "initiateContested")
);

const NPC_B = panel(
  bin("rouse1", "Rouse Check (1 die)", "initiateRouse1"),
  bin("rouse2", "Rouse Check (2 dice)", "initiateRouse2"),
  bin("obliv1", "Obliv-Rouse Check (1 die)", "initiateOblivRouse1"),
  bin("obliv2", "Obliv-Rouse Check (2 die)", "initiateOblivRouse2")
);

const PC_B = panel(
  bin("remorse", "Remorse Roll", "initiateRemorse"),
  bin("rouse", "Rouse Check", "initiateRouse"),
  bin("obliv", "Obliv-Rouse Check", "initiateOblivRouse")
);

const NPC_C = panel(
  bin("edit", "Edit NPC", "editNpc"),
  bin("tracker", "Open Tracker", "openTracker"),
  bin("rename", "Rename (Generic)", "renameGeneric")
);

const PC_C = panel(
  bin("project", "Initiate Project", "initiateProject"),
  bin("stats", "Change Stats", "changeStats"),
  bin("sheet", "Open Sheet", "openSheet")
);

const PC_PRE_A = panel(bin("exec", "Execute Roll", "executeRoll"), bin("cancel", "Cancel", "cancelRoll"));
const NPC_PRE_A = panel(
  bin("exec", "Execute Roll", "executeRoll"),
  bin("secret", "Execute Secret", "executeSecret"),
  bin("cancel", "Cancel", "cancelRoll")
);
const POST_A = panel(
  bin("bc", "Broadcast", "broadcast"),
  bin("bc2", "Broadcast Again", "broadcastAgain"),
  bin("confirm", "Confirm / Resolve", "confirmResolve"),
  bin("dismiss", "Dismiss", "dismiss")
);
const SECRET_POST_A = panel(
  bin("sbc", "SECRET-SAFE: Broadcast", "secretSafeBroadcast", true),
  bin("rq", "Reveal Quietly", "revealQuietly"),
  bin("rb", "Reveal & Broadcast", "revealAndBroadcast"),
  bin("hold", "Confirm / Hold", "confirmHold"),
  bin("dismiss", "Dismiss", "dismiss")
);

const PRE_B = panel(
  bin("surge", "Blood Surge", "bloodSurge"),
  bin("pool", "Adjust Pool", "adjustPool"),
  bin("convert", "Convert Type", "convertType")
);
const POST_B = panel(
  bin("wp", "Willpower Reroll", "willpowerReroll"),
  bin("reroll", "Reroll Selected", "rerollSelected"),
  bin("recalc", "Recalculate", "recalculate"),
  bin("hunger", "Choose Hunger", "chooseHunger"),
  bin("stain", "Choose Stain", "chooseStain")
);
const PRE_C = panel(bin("pin", "Pin to Drawer", "pinToDrawer"), bin("sheet", "Open Roller's Tracker/Sheet", "openRollerSheet"));
const POST_C = panel(bin("copy", "Copy Result Summary", "copyResultSummary"), bin("pin", "Pin to Drawer", "pinToDrawer"));

const SCENE_ACT_A = panel(
  bin("fork", "Fork/Duplicate", "forkScene"),
  bin("end", "End Scene", "endScene"),
  bin("mem", "Memoriam…", "memoriam")
);
const SCENE_NEW_A = panel(bin("fork", "Fork/Duplicate", "forkScene"), bin("edit", "Edit/Preview Scene", "editPreviewScene"));
const SCENE_ONG_A = panel(
  bin("fork", "Fork/Duplicate", "forkScene"),
  bin("edit", "Edit/Preview Scene", "editPreviewScene"),
  bin("end", "End Scene", "endScene")
);
const SCENE_ACT_B = panel(bin("unlink", "Unlink / Relink Library", "unlinkRelink"), bin("timing", "Play timing", "playTiming"));
const SCENE_NEW_B = panel(
  bin("now", "Play Now", "playNow"),
  bin("sceneTime", "Play at Scene Time", "playAtSceneTime"),
  bin("status", "Set Status", "setSceneStatus")
);
const SCENE_ONG_B = panel(bin("switch", "Play / Switch Now", "playSwitchNow"), bin("status", "Set Status", "setSceneStatus"));
const SCENE_C = panel(
  bin("rename", "Rename", "renameScene"),
  bin("archive", "Archive", "archiveScene"),
  bin("delete", "Delete", "deleteScene"),
  bin("template", "Duplicate as Template", "duplicateAsTemplate")
);

const DIFF_HOVER = hover(
  bin("diffLow", "Lower Difficulty", "hoverDifficulty"),
  bin("diffHigh", "Higher Difficulty", "hoverDifficulty")
);

const DRAWER_HOVER_NPC = hover(
  bin("std", "Standard", "drawerStartRoll"),
  bin("disc", "Discipline", "drawerStartRoll"),
  bin("frenzy", "Frenzy", "drawerStartRoll"),
  bin("wp", "Willpower", "drawerStartRoll"),
  bin("rouse", "Rouse…", "drawerStartRoll")
);
const DRAWER_HOVER_PC = hover(
  bin("std", "Standard", "drawerStartRoll"),
  bin("disc", "Discipline", "drawerStartRoll"),
  bin("frenzy", "Frenzy", "drawerStartRoll"),
  bin("wp", "Willpower", "drawerStartRoll"),
  bin("rouse", "Rouse / Remorse…", "drawerStartRoll")
);

/** Full drag × drop matrix (mirrors agent/dnd-matrix.csv). */
const CELLS: Readonly<Record<DragKind, Readonly<Partial<Record<DropKind, MatrixCell>>>>> = {
  npcStaged: {
    out: action("restoreToSeatOrClearStage"),
    panelA: CHAR_A,
    panelB: NPC_B,
    panelC: NPC_C,
    stage: action("moveOnStage"),
    emptySeat: action("stagedOccupyEmptySeat"),
    pack: action("packJoin"),
    rollDrawer: DRAWER_HOVER_NPC,
    npcStaged: action("packWithStaged"),
    npcRoster: action("returnToRoster"),
    npcSeated: action("swapOrDisplaceOntoNpcSeat"),
    pcSeated: action("contestedVsPc"),
    pcRollPreroll: action("retargetRoll"),
    pcRollPostroll: noop(),
    npcRollPreroll: action("retargetRoll"),
    npcRollPostrollRevealed: noop(),
    npcRollPostrollSecret: noop(),
    sceneActive: action("activateIntoScene"),
    sceneOnDeckNew: action("addToSceneSeatPlan"),
    sceneOnDeckOngoing: action("addToSceneSeatPlan")
  },
  npcRosterGroup: {
    stage: action("addRosterGroupToStage"),
    pack: action("addRosterGroupToStage"),
    npcStaged: action("addRosterGroupToStage")
  },
  npcRoster: {
    out: noop(),
    panelA: CHAR_A,
    panelB: NPC_B,
    panelC: NPC_C,
    stage: action("addToStage"),
    emptySeat: action("occupyEmptySeat"),
    pack: action("packAddFromRoster"),
    rollDrawer: DRAWER_HOVER_NPC,
    npcStaged: action("addNearStaged"),
    npcRoster: impossible(),
    npcSeated: action("rosterOntoNpcSeat"),
    pcSeated: action("contestedVsPc"),
    pcRollPreroll: action("retargetRoll"),
    pcRollPostroll: noop(),
    npcRollPreroll: action("retargetRoll"),
    npcRollPostrollRevealed: noop(),
    npcRollPostrollSecret: noop(),
    sceneActive: action("markPresentInActiveScene"),
    sceneOnDeckNew: action("addToSceneSeatPlan"),
    sceneOnDeckOngoing: action("addToSceneSeatPlan")
  },
  npcSeated: {
    out: action("clearFromSeat"),
    panelA: CHAR_A,
    panelB: NPC_B,
    panelC: NPC_C,
    stage: action("seatToStage"),
    emptySeat: action("moveToEmptySeat"),
    pack: action("packFromSeated"),
    rollDrawer: DRAWER_HOVER_NPC,
    npcStaged: action("seatedOntoStaged"),
    npcRoster: action("unseatToRoster"),
    npcSeated: action("swapSeats"),
    pcSeated: action("swapSeats"),
    pcRollPreroll: action("retargetRoll"),
    pcRollPostroll: noop(),
    npcRollPreroll: action("retargetRoll"),
    npcRollPostrollRevealed: noop(),
    npcRollPostrollSecret: noop(),
    sceneActive: action("activateIntoScene"),
    sceneOnDeckNew: action("assignTransitionSeat"),
    sceneOnDeckOngoing: action("assignTransitionSeat")
  },
  pcSeated: {
    out: action("deactivatePc"),
    panelA: CHAR_A,
    panelB: PC_B,
    panelC: PC_C,
    stage: noop(),
    emptySeat: action("moveToEmptySeat"),
    pack: noop(),
    rollDrawer: DRAWER_HOVER_PC,
    npcStaged: noop(),
    npcRoster: noop(),
    npcSeated: action("swapSeats"),
    pcSeated: action("swapSeats"),
    pcRollPreroll: action("retargetRoll"),
    pcRollPostroll: noop(),
    npcRollPreroll: action("retargetRoll"),
    npcRollPostrollRevealed: noop(),
    npcRollPostrollSecret: noop(),
    sceneActive: action("activateIntoScene"),
    sceneOnDeckNew: action("assignTransitionSeat"),
    sceneOnDeckOngoing: action("assignTransitionSeat")
  },
  pcRollPreroll: {
    out: action("clearCancelRoll"),
    panelA: PC_PRE_A,
    panelB: PRE_B,
    panelC: PRE_C,
    stage: noop(),
    emptySeat: noop(),
    pack: noop(),
    rollDrawer: action("drawerPinPreroll"),
    npcStaged: DIFF_HOVER,
    npcRoster: DIFF_HOVER,
    npcSeated: DIFF_HOVER,
    pcSeated: action("duplicateRollToPc"),
    pcRollPreroll: action("applySameTypeConditions"),
    pcRollPostroll: noop(),
    npcRollPreroll: action("applySameTypeConditions"),
    npcRollPostrollRevealed: noop(),
    npcRollPostrollSecret: noop(),
    sceneActive: noop(),
    sceneOnDeckNew: noop(),
    sceneOnDeckOngoing: noop()
  },
  pcRollPostroll: {
    out: action("clearCancelRoll"),
    panelA: POST_A,
    panelB: POST_B,
    panelC: POST_C,
    stage: action("broadcastRoll"),
    emptySeat: action("broadcastRoll"),
    pack: noop(),
    rollDrawer: action("drawerPinPostroll"),
    npcStaged: action("duplicateRollToCharacter"),
    npcRoster: action("duplicateRollToCharacter"),
    npcSeated: action("duplicateRollToCharacter"),
    pcSeated: action("duplicateRollToPc"),
    pcRollPreroll: action("setDifficultyFromMargin"),
    pcRollPostroll: action("compareOpposedMargin"),
    npcRollPreroll: action("setDifficultyFromMargin"),
    npcRollPostrollRevealed: action("compareOpposedMargin"),
    npcRollPostrollSecret: action("compareOpposedMarginSecret"),
    sceneActive: action("broadcastRoll"),
    sceneOnDeckNew: noop(),
    sceneOnDeckOngoing: noop()
  },
  npcRollPreroll: {
    out: action("clearCancelRoll"),
    panelA: NPC_PRE_A,
    panelB: PRE_B,
    panelC: PRE_C,
    stage: noop(),
    emptySeat: noop(),
    pack: noop(),
    rollDrawer: action("drawerPinPreroll"),
    npcStaged: DIFF_HOVER,
    npcRoster: DIFF_HOVER,
    npcSeated: DIFF_HOVER,
    pcSeated: action("duplicateNpcRollToPc"),
    pcRollPreroll: action("applySameTypeConditions"),
    pcRollPostroll: noop(),
    npcRollPreroll: action("applySameTypeConditions"),
    npcRollPostrollRevealed: noop(),
    npcRollPostrollSecret: noop(),
    sceneActive: noop(),
    sceneOnDeckNew: noop(),
    sceneOnDeckOngoing: noop()
  },
  npcRollPostrollRevealed: {
    out: action("clearCancelRoll"),
    panelA: POST_A,
    panelB: POST_B,
    panelC: POST_C,
    stage: action("broadcastRoll"),
    emptySeat: action("broadcastRoll"),
    pack: noop(),
    rollDrawer: action("drawerPinPostroll"),
    npcStaged: action("duplicateRollToCharacter"),
    npcRoster: action("duplicateRollToCharacter"),
    npcSeated: action("duplicateRollToCharacter"),
    pcSeated: action("duplicateRollToPc"),
    pcRollPreroll: action("setDifficultyFromMargin"),
    pcRollPostroll: action("compareOpposedMargin"),
    npcRollPreroll: action("setDifficultyFromMargin"),
    npcRollPostrollRevealed: action("compareOpposedMargin"),
    npcRollPostrollSecret: action("noAutoRevealSecret"),
    sceneActive: action("broadcastRoll"),
    sceneOnDeckNew: noop(),
    sceneOnDeckOngoing: noop()
  },
  npcRollPostrollSecret: {
    out: action("clearCancelRoll"),
    panelA: SECRET_POST_A,
    panelB: POST_B,
    panelC: POST_C,
    stage: action("broadcastRollSecret", true),
    emptySeat: action("broadcastRollSecret", true),
    pack: noop(),
    rollDrawer: action("drawerPinSecretPostroll"),
    npcStaged: action("duplicateRollSecretToCharacter"),
    npcRoster: action("duplicateRollSecretToCharacter"),
    npcSeated: action("duplicateRollSecretToCharacter"),
    pcSeated: action("duplicateSecretToPc"),
    pcRollPreroll: action("setDifficultyFromMarginSecret"),
    pcRollPostroll: action("compareOpposedMarginSecret"),
    npcRollPreroll: action("setDifficultyFromMarginSecret"),
    npcRollPostrollRevealed: action("noAutoRevealSecret"),
    npcRollPostrollSecret: action("compareOpposedMarginSecret"),
    sceneActive: action("broadcastRollSecret", true),
    sceneOnDeckNew: noop(),
    sceneOnDeckOngoing: noop()
  },
  sceneActive: {
    out: noop(),
    panelA: SCENE_ACT_A,
    panelB: SCENE_ACT_B,
    panelC: SCENE_C,
    stage: noop(),
    emptySeat: noop(),
    pack: noop(),
    rollDrawer: noop(),
    npcStaged: action("markPresentInActiveScene"),
    npcRoster: action("markPresentInActiveScene"),
    npcSeated: action("activateIntoScene"),
    pcSeated: action("activateIntoScene"),
    pcRollPreroll: noop(),
    pcRollPostroll: noop(),
    npcRollPreroll: noop(),
    npcRollPostrollRevealed: noop(),
    npcRollPostrollSecret: noop(),
    sceneActive: impossible(),
    sceneOnDeckNew: noop(),
    sceneOnDeckOngoing: noop()
  },
  sceneOnDeckNew: {
    out: action("removeFromDeck"),
    panelA: SCENE_NEW_A,
    panelB: SCENE_NEW_B,
    panelC: SCENE_C,
    stage: action("transitionToScene"),
    emptySeat: noop(),
    pack: noop(),
    rollDrawer: noop(),
    npcStaged: action("addToSceneSeatPlan"),
    npcRoster: action("addToSceneSeatPlan"),
    npcSeated: action("assignTransitionSeat"),
    pcSeated: action("assignTransitionSeat"),
    pcRollPreroll: noop(),
    pcRollPostroll: noop(),
    npcRollPreroll: noop(),
    npcRollPostrollRevealed: noop(),
    npcRollPostrollSecret: noop(),
    sceneActive: action("transitionToScene"),
    sceneOnDeckNew: action("reorderDeck"),
    sceneOnDeckOngoing: action("reorderDeck")
  },
  sceneOnDeckOngoing: {
    out: action("removeFromDeck"),
    panelA: SCENE_ONG_A,
    panelB: SCENE_ONG_B,
    panelC: SCENE_C,
    stage: action("transitionToScene"),
    emptySeat: noop(),
    pack: noop(),
    rollDrawer: noop(),
    npcStaged: action("addToSceneSeatPlan"),
    npcRoster: action("addToSceneSeatPlan"),
    npcSeated: action("assignTransitionSeat"),
    pcSeated: action("assignTransitionSeat"),
    pcRollPreroll: noop(),
    pcRollPostroll: noop(),
    npcRollPreroll: noop(),
    npcRollPostrollRevealed: noop(),
    npcRollPostrollSecret: noop(),
    sceneActive: action("transitionToScene"),
    sceneOnDeckNew: action("reorderDeck"),
    sceneOnDeckOngoing: action("reorderDeck")
  }
};

export const matrixCell = (drag: DragKind, drop: DropKind): MatrixCell => CELLS[drag][drop] ?? noop();

export const panelBinsFor = (drag: DragKind, edge: PanelEdge): readonly DropBin[] => {
  const cell = matrixCell(drag, PANEL_DROP[edge]);
  return cell.kind === "panel" ? cell.bins : [];
};

export const edgesWithBins = (drag: DragKind): readonly PanelEdge[] =>
  (["A", "B", "C"] as const).filter((edge) => panelBinsFor(drag, edge).length > 0);

export const isDropAllowed = (drag: DragKind, drop: DropKind): boolean => {
  const cell = matrixCell(drag, drop);
  return cell.kind !== "impossible" && cell.kind !== "noop";
};

/** Every drag×drop pair for Vitest coverage. */
export const allMatrixPairs = (): readonly { drag: DragKind; drop: DropKind; cell: MatrixCell }[] => {
  const pairs: { drag: DragKind; drop: DropKind; cell: MatrixCell }[] = [];
  for (const drag of DRAG_KINDS) {
    for (const drop of DROP_KINDS) {
      pairs.push({ drag, drop, cell: matrixCell(drag, drop) });
    }
  }
  return pairs;
};
