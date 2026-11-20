import { describe, expect, it } from "vitest";
import {
  clearPlayAsNpcCommand,
  colorPlayingNpc,
  playAsNpcCommand,
} from "./playAsNpc";

describe("playAsNpc commands", () => {
  it("builds playAsNpc with optional generic fields", () => {
    expect(
      playAsNpcCommand({
        color: "Pink",
        npcKey: "drake",
        roleplayNotes: "Be charming",
      })
    ).toEqual({
      op: "playAsNpc",
      color: "Pink",
      npcCharacterKey: "drake",
      roleplayNotes: "Be charming",
    });
    expect(
      playAsNpcCommand({
        color: "Brown",
        npcKey: "extra_01",
        roleplayNotes: "",
        displayName: "Thug",
        tier: "gifted",
      })
    ).toEqual({
      op: "playAsNpc",
      color: "Brown",
      npcCharacterKey: "extra_01",
      roleplayNotes: "",
      displayName: "Thug",
      tier: "gifted",
    });
  });

  it("builds clearPlayAsNpc", () => {
    expect(clearPlayAsNpcCommand("Red")).toEqual({ op: "clearPlayAsNpc", color: "Red" });
  });

  it("finds which color plays an NPC", () => {
    expect(
      colorPlayingNpc(
        [
          { kind: "pc", color: "Pink", playingNpcKey: "drake" },
          { kind: "pc", color: "Red" },
        ],
        "drake"
      )
    ).toBe("Pink");
    expect(colorPlayingNpc([{ kind: "pc", color: "Red" }], "drake")).toBeUndefined();
  });
});
