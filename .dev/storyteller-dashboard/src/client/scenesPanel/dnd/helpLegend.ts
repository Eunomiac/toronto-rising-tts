import { matrixCell } from "./matrix";
import type { ActionId, DragKind, DropKind, MatrixCell } from "./types";
import { DROP_KINDS } from "./types";

const DRAG_LABEL: Readonly<Record<DragKind, string>> = {
  npcStaged: "Staged NPC",
  npcRoster: "Roster NPC",
  npcSeated: "Seated NPC",
  pcSeated: "Seated PC",
  pcRollPreroll: "PC roll (before dice)",
  pcRollPostroll: "PC roll (after dice)",
  npcRollPreroll: "NPC roll (before dice)",
  npcRollPostrollRevealed: "NPC roll (revealed)",
  npcRollPostrollSecret: "NPC roll (secret)",
  sceneActive: "Active scene",
  sceneOnDeckNew: 'On-deck scene (New)',
  sceneOnDeckOngoing: 'On-deck scene (Ongoing)'
};

const DROP_LABEL: Readonly<Record<DropKind, string>> = {
  out: "Empty space / Off the board",
  panelA: "Slide-out Panel A (left)",
  panelB: "Slide-out Panel B (bottom)",
  panelC: "Slide-out Panel C (right)",
  stage: "Stage",
  emptySeat: "Empty seat",
  pack: "Stage pack",
  rollDrawer: "Roll drawer slot",
  npcStaged: "Staged NPC token",
  npcRoster: "Roster NPC token",
  npcSeated: "Seated NPC",
  pcSeated: "Seated PC",
  pcRollPreroll: "PC preroll card",
  pcRollPostroll: "PC postroll card",
  npcRollPreroll: "NPC preroll card",
  npcRollPostrollRevealed: "NPC revealed postroll",
  npcRollPostrollSecret: "NPC secret postroll",
  sceneActive: "Active scene",
  sceneOnDeckNew: 'On-deck scene (New)',
  sceneOnDeckOngoing: 'On-deck scene (Ongoing)'
};

/** Short plain-English gloss for action ids (help panel bullets). */
const ACTION_GLOSS: Readonly<Partial<Record<ActionId, string>>> = {
  restoreToSeatOrClearStage: "Restore to seat if seated, otherwise clear from stage",
  clearFromSeat: "Clear from seat",
  deactivatePc: "Deactivate (out of the scene; seat stays)",
  clearCancelRoll: "Clear / cancel the roll",
  removeFromDeck: "Remove from the deck",
  moveOnStage: "Move to that stage position",
  addToStage: "Add to the stage at that position",
  seatToStage: "Deactivate the seat and add a stage copy",
  occupyEmptySeat: "Occupy that empty seat",
  stagedOccupyEmptySeat: "Leave the stage and occupy that seat",
  moveToEmptySeat: "Move into that empty seat",
  packJoin: "Join that stage pack",
  packAddFromRoster: "Add to the stage and join that pack",
  packFromSeated: "Deactivate the seat, stage, and join that pack",
  drawerStartRoll: "Start a roll type in that drawer",
  drawerPinPreroll: "Pin this preroll to the drawer",
  drawerPinPostroll: "Pin this result to the drawer",
  drawerPinSecretPostroll: "Pin this secret result to the drawer",
  packWithStaged: "Join / form a pack with that token",
  addNearStaged: "Add to the stage near that token",
  seatedOntoStaged: "Stage near that token (or restore if same NPC)",
  returnToRoster: "Clear from stage (return to roster)",
  unseatToRoster: "Clear from seat toward the roster",
  hoverDifficulty: "Set difficulty from the highlight bins",
  duplicateRollToCharacter: "Duplicate this roll for that character",
  duplicateRollSecretToCharacter: "Duplicate as a secret roll for that character",
  markPresentInActiveScene: "Mark present / bring into the active scene",
  addToSceneSeatPlan: "Add to that scene’s seat plan",
  swapOrDisplaceOntoNpcSeat: "Swap seats or displace onto the stage",
  rosterOntoNpcSeat: "Seat here (swap / displace if occupied)",
  swapSeats: "Swap seats",
  activateIntoScene: "Activate / bring into the scene",
  assignTransitionSeat: "Assign in that scene’s transition seating",
  contestedVsPc: "Start a contested roll vs that PC",
  duplicateRollToPc: "Duplicate this roll for that PC",
  duplicateNpcRollToPc: "Open that NPC roll for the PC",
  duplicateSecretToPc: "Duplicate as a secret roll for that PC",
  retargetRoll: "Retarget the roll to this character",
  applySameTypeConditions: "Copy conditions & difficulty (same roll type)",
  setDifficultyFromMargin: "Set difficulty from this roll’s margin",
  setDifficultyFromMarginSecret: "Set difficulty from margin (secret-safe toward players)",
  compareOpposedMargin: "Compare / show opposed margin (ST)",
  compareOpposedMarginSecret: "Compare opposed margin without revealing to players",
  noAutoRevealSecret: "No-op (does not auto-reveal a secret roll)",
  broadcastRoll: "Broadcast this roll",
  broadcastRollSecret: "SECRET-SAFE broadcast (no player dice reveal)",
  transitionToScene: "Transition / play into that scene",
  reorderDeck: "Reorder the deck relative to that chip",
  initiateStandard: "Start a Standard roll",
  initiateDiscipline: "Start a Discipline roll",
  initiateFrenzy: "Start a Frenzy roll",
  initiateWillpower: "Start a Willpower roll",
  initiateContested: "Start a Contested roll…",
  initiateRouse1: "Rouse check (1 die)",
  initiateRouse2: "Rouse check (2 dice)",
  initiateOblivRouse1: "Obliv-Rouse (1 die)",
  initiateOblivRouse2: "Obliv-Rouse (2 dice)",
  initiateRemorse: "Remorse roll",
  initiateRouse: "Rouse check",
  initiateOblivRouse: "Obliv-Rouse check",
  executeRoll: "Execute / roll now",
  executeSecret: "Execute as a secret roll",
  cancelRoll: "Cancel the roll",
  broadcast: "Broadcast",
  broadcastAgain: "Broadcast again",
  confirmResolve: "Confirm / resolve",
  dismiss: "Dismiss",
  secretSafeBroadcast: "SECRET-SAFE broadcast",
  revealQuietly: "Reveal quietly",
  revealAndBroadcast: "Reveal & broadcast",
  confirmHold: "Confirm / hold",
  bloodSurge: "Blood Surge",
  adjustPool: "Adjust pool",
  convertType: "Convert roll type",
  willpowerReroll: "Willpower reroll",
  rerollSelected: "Reroll selected dice",
  recalculate: "Recalculate",
  chooseHunger: "Choose Hunger",
  chooseStain: "Choose Stain",
  editNpc: "Edit this NPC",
  openTracker: "Open tracker",
  renameGeneric: "Rename (generic)",
  initiateProject: "Initiate project",
  changeStats: "Change stats",
  openSheet: "Open character sheet",
  pinToDrawer: "Pin to drawer",
  openRollerSheet: "Open roller’s tracker / sheet",
  copyResultSummary: "Copy result summary",
  forkScene: "Fork / duplicate scene",
  endScene: "End scene",
  memoriam: "Memoriam…",
  editPreviewScene: "Edit / preview scene",
  unlinkRelink: "Unlink / relink library",
  playTiming: "Play timing",
  playNow: "Play now",
  playAtSceneTime: "Play at scene time",
  setSceneStatus: "Set scene status",
  playSwitchNow: "Play / switch now",
  renameScene: "Rename",
  archiveScene: "Archive",
  deleteScene: "Delete",
  duplicateAsTemplate: "Duplicate as template"
};

export type HelpBullet = {
  readonly drop: DropKind;
  readonly dropLabel: string;
  readonly text: string;
};

const gloss = (action: ActionId, secretSafe?: boolean): string => {
  const base = ACTION_GLOSS[action] ?? action;
  return secretSafe ? `${base} (secret-safe)` : base;
};

const cellBullets = (drop: DropKind, cell: MatrixCell): readonly string[] => {
  if (cell.kind === "noop" || cell.kind === "impossible") {
    return [];
  }
  if (cell.kind === "action") {
    return [gloss(cell.action, cell.secretSafe)];
  }
  if (cell.kind === "conditional") {
    return cell.lines.length > 0 ? [...cell.lines] : [gloss(cell.action)];
  }
  if (cell.kind === "panel") {
    return cell.bins.map((bin) => `${bin.label}${bin.secretSafe ? " (secret-safe)" : ""}`);
  }
  if (cell.kind === "hover") {
    return [
      `While hovering: ${cell.bins.map((bin) => bin.label).join(" · ")} (release elsewhere cancels)`
    ];
  }
  return [];
};

/** Human title for the drag source shown in the help panel. */
export const dragHelpTitle = (drag: DragKind): string => DRAG_LABEL[drag];

/**
 * Bullet list of meaningful drop outcomes for this drag kind (skips ⛔ / ❌).
 * Panel bins are expanded as separate bullets under that panel’s drop label.
 */
export const helpBulletsFor = (drag: DragKind): readonly HelpBullet[] => {
  const bullets: HelpBullet[] = [];
  for (const drop of DROP_KINDS) {
    const cell = matrixCell(drag, drop);
    const lines = cellBullets(drop, cell);
    for (const text of lines) {
      bullets.push({ drop, dropLabel: DROP_LABEL[drop], text });
    }
  }
  return bullets;
};
