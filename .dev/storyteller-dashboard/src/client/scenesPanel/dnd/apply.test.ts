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

  it("initiates a standard roll for a staged NPC", () => {
    const scenes = vi.fn();
    const rolls = vi.fn();
    const payload: DragPayload = { dragKind: "npcStaged", characterKey: "npc_foo" };
    const result = applyDndAction("initiateStandard", payload, { dropKind: "panelA", binId: "std" }, { scenes, rolls });
    expect(result.ok).toBe(true);
    expect(rolls).toHaveBeenCalledWith({
      op: "npcInitiate",
      label: "npc_foo",
      characterKey: "npc_foo",
      rollType: "standard"
    });
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
});
