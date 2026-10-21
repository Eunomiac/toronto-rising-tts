import { describe, expect, it, vi } from "vitest";
import { applyDndAction } from "./apply";
import type { DragPayload } from "./types";

describe("applyDndAction", () => {
  it("deactivates a PC via seatPresence false", () => {
    const scenes = vi.fn();
    const rolls = vi.fn();
    const payload: DragPayload = {
      dragKind: "pcSeated",
      color: "Blue",
      seatKey: "Blue",
      chair: 1
    };
    const result = applyDndAction("deactivatePc", payload, { dropKind: "out" }, { scenes, rolls });
    expect(result.ok).toBe(true);
    expect(scenes).toHaveBeenCalledWith({ op: "seatPresence", seat: "Blue", present: false });
  });

  it("unseats an NPC when it is dragged off the board", () => {
    const scenes = vi.fn();
    const result = applyDndAction(
      "clearFromSeat",
      { dragKind: "npcSeated", characterKey: "fatherDiaz", seatKey: "NPC2", chair: 6 },
      { dropKind: "out" },
      { scenes, rolls: vi.fn() }
    );
    expect(result.ok).toBe(true);
    expect(scenes).toHaveBeenCalledExactlyOnceWith({ op: "unseatNpc", seat: "NPC2" });
  });

  it("initiates a standard roll for a staged NPC", () => {
    const scenes = vi.fn();
    const rolls = vi.fn();
    const payload: DragPayload = { dragKind: "npcStaged", characterKey: "fatherDiaz" };
    const result = applyDndAction("initiateStandard", payload, { dropKind: "panelA", binId: "std" }, { scenes, rolls, ui: { characterName: () => "Father Diaz" } });
    expect(result.ok).toBe(true);
    expect(rolls).toHaveBeenCalledWith({
      op: "npcInitiate",
      label: "Father Diaz",
      characterKey: "fatherDiaz",
      rollType: "standard"
    });
    expect(rolls).toHaveBeenCalledTimes(1);
  });

  it("seeds Willpower dice after initiating an NPC Willpower roll", () => {
    const rolls = vi.fn();
    const npcTypeSeed = vi.fn(() => ({
      kind: "roll" as const,
      rollType: "willpowerRoll",
      normal: 3,
      hunger: 0,
      rage: 0,
      poolDice: 3,
      discBonus: 0,
      rouse: [],
      hungerOnFail: false,
      heading: "Willpower",
      line: "Father Diaz rolls Willpower",
      marginBonus: 0,
      marginLabel: ""
    }));
    applyDndAction(
      "initiateWillpower",
      { dragKind: "npcStaged", characterKey: "fatherDiaz" },
      { dropKind: "panelA", binId: "wp" },
      { scenes: vi.fn(), rolls, ui: { characterName: () => "Father Diaz", npcTypeSeed } }
    );
    expect(npcTypeSeed).toHaveBeenCalledWith("fatherDiaz", "willpowerRoll");
    expect(rolls).toHaveBeenCalledWith(expect.objectContaining({
      op: "npcStatRoll",
      rollType: "willpowerRoll",
      normal: 3,
      hunger: 0
    }));
  });

  it("secret-safe broadcasts PC postrolls", () => {
    const scenes = vi.fn();
    const rolls = vi.fn();
    const payload: DragPayload = { dragKind: "pcRollPostroll", color: "Red", rollType: "standard" };
    const result = applyDndAction("secretSafeBroadcast", payload, { dropKind: "stage" }, { scenes, rolls });
    expect(result.ok).toBe(true);
    expect(rolls).toHaveBeenCalledWith({ op: "broadcast", color: "Red", secretSafe: true });
  });

  it("ends the active scene", () => {
    const scenes = vi.fn();
    const rolls = vi.fn();
    const payload: DragPayload = { dragKind: "sceneActive", sceneKey: "s1" };
    const result = applyDndAction("endScene", payload, { dropKind: "panelA", binId: "end" }, { scenes, rolls });
    expect(result.ok).toBe(true);
    expect(scenes).toHaveBeenCalledWith({ op: "endScene" });
  });
  it("uses the selected NPC's stat difficulty instead of accepting an empty hover action", () => {
    const rolls = vi.fn();
    const difficultyFor = vi.fn(() => 5);
    const result = applyDndAction("hoverDifficulty", { dragKind: "pcRollPreroll", color: "Pink" }, { dropKind: "npcStaged", characterKey: "victorVex", binId: "diffHigh" }, { scenes: vi.fn(), rolls, ui: { difficultyFor } });
    expect(result.ok).toBe(true);
    expect(difficultyFor).toHaveBeenCalledWith("victorVex", true);
    expect(rolls).toHaveBeenCalledWith({ op: "difficulty", color: "Pink", value: 5 });
  });

  it("opens the existing pool editor, and reports refusal when the roll phase disallows it", () => {
    const payload: DragPayload = { dragKind: "pcRollPreroll", color: "Pink" };
    const openRollControl = vi.fn(() => true);
    const context = { scenes: vi.fn(), rolls: vi.fn(), ui: { openRollControl } };
    expect(applyDndAction("adjustPool", payload, { dropKind: "panelB", binId: "pool" }, context).ok).toBe(true);
    expect(openRollControl).toHaveBeenCalledWith("adjustPool", payload);
    openRollControl.mockReturnValue(false);
    expect(applyDndAction("adjustPool", payload, { dropKind: "panelB", binId: "pool" }, context).ok).toBe(false);
  });

  it("copies the real result summary and rejects an absent summary", () => {
    const copyText = vi.fn();
    const context = { scenes: vi.fn(), rolls: vi.fn(), ui: { copyText } };
    expect(applyDndAction("copyResultSummary", { dragKind: "pcRollPostroll", color: "Pink", summary: "Aishe: WIN +2" }, { dropKind: "panelC" }, context).ok).toBe(true);
    expect(copyText).toHaveBeenCalledWith("Aishe: WIN +2");
    expect(applyDndAction("copyResultSummary", { dragKind: "pcRollPostroll", color: "Pink" }, { dropKind: "panelC" }, context).ok).toBe(false);
  });

  it("honors the drawer's selected roll type", () => {
    const rolls = vi.fn();
    applyDndAction("drawerStartRoll", { dragKind: "pcSeated", color: "Pink", seatKey: "Pink", chair: 1 }, { dropKind: "rollDrawer", slot: 2, binId: "disc" }, { scenes: vi.fn(), rolls });
    expect(rolls).toHaveBeenCalledWith({ op: "initiate", color: "Pink", rollType: "discipline" });
  });

  it("never sends NPC-only surge or recalculation commands for a PC roll", () => {
    const rolls = vi.fn();
    const context = { scenes: vi.fn(), rolls };
    for (const action of ["bloodSurge", "recalculate"] as const) {
      expect(applyDndAction(action, { dragKind: "pcRollPostroll", color: "Pink" }, { dropKind: "panelB" }, context).ok).toBe(false);
    }
    expect(rolls).not.toHaveBeenCalled();
  });

  it("sends NPC outcome choices through the Storyteller seat", () => {
    const rolls = vi.fn();
    applyDndAction("chooseHunger", { dragKind: "npcRollPostrollSecret", characterKey: "victorVex" }, { dropKind: "panelB" }, { scenes: vi.fn(), rolls });
    expect(rolls).toHaveBeenCalledWith({ op: "choice", color: "Black", choice: "hunger" });
  });

  it.each([3, 0, -2])("sets NPC difficulty from PC margin %s", (margin) => {
    const rolls = vi.fn();
    expect(applyDndAction("setDifficultyFromMargin", { dragKind: "pcRollPostroll", color: "Pink", margin }, { dropKind: "npcRollPreroll" }, { scenes: vi.fn(), rolls }).ok).toBe(true);
    expect(rolls).toHaveBeenCalledExactlyOnceWith({ op: "npcDifficulty", value: Math.max(0, margin) });
  });
  it("rejects an absent margin", () => {
    const rolls = vi.fn();
    expect(applyDndAction("setDifficultyFromMargin", { dragKind: "pcRollPostroll", color: "Pink" }, { dropKind: "npcRollPreroll" }, { scenes: vi.fn(), rolls }).ok).toBe(false);
    expect(rolls).not.toHaveBeenCalled();
  });

});
