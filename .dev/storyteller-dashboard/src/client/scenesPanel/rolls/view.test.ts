import { describe, expect, it } from "vitest";
import { parseRollOptions } from "./bridge";
import {
  conditionList,
  dieFaceSrc,
  draftFromView,
  huntHeadline,
  poolDiamonds,
  poolRingChoices,
  poolText,
  ringChoices,
  rollTypeEdge,
  rollTypeLabel,
  toggleCondition,
  toggleStructural
} from "./view";

const NEGATING = { takeHalf: "noTakeHalf", wpReroll: "noWPReroll" };

const optionsReply = JSON.stringify({
  ok: true,
  color: "Red",
  rollType: "standard",
  rollTypes: [{ key: "standard", label: "Standard Roll" }],
  permanent: { autoWp: true },
  structural: { takeHalf: true, wpReroll: false },
  locked: { takeHalf: false },
  conditions: [{ id: "noTakeHalf", label: "No Take Half", on: false }, { id: "noWPReroll", label: "No WP Reroll", on: true }],
  negating: NEGATING,
  rerolls: 1,
  diceRerolled: 3
});

describe("ringChoices", () => {
  it("offers one roll per dice bag", () => {
    expect(ringChoices({ werewolf: false, oblivion: true, endPhase: false }).map((choice) => choice.rollType))
      .toEqual(["standard", "discipline", "willpowerRoll", "frenzy", "rouse", "rouseOblivion"]);
  });

  it("swaps Oblivion Rouse for Remorse in the End phase and drops it without a bag", () => {
    expect(ringChoices({ werewolf: false, oblivion: true, endPhase: true }).at(-1)?.rollType).toBe("remorse");
    expect(ringChoices({ werewolf: false, oblivion: false, endPhase: false }).map((choice) => choice.rollType)).not.toContain("rouseOblivion");
  });

  it("gives Werewolf NPCs only the Werewolf roll", () => {
    expect(ringChoices({ werewolf: true, oblivion: true, endPhase: false })).toEqual([{ rollType: "werewolf", label: "Werewolf" }]);
  });
});

describe("pool and dice display", () => {
  it("puts Rouse dice apart and splits the main pool into runs of five across kinds", () => {
    const { rouse, runs } = poolDiamonds({ normal: 5, hunger: 2, rouse: 1, oblivRouse: 1 });
    expect(rouse).toEqual(["oblivRouse", "rouse"]);
    expect(runs).toEqual([["hunger", "hunger", "normal", "normal", "normal"], ["normal", "normal"]]);
    expect(poolDiamonds({})).toEqual({ rouse: [], runs: [] });
  });

  it("picks the coffin face by kind and value", () => {
    expect(dieFaceSrc("hunger", 1)).toBe("/icons/dice/hunger_1.svg");
    expect(dieFaceSrc("hunger", 4)).toBe("/icons/dice/hunger_2-5.svg");
    expect(dieFaceSrc("rage", 10)).toBe("/icons/dice/hunger_10.svg");
    expect(dieFaceSrc("normal", 1)).toBe("/icons/dice/standard_1-5.svg");
    expect(dieFaceSrc("werewolf", 7)).toBe("/icons/dice/standard_6-9.svg");
    expect(dieFaceSrc("normal", undefined)).toBe("/icons/dice/standard_1-5.svg");
  });

  it("offers Rage and Werewolf dice on a Werewolf roll, else Hunger and normal", () => {
    expect(poolRingChoices("werewolf").map((choice) => choice.kind)).toEqual(["rage", "werewolf"]);
    expect(poolRingChoices("standard").map((choice) => choice.kind)).toEqual(["hunger", "normal"]);
  });
});

describe("roll labels", () => {
  it("reads pools compactly", () => {
    expect(poolText({ normal: 4, hunger: 2 })).toBe("4 + 2H");
    expect(poolText({ rouse: 1 })).toBe("1R");
    expect(poolText({})).toBe("—");
  });

  it("splits the comma-separated roll conditions", () => {
    expect(conditionList("No Take Half, No WP Reroll")).toEqual(["No Take Half", "No WP Reroll"]);
    expect(conditionList("")).toEqual([]);
  });

  it("names roll types and hunt results", () => {
    expect(rollTypeLabel("willpowerRoll")).toBe("Willpower");
    expect(rollTypeLabel("mystery")).toBe("mystery");
    expect(rollTypeEdge("standard", false)).toBe("Standard");
    expect(rollTypeEdge("standard", true)).toBe("Std.");
    expect(rollTypeEdge("mystery", true)).toBe("mystery");
    expect(huntHeadline("Sanguine", "intense")).toBe("INTENSE SANGUINE");
    expect(huntHeadline(null, "none")).toBe("NO RESONANCE");
  });
});

describe("roll options draft", () => {
  const view = parseRollOptions(optionsReply);

  it("parses the options reply", () => {
    expect(view.locked).toEqual({ takeHalf: false, hungerDice: false });
    expect(view.conditions).toHaveLength(2);
    expect(() => parseRollOptions(JSON.stringify({ ok: false, error: "Red has no roll in progress." }))).toThrow(/no roll/);
  });

  it("keeps a structural rule and its negating condition opposite", () => {
    const draft = draftFromView(view);
    const offHalf = toggleStructural(draft, "takeHalf", view.negating);
    expect(offHalf.structural.takeHalf).toBe(false);
    expect(offHalf.conditions.noTakeHalf).toBe(true);
    const onReroll = toggleCondition(draft, "noWPReroll", view.negating);
    expect(onReroll.conditions.noWPReroll).toBe(false);
    expect(onReroll.structural.wpReroll).toBe(true);
  });
});
