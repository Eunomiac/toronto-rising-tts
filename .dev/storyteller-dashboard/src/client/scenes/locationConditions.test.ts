import { describe, expect, it } from "vitest";
import { locationConditionIds, mergeLocationConditions } from "./locationConditions";

describe("locationConditionIds", () => {
  it("unions district and site conditions", () => {
    expect(locationConditionIds(["bumpBloodPotency"], ["hudBlindfold", "bumpBloodPotency"])).toEqual([
      "bumpBloodPotency",
      "hudBlindfold"
    ]);
  });
});

describe("mergeLocationConditions", () => {
  it("turns on the new location conditions without dropping unrelated chips", () => {
    expect(mergeLocationConditions(["bonusWPReroll"], [], ["bumpBloodPotency"])).toEqual([
      "bonusWPReroll",
      "bumpBloodPotency"
    ]);
  });

  it("drops previous location conditions that the new place does not apply", () => {
    expect(mergeLocationConditions(["bumpBloodPotency", "bonusWPReroll"], ["bumpBloodPotency"], [])).toEqual([
      "bonusWPReroll"
    ]);
  });
});
