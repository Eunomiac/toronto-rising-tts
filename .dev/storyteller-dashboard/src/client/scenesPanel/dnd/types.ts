/** Drag sources and drop targets from the Storyteller Dashboard DnD matrix. */

export type DragKind =
  | "npcStaged"
  | "npcRoster"
  | "npcRosterGroup"
  | "npcSeated"
  | "pcSeated"
  | "pcRollPreroll"
  | "pcRollPostroll"
  | "npcRollPreroll"
  | "npcRollPostrollRevealed"
  | "npcRollPostrollSecret"
  | "sceneActive"
  | "sceneOnDeckNew"
  | "sceneOnDeckOngoing";

export type DropKind =
  | "out"
  | "panelA"
  | "panelB"
  | "panelC"
  | "stage"
  | "emptySeat"
  | "pack"
  | "rollDrawer"
  | "npcStaged"
  | "npcRoster"
  | "npcSeated"
  | "pcSeated"
  | "pcRollPreroll"
  | "pcRollPostroll"
  | "npcRollPreroll"
  | "npcRollPostrollRevealed"
  | "npcRollPostrollSecret"
  | "sceneActive"
  | "sceneOnDeckNew"
  | "sceneOnDeckOngoing";

export type PanelEdge = "A" | "B" | "C";

/** A circular drop bin (slide-out panel or HOVER ring). */
export type DropBin = {
  readonly id: string;
  readonly label: string;
  readonly action: ActionId;
  /** Secret-safe broadcast / share (no player dice reveal). */
  readonly secretSafe?: boolean;
};

export type HoverSpec = {
  readonly bins: readonly DropBin[];
};

/**
 * Resolved matrix cell. Panels list bins; hover cells wrap parent semantics;
 * direct cells name a single action (or noop / impossible).
 */
export type MatrixCell =
  | { readonly kind: "noop" }
  | { readonly kind: "impossible" }
  | { readonly kind: "action"; readonly action: ActionId; readonly secretSafe?: boolean }
  | { readonly kind: "conditional"; readonly lines: readonly string[]; readonly action: ActionId }
  | { readonly kind: "panel"; readonly bins: readonly DropBin[] }
  | { readonly kind: "hover"; readonly bins: readonly DropBin[] };

/** Stable action ids consumed by `apply.ts` / TTS bridge. */
export type ActionId =
  | "noop"
  | "impossible"
  | "restoreToSeatOrClearStage"
  | "clearFromSeat"
  | "deactivatePc"
  | "clearCancelRoll"
  | "removeFromDeck"
  | "moveOnStage"
  | "addToStage"
  | "addRosterGroupToStage"
  | "seatToStage"
  | "occupyEmptySeat"
  | "stagedOccupyEmptySeat"
  | "moveToEmptySeat"
  | "packJoin"
  | "packAddFromRoster"
  | "packFromSeated"
  | "drawerStartRoll"
  | "drawerPinPreroll"
  | "drawerPinPostroll"
  | "drawerPinSecretPostroll"
  | "packWithStaged"
  | "addNearStaged"
  | "seatedOntoStaged"
  | "returnToRoster"
  | "unseatToRoster"
  | "hoverDifficulty"
  | "duplicateRollToCharacter"
  | "duplicateRollSecretToCharacter"
  | "markPresentInActiveScene"
  | "addToSceneSeatPlan"
  | "swapOrDisplaceOntoNpcSeat"
  | "rosterOntoNpcSeat"
  | "swapSeats"
  | "activateIntoScene"
  | "assignTransitionSeat"
  | "contestedVsPc"
  | "duplicateRollToPc"
  | "duplicateNpcRollToPc"
  | "duplicateSecretToPc"
  | "retargetRoll"
  | "applySameTypeConditions"
  | "setDifficultyFromMargin"
  | "setDifficultyFromMarginSecret"
  | "compareOpposedMargin"
  | "compareOpposedMarginSecret"
  | "noAutoRevealSecret"
  | "broadcastRoll"
  | "broadcastRollSecret"
  | "transitionToScene"
  | "reorderDeck"
  | "initiateStandard"
  | "initiateDiscipline"
  | "initiateFrenzy"
  | "initiateWillpower"
  | "initiateContested"
  | "initiateRouse1"
  | "initiateRouse2"
  | "initiateOblivRouse1"
  | "initiateOblivRouse2"
  | "initiateRemorse"
  | "initiateRouse"
  | "initiateOblivRouse"
  | "executeRoll"
  | "executeSecret"
  | "cancelRoll"
  | "broadcast"
  | "broadcastAgain"
  | "confirmResolve"
  | "dismiss"
  | "secretSafeBroadcast"
  | "revealQuietly"
  | "revealAndBroadcast"
  | "confirmHold"
  | "bloodSurge"
  | "adjustPool"
  | "convertType"
  | "willpowerReroll"
  | "rerollSelected"
  | "recalculate"
  | "chooseHunger"
  | "chooseStain"
  | "editNpc"
  | "openTracker"
  | "renameGeneric"
  | "initiateProject"
  | "changeStats"
  | "openSheet"
  | "pinToDrawer"
  | "openRollerSheet"
  | "copyResultSummary"
  | "forkScene"
  | "endScene"
  | "memoriam"
  | "editPreviewScene"
  | "unlinkRelink"
  | "playTiming"
  | "playNow"
  | "playAtSceneTime"
  | "setSceneStatus"
  | "playSwitchNow"
  | "renameScene"
  | "archiveScene"
  | "deleteScene"
  | "duplicateAsTemplate";

export type DragPayload =
  | { readonly dragKind: "npcRosterGroup"; readonly groupKey: string; readonly members: readonly { readonly characterKey: string; readonly name: string }[] }
  | { readonly dragKind: "npcStaged"; readonly characterKey: string; readonly seated?: boolean }
  | { readonly dragKind: "npcRoster"; readonly characterKey: string; readonly groupKey?: string }
  | { readonly dragKind: "npcSeated"; readonly characterKey: string; readonly seatKey: string; readonly chair: number }
  | { readonly dragKind: "pcSeated"; readonly color: string; readonly seatKey: string; readonly chair: number }
  | {
      readonly dragKind: "pcRollPreroll" | "pcRollPostroll";
      readonly color: string;
      readonly rollType?: string;
      readonly summary?: string;
    }
  | {
      readonly dragKind: "npcRollPreroll" | "npcRollPostrollRevealed" | "npcRollPostrollSecret";
      readonly characterKey?: string;
      readonly label?: string;
      readonly rollType?: string;
      readonly summary?: string;
    }
  | { readonly dragKind: "sceneActive"; readonly sceneKey: string }
  | { readonly dragKind: "sceneOnDeckNew" | "sceneOnDeckOngoing"; readonly sceneKey: string };

export type DropTarget = { readonly binId?: string } & (
  | { readonly dropKind: DropKind; readonly binId?: string }
  | {
      readonly dropKind: "emptySeat" | "npcSeated" | "pcSeated";
      readonly chair: number;
      readonly seatKey?: string;
      readonly holderKey?: string;
    }
  | { readonly dropKind: "npcStaged" | "npcRoster" | "pack"; readonly characterKey?: string; readonly packId?: string }
  | { readonly dropKind: "pcRollPreroll" | "pcRollPostroll"; readonly color: string }
  | { readonly dropKind: "npcRollPreroll" | "npcRollPostrollRevealed" | "npcRollPostrollSecret" }
  | { readonly dropKind: "rollDrawer"; readonly slot: number }
  | { readonly dropKind: "sceneActive" | "sceneOnDeckNew" | "sceneOnDeckOngoing"; readonly sceneKey?: string }
  | { readonly dropKind: "stage"; readonly u?: number; readonly v?: number }
  | { readonly dropKind: "out" | "panelA" | "panelB" | "panelC"; readonly binId?: string });

export type ClientPoint = { readonly x: number; readonly y: number };

export const DRAG_KINDS: readonly DragKind[] = [
  "npcStaged",
  "npcRoster",
  "npcRosterGroup",
  "npcSeated",
  "pcSeated",
  "pcRollPreroll",
  "pcRollPostroll",
  "npcRollPreroll",
  "npcRollPostrollRevealed",
  "npcRollPostrollSecret",
  "sceneActive",
  "sceneOnDeckNew",
  "sceneOnDeckOngoing"
] as const;

export const DROP_KINDS: readonly DropKind[] = [
  "out",
  "panelA",
  "panelB",
  "panelC",
  "stage",
  "emptySeat",
  "pack",
  "rollDrawer",
  "npcStaged",
  "npcRoster",
  "npcSeated",
  "pcSeated",
  "pcRollPreroll",
  "pcRollPostroll",
  "npcRollPreroll",
  "npcRollPostrollRevealed",
  "npcRollPostrollSecret",
  "sceneActive",
  "sceneOnDeckNew",
  "sceneOnDeckOngoing"
] as const;

export const PANEL_DROP: Readonly<Record<PanelEdge, DropKind>> = {
  A: "panelA",
  B: "panelB",
  C: "panelC"
};
