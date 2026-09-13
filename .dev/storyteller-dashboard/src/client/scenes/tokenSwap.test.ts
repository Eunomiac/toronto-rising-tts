import { describe, expect, it } from "vitest";
import { swapOntoPolarSnap } from "./tokenSwap";

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
