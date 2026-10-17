import type { RollControlRequest } from "./rollControls";
import type { ScenesCommand, ScenesSend } from "../commands";
import type { RollsCommand, RollsSend } from "../rolls/commands";
import type { ActionId, DragPayload, DropTarget } from "./types";

export type DndApplyContext = {
  readonly scenes: ScenesSend;
  readonly rolls: RollsSend;
  /** Optional UI hooks (modals, local deck) that are not TTS commands. */
  readonly ui?: DndUiHooks;
};

export type DndUiHooks = {
  readonly characterName?: (characterKey: string) => string;
  readonly difficultyFor?: (characterKey: string, higher: boolean) => number | undefined;
  readonly openRollControl?: (action: RollControlRequest["action"], payload: DragPayload) => boolean;
  readonly openNpcEdit?: (characterKey: string) => void;
  readonly openNpcTracker?: (characterKey: string) => void;
  readonly openPcSheet?: (color: string) => void;
  readonly openMemoriam?: () => void;
  readonly editPreviewScene?: (sceneKey: string) => void;
  readonly removeFromDeck?: (sceneKey: string) => void;
  readonly reorderDeck?: (dragKey: string, dropKey: string) => void;
  readonly forkScene?: () => void;
  readonly playScene?: (sceneKey: string, mode: "now" | "sceneTime") => void;
  readonly setSceneStatus?: (sceneKey: string) => void;
  readonly renameScene?: (sceneKey: string) => void;
  readonly archiveScene?: (sceneKey: string) => void;
  readonly deleteScene?: (sceneKey: string) => void;
  readonly duplicateAsTemplate?: (sceneKey: string) => void;
  readonly copyText?: (text: string) => void;
  readonly notify?: (message: string) => void;
};

export type ApplyResult =
  | { readonly ok: true; readonly did: ActionId }
  | { readonly ok: false; readonly reason: string };

const characterKeyOf = (payload: DragPayload): string | undefined => {
  if ("characterKey" in payload) {
    return payload.characterKey;
  }
  return undefined;
};

const seatKeyOf = (payload: DragPayload): string | undefined => {
  if ("seatKey" in payload) {
    return payload.seatKey;
  }
  return undefined;
};

const colorOf = (payload: DragPayload): string | undefined => {
  if ("color" in payload) {
    return payload.color;
  }
  return undefined;
};

const sceneKeyOf = (payload: DragPayload, target: DropTarget): string | undefined => {
  if ("sceneKey" in payload && payload.sceneKey) {
    return payload.sceneKey;
  }
  if ("sceneKey" in target) {
    return target.sceneKey;
  }
  return undefined;
};

const initiateFor = (
  payload: DragPayload,
  rollType: string,
  ctx: DndApplyContext,
  secret?: boolean
): ApplyResult => {
  if (payload.dragKind === "pcSeated") {
    ctx.rolls({ op: "initiate", color: payload.color, rollType });
    return { ok: true, did: "initiateStandard" };
  }
  const key = characterKeyOf(payload);
  if (key || payload.dragKind.startsWith("npc")) {
    ctx.rolls({
      op: "npcInitiate",
      label: key ? ctx.ui?.characterName?.(key) ?? key : "NPC",
      characterKey: key,
      rollType
    });
    if (secret) {
      ctx.rolls({ op: "npcRoll", secret: true });
    }
    return { ok: true, did: "initiateStandard" };
  }
  return { ok: false, reason: "No character for initiate." };
};

/** Apply a resolved matrix action for the current drag onto a drop target. */
export const applyDndAction = (
  action: ActionId,
  payload: DragPayload,
  target: DropTarget,
  ctx: DndApplyContext,
  options?: { readonly secretSafe?: boolean }
): ApplyResult => {
  switch (action) {
    case "noop":
    case "impossible":
      return { ok: true, did: action };

    case "restoreToSeatOrClearStage": {
      const key = characterKeyOf(payload);
      if (!key) {
        return { ok: false, reason: "Missing character." };
      }
      if (payload.dragKind === "npcStaged" && payload.seated) {
        const seat = seatKeyOf(payload);
        if (seat) {
          ctx.scenes({ op: "seatPresence", seat, present: true });
        }
        ctx.scenes({ op: "stage", changes: { [key]: { remove: true } } });
        return { ok: true, did: action };
      }
      ctx.scenes({ op: "stage", changes: { [key]: { remove: true } } });
      return { ok: true, did: action };
    }

    case "clearFromSeat": {
      // Unseat NPC: clear by lighting path is seatNpc reverse — use seatPresence false then stage remove not applicable.
      // Named NPCs leave via seatMove to nowhere is not supported; dashboard uses clear through stage remove of seated?
      // Contracts: Clear from Seat for NPC — send seatPresence false is narrative; true clear needs seatNpc empty.
      // Existing bridge: no explicit unseat. Use seatPresence false for narrative; roster return uses stage remove.
      const seat = seatKeyOf(payload);
      if (!seat) {
        return { ok: false, reason: "Missing seat." };
      }
      ctx.scenes({ op: "seatPresence", seat, present: false });
      return { ok: true, did: action };
    }

    case "deactivatePc": {
      const seat = seatKeyOf(payload);
      if (!seat) {
        return { ok: false, reason: "Missing seat." };
      }
      ctx.scenes({ op: "seatPresence", seat, present: false });
      return { ok: true, did: action };
    }

    case "clearCancelRoll": {
      if (payload.dragKind === "pcRollPreroll" || payload.dragKind === "pcRollPostroll") {
        ctx.rolls({ op: "cancel", color: payload.color });
        return { ok: true, did: action };
      }
      ctx.rolls({ op: "npcCancel" });
      return { ok: true, did: action };
    }

    case "removeFromDeck": {
      const key = sceneKeyOf(payload, target);
      if (!key) {
        return { ok: false, reason: "Missing scene." };
      }
      ctx.ui?.removeFromDeck?.(key);
      return { ok: true, did: action };
    }

    case "moveOnStage":
    case "addToStage":
    case "addNearStaged":
    case "packJoin":
    case "packAddFromRoster":
    case "packWithStaged": {
      const key = characterKeyOf(payload);
      if (!key || target.dropKind !== "stage" && target.dropKind !== "pack" && target.dropKind !== "npcStaged") {
        // Stage geometry still handled by StageLayer; this path covers Out/panel-initiated moves.
        if (key && "u" in target && typeof target.u === "number" && typeof target.v === "number") {
          ctx.scenes({ op: "stage", changes: { [key]: { u: target.u, v: target.v } } });
          return { ok: true, did: action };
        }
        return { ok: false, reason: "Stage placement needs coordinates from the board layer." };
      }
      if (key && "u" in target && typeof target.u === "number" && typeof target.v === "number") {
        ctx.scenes({ op: "stage", changes: { [key]: { u: target.u, v: target.v } } });
      }
      return { ok: true, did: action };
    }

    case "seatToStage":
    case "packFromSeated":
    case "seatedOntoStaged": {
      const key = characterKeyOf(payload);
      const seat = seatKeyOf(payload);
      if (!key || !seat) {
        return { ok: false, reason: "Missing seated NPC." };
      }
      ctx.scenes({ op: "seatPresence", seat, present: false });
      if ("u" in target && typeof target.u === "number" && typeof target.v === "number") {
        ctx.scenes({ op: "stage", changes: { [key]: { u: target.u, v: target.v, lightMode: "STANDARD" } } });
      }
      return { ok: true, did: action };
    }

    case "occupyEmptySeat":
    case "stagedOccupyEmptySeat":
    case "moveToEmptySeat": {
      if (target.dropKind !== "emptySeat" && target.dropKind !== "npcSeated" && target.dropKind !== "pcSeated") {
        return { ok: false, reason: "Not a seat." };
      }
      const chair = "chair" in target ? target.chair : undefined;
      if (chair === undefined) {
        return { ok: false, reason: "Missing chair." };
      }
      if (payload.dragKind === "pcSeated" || payload.dragKind === "npcSeated") {
        ctx.scenes({ op: "seatMove", seat: payload.seatKey, chair });
        return { ok: true, did: action };
      }
      const key = characterKeyOf(payload);
      if (!key) {
        return { ok: false, reason: "Missing NPC." };
      }
      ctx.scenes({ op: "seatNpc", characterKey: key, chair });
      return { ok: true, did: action };
    }

    case "swapSeats":
    case "swapOrDisplaceOntoNpcSeat":
    case "rosterOntoNpcSeat": {
      if (!("chair" in target) || target.chair === undefined) {
        return { ok: false, reason: "Missing chair." };
      }
      if (payload.dragKind === "pcSeated" || payload.dragKind === "npcSeated") {
        ctx.scenes({ op: "seatMove", seat: payload.seatKey, chair: target.chair });
        return { ok: true, did: action };
      }
      const key = characterKeyOf(payload);
      if (!key) {
        return { ok: false, reason: "Missing NPC." };
      }
      ctx.scenes({ op: "seatNpc", characterKey: key, chair: target.chair });
      return { ok: true, did: action };
    }

    case "returnToRoster":
    case "unseatToRoster": {
      const key = characterKeyOf(payload);
      if (!key) {
        return { ok: false, reason: "Missing NPC." };
      }
      if (payload.dragKind === "npcStaged" || payload.dragKind === "npcSeated") {
        ctx.scenes({ op: "stage", changes: { [key]: { remove: true } } });
      }
      if (payload.dragKind === "npcSeated") {
        // Narrative unseat: darken then remove is incomplete without unseat op — seatPresence false.
        ctx.scenes({ op: "seatPresence", seat: payload.seatKey, present: false });
      }
      return { ok: true, did: action };
    }

    case "activateIntoScene":
    case "markPresentInActiveScene": {
      const seat = seatKeyOf(payload) ?? ("seatKey" in target ? target.seatKey : undefined);
      if (seat) {
        ctx.scenes({ op: "seatPresence", seat, present: true });
        return { ok: true, did: action };
      }
      return { ok: false, reason: "No seat to activate." };
    }

    case "broadcastRoll":
    case "broadcast":
    case "broadcastAgain": {
      if (options?.secretSafe) {
        return applyDndAction("secretSafeBroadcast", payload, target, ctx, options);
      }
      if (payload.dragKind === "pcRollPostroll" || payload.dragKind === "pcRollPreroll") {
        ctx.rolls({ op: "broadcast", color: payload.color, secretSafe: false } as RollsCommand);
        return { ok: true, did: action };
      }
      ctx.rolls({ op: "npcConfirm", quiet: false, secretSafe: false } as RollsCommand);
      return { ok: true, did: action };
    }

    case "broadcastRollSecret":
    case "secretSafeBroadcast": {
      if (payload.dragKind.startsWith("pcRoll")) {
        const color = colorOf(payload);
        if (!color) {
          return { ok: false, reason: "Missing PC color." };
        }
        ctx.rolls({ op: "broadcast", color, secretSafe: true } as RollsCommand);
        return { ok: true, did: action };
      }
      ctx.rolls({ op: "npcConfirm", quiet: false, secretSafe: true } as RollsCommand);
      return { ok: true, did: action };
    }

    case "executeRoll": {
      if (payload.dragKind === "pcRollPreroll") {
        // PC rolls execute from the player; ST approval path already set — no-op broadcast of ready.
        ctx.ui?.notify?.("PC executes from their seat; difficulty is already set.");
        return { ok: true, did: action };
      }
      ctx.rolls({ op: "npcRoll", secret: false });
      return { ok: true, did: action };
    }

    case "executeSecret": {
      ctx.rolls({ op: "npcRoll", secret: true });
      return { ok: true, did: action };
    }

    case "cancelRoll":
      return applyDndAction("clearCancelRoll", payload, target, ctx);

    case "confirmResolve":
    case "confirmHold": {
      if (payload.dragKind.startsWith("pcRoll")) {
        const color = colorOf(payload);
        if (!color) {
          return { ok: false, reason: "Missing color." };
        }
        ctx.rolls({ op: "confirm", color });
        return { ok: true, did: action };
      }
      ctx.rolls({ op: "npcConfirm", quiet: action === "confirmHold" });
      return { ok: true, did: action };
    }

    case "dismiss":
      return applyDndAction("clearCancelRoll", payload, target, ctx);

    case "revealQuietly": {
      ctx.rolls({ op: "npcReveal", broadcast: false } as RollsCommand);
      return { ok: true, did: action };
    }

    case "revealAndBroadcast": {
      ctx.rolls({ op: "npcReveal", broadcast: true } as RollsCommand);
      return { ok: true, did: action };
    }

    case "willpowerReroll": {
      if (payload.dragKind.startsWith("pcRoll")) {
        return { ok: false, reason: "PC WP reroll stays on the player HUD." };
      }
      ctx.rolls({ op: "npcWp" });
      return { ok: true, did: action };
    }

    case "recalculate": {
      if (payload.dragKind.startsWith("pcRoll")) return { ok: false, reason: "Recalculate this PC's result with the existing player controls." };
      ctx.rolls({ op: "npcRecalc" });
      return { ok: true, did: action };
    }

    case "bloodSurge": {
      if (payload.dragKind.startsWith("pcRoll")) return { ok: false, reason: "Blood Surge for a PC is controlled from that player's HUD." };
      ctx.rolls({ op: "npcSurge", on: true, dice: 1 });
      return { ok: true, did: action };
    }

    case "initiateStandard":
      return initiateFor(payload, "standard", ctx);
    case "initiateDiscipline":
      return initiateFor(payload, "discipline", ctx);
    case "initiateFrenzy":
      return initiateFor(payload, "frenzy", ctx);
    case "initiateWillpower":
      return initiateFor(payload, "willpowerRoll", ctx);
    case "initiateRouse":
    case "initiateRouse1":
      return initiateFor(payload, "rouse", ctx);
    case "initiateRouse2":
      return initiateFor(payload, "rouse", ctx);
    case "initiateOblivRouse":
    case "initiateOblivRouse1":
    case "initiateOblivRouse2":
      return initiateFor(payload, "rouseOblivion", ctx);
    case "initiateRemorse":
      return initiateFor(payload, "remorse", ctx);

    case "initiateContested": {
      return { ok: false, reason: "Contested participant selection is not connected to this bin yet. Use the existing roll controls." };
    }

    case "renameGeneric":
    case "editNpc": {
      const key = characterKeyOf(payload);
      if (!key) {
        return { ok: false, reason: "Missing NPC." };
      }
      if (!ctx.ui?.openNpcEdit) return { ok: false, reason: "This control is unavailable here." };
      ctx.ui.openNpcEdit(key);
      return { ok: true, did: action };
    }

    case "openTracker": {
      const key = characterKeyOf(payload);
      if (!key) {
        return { ok: false, reason: "Missing NPC." };
      }
      if (!ctx.ui?.openNpcTracker) return { ok: false, reason: "This control is unavailable here." };
      ctx.ui.openNpcTracker(key);
      return { ok: true, did: action };
    }

    case "changeStats":
    case "openSheet": {
      const color = colorOf(payload);
      if (!color) {
        return { ok: false, reason: "Missing PC." };
      }
      if (!ctx.ui?.openPcSheet) return { ok: false, reason: "This control is unavailable here." };
      ctx.ui.openPcSheet(color);
      return { ok: true, did: action };
    }

    case "forkScene": {
      if (!ctx.ui?.forkScene) return { ok: false, reason: "This control is unavailable here." };
      ctx.ui.forkScene();
      return { ok: true, did: action };
    }

    case "endScene": {
      ctx.scenes({ op: "endScene" });
      return { ok: true, did: action };
    }

    case "memoriam": {
      if (!ctx.ui?.openMemoriam) return { ok: false, reason: "This control is unavailable here." };
      ctx.ui.openMemoriam();
      return { ok: true, did: action };
    }

    case "editPreviewScene": {
      const key = sceneKeyOf(payload, target);
      if (!key) {
        return { ok: false, reason: "Missing scene." };
      }
      ctx.ui?.editPreviewScene?.(key);
      return { ok: true, did: action };
    }

    case "unlinkRelink": {
      ctx.scenes({ op: "unlinkScene" });
      return { ok: true, did: action };
    }

    case "playNow":
    case "playSwitchNow": {
      const key = sceneKeyOf(payload, target);
      if (!key) {
        return { ok: false, reason: "Missing scene." };
      }
      ctx.ui?.playScene?.(key, "now");
      return { ok: true, did: action };
    }

    case "playAtSceneTime":
    case "transitionToScene": {
      const key = sceneKeyOf(payload, target);
      if (!key) {
        return { ok: false, reason: "Missing scene." };
      }
      ctx.ui?.playScene?.(key, "sceneTime");
      return { ok: true, did: action };
    }

    case "reorderDeck": {
      const dragKey = "sceneKey" in payload ? payload.sceneKey : undefined;
      const dropKey = "sceneKey" in target ? target.sceneKey : undefined;
      if (!dragKey || !dropKey) {
        return { ok: false, reason: "Missing deck keys." };
      }
      ctx.ui?.reorderDeck?.(dragKey, dropKey);
      return { ok: true, did: action };
    }

    case "setSceneStatus": {
      const key = sceneKeyOf(payload, target);
      if (!key) {
        return { ok: false, reason: "Missing scene." };
      }
      ctx.ui?.setSceneStatus?.(key);
      return { ok: true, did: action };
    }

    case "renameScene": {
      const key = sceneKeyOf(payload, target);
      if (key) {
        ctx.ui?.renameScene?.(key);
      }
      return { ok: true, did: action };
    }

    case "archiveScene": {
      const key = sceneKeyOf(payload, target);
      if (key) {
        ctx.ui?.archiveScene?.(key);
      }
      return { ok: true, did: action };
    }

    case "deleteScene": {
      const key = sceneKeyOf(payload, target);
      if (key) {
        ctx.ui?.deleteScene?.(key);
      }
      return { ok: true, did: action };
    }

    case "duplicateAsTemplate": {
      const key = sceneKeyOf(payload, target);
      if (key) {
        if (!ctx.ui?.duplicateAsTemplate) return { ok: false, reason: "This control is unavailable here." };
        ctx.ui.duplicateAsTemplate(key);
      }
      return { ok: true, did: action };
    }

    case "duplicateRollToPc":
    case "duplicateNpcRollToPc":
    case "duplicateSecretToPc":
    case "duplicateRollToCharacter":
    case "duplicateRollSecretToCharacter": {
      const toColor =
        target.dropKind === "pcSeated" && "holderKey" in target ? target.holderKey : undefined;
      const toNpc =
        (target.dropKind === "npcStaged" || target.dropKind === "npcSeated" || target.dropKind === "npcRoster") &&
        ("characterKey" in target || "holderKey" in target)
          ? ("characterKey" in target ? target.characterKey : undefined) ??
            ("holderKey" in target ? target.holderKey : undefined)
          : undefined;
      const fromColor = colorOf(payload);
      const rollType = "rollType" in payload ? payload.rollType ?? "standard" : "standard";
      if (toColor) {
        ctx.rolls({
          op: "duplicateRoll",
          toColor,
          fromColor,
          rollType,
          secret: action.includes("Secret") || action.includes("secret")
        } as RollsCommand);
        return { ok: true, did: action };
      }
      if (toNpc) {
        ctx.rolls({
          op: "duplicateRoll",
          toCharacterKey: toNpc,
          fromColor,
          rollType,
          secret: action.includes("Secret") || action.includes("secret")
        } as RollsCommand);
        return { ok: true, did: action };
      }
      return { ok: false, reason: "Missing duplicate target." };
    }

    case "retargetRoll": {
      const key = characterKeyOf(payload);
      const color = colorOf(payload);
      if (target.dropKind === "pcRollPreroll" || target.dropKind === "npcRollPreroll") {
        ctx.rolls({
          op: "retargetRoll",
          toColor: "color" in target ? target.color : undefined,
          characterKey: key,
          fromColor: color
        } as RollsCommand);
        return { ok: true, did: action };
      }
      return { ok: false, reason: "Retarget needs a preroll card." };
    }

    case "setDifficultyFromMargin":
    case "setDifficultyFromMarginSecret": {
      if (target.dropKind === "npcRollPreroll") {
        const margin = "margin" in payload ? payload.margin : undefined;
        if (typeof margin !== "number" || !Number.isFinite(margin)) {
          return { ok: false, reason: "The completed roll has no margin yet." };
        }
        ctx.rolls({ op: "npcDifficulty", value: Math.max(0, Math.floor(margin)) });
        return { ok: true, did: action };
      }
      ctx.rolls({
        op: "difficultyFromMargin",
        fromColor: colorOf(payload),
        toColor: "color" in target ? target.color : undefined,
        secretSafe: action === "setDifficultyFromMarginSecret"
      } as RollsCommand);
      return { ok: true, did: action };
    }

    case "applySameTypeConditions": {
      ctx.rolls({
        op: "applyRollSetup",
        fromColor: colorOf(payload),
        toColor: "color" in target ? target.color : undefined
      } as RollsCommand);
      return { ok: true, did: action };
    }

    case "hoverDifficulty": {
      const key = "characterKey" in target ? target.characterKey : "holderKey" in target ? target.holderKey : undefined;
      const value = key ? ctx.ui?.difficultyFor?.(key, target.binId === "diffHigh") : undefined;
      if (value === undefined) return { ok: false, reason: "This NPC has no difficulty in its Stats." };
      const color = colorOf(payload);
      if (color) ctx.rolls({ op: "difficulty", color, value });
      else ctx.rolls({ op: "npcDifficulty", value });
      return { ok: true, did: action };
    }

    case "drawerPinPreroll":
    case "drawerPinPostroll":
    case "drawerPinSecretPostroll":
    case "pinToDrawer": {
      const slot = target.dropKind === "rollDrawer" && "slot" in target ? target.slot : 1;
      ctx.rolls({ op: "pinToDrawer", slot, color: colorOf(payload), secret: action.includes("Secret") });
      return { ok: true, did: action };
    }

    case "drawerStartRoll": {
      const types: Readonly<Record<string, string>> = { std: "standard", disc: "discipline", frenzy: "frenzy", wp: "willpowerRoll", rouse: "rouse" };
      return initiateFor(payload, types[target.binId ?? "std"] ?? "standard", ctx);
    }

    case "chooseHunger": {
      const color = colorOf(payload) ?? (payload.dragKind.startsWith("npcRoll") ? "Black" : undefined);
      if (color) {
        ctx.rolls({ op: "choice", color, choice: "hunger" });
      }
      return { ok: true, did: action };
    }

    case "chooseStain": {
      const color = colorOf(payload) ?? (payload.dragKind.startsWith("npcRoll") ? "Black" : undefined);
      if (color) {
        ctx.rolls({ op: "choice", color, choice: "stain" });
      }
      return { ok: true, did: action };
    }

    case "copyResultSummary": {
      if (!("summary" in payload) || !payload.summary || !ctx.ui?.copyText) return { ok: false, reason: "There is no roll summary to copy." };
      ctx.ui.copyText(payload.summary);
      return { ok: true, did: action };
    }

    case "openRollerSheet": {
      const color = colorOf(payload);
      if (color && ctx.ui?.openPcSheet) ctx.ui.openPcSheet(color);
      else {
        const key = characterKeyOf(payload);
        if (!key || !ctx.ui?.openNpcTracker) return { ok: false, reason: "This roll has no character tracker." };
        ctx.ui.openNpcTracker(key);
      }
      return { ok: true, did: action };
    }
    case "adjustPool":
    case "convertType":
    case "rerollSelected": {
      if (!ctx.ui?.openRollControl?.(action, payload)) return { ok: false, reason: action === "rerollSelected" ? "Pick dice on the NPC roll before dropping it here." : "This roll does not allow that change at its current phase." };
      return { ok: true, did: action };
    }

    case "compareOpposedMargin":
    case "compareOpposedMarginSecret":
    case "noAutoRevealSecret":
    case "contestedVsPc":
    case "addToSceneSeatPlan":
    case "assignTransitionSeat":
    case "initiateProject":
    case "playTiming": {
      return { ok: false, reason: "This drop action is not connected yet. Use the existing character or roll controls for now." };
    }

    default:
      return { ok: false, reason: "This drop action is not connected yet." };
  }
};

/** Convenience: compile scenes commands that may be queued. */
export const asScenesCommands = (command: ScenesCommand): readonly ScenesCommand[] => [command];
