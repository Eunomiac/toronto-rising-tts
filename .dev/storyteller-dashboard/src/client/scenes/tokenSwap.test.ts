import { describe, expect, it } from "vitest";
import { swapOntoPolarSnap, swapSeatOccupants, moveSeatOccupant } from "./tokenSwap";

describe("swapOntoPolarSnap", () => {
  it("swaps two polar tokens", () => {
    const next = swapOntoPolarSnap(
      [
        { characterKey: "a", snapIndex: 1, npcLightMode: "OFF" },
        { characterKey: "b", snapIndex: 2, npcLightMode: "STANDARD" }
      ],
      "a",
      2,
      1,
      "OFF"
    );
    expect(next.find((token) => token.characterKey === "a")?.snapIndex).toBe(2);
    expect(next.find((token) => token.characterKey === "b")?.snapIndex).toBe(1);
    expect(next.find((token) => token.characterKey === "b")?.npcLightMode).toBe("STANDARD");
  });

  it("evicts the occupant when the mover had no polar origin", () => {
    const next = swapOntoPolarSnap(
      [{ characterKey: "b", snapIndex: 2, npcLightMode: "STANDARD" }],
      "a",
      2,
      undefined,
      "OFF"
    );
    expect(next.map((token) => token.characterKey)).toEqual(["a"]);
  });
});

describe("seat occupants", () => {
  const orange = { characterKey: "rashid", isPlayingNPC: false, isPresent: true, tableSlot: 1 };
  const red = { characterKey: "lordLucien", isPlayingNPC: false, isPresent: true, tableSlot: 2 };

  it("swaps two seated players including table slots", () => {
    const next = swapSeatOccupants({ Orange: orange, Red: red }, "Orange", "Red");
    expect(next.Orange?.characterKey).toBe("lordLucien");
    expect(next.Red?.characterKey).toBe("rashid");
    expect(next.Orange?.tableSlot).toBe(1);
    expect(next.Red?.tableSlot).toBe(2);
  });

  it("moves onto an empty chair and clears the source chair", () => {
    const next = moveSeatOccupant(
      {
        Orange: orange,
        NPC1: { characterKey: "", isPlayingNPC: false, isPresent: false, slotEmpty: true }
      },
      "Orange",
      "NPC1"
    );
    expect(next.NPC1?.characterKey).toBe("rashid");
    expect(next.Orange?.slotEmpty).toBe(true);
    expect(next.Orange?.characterKey).toBe("");
  });
});
