import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScenesCommandContext } from "./commands";
import { PersonalDueList, durationForTrigger } from "./personalConditions";
import { Seats } from "./sketch";
import type { ApplyCommand, SeatSnapshot, SheetSnapshot } from "../pcSheet/types";
import type { LiveSheetAccess } from "../pcSheet/useLiveSheet";

const tracker = { base: 0, temp: 0, disabled: 0, superficial: 0, aggravated: 0, stains: 0 };

const pink = (cards: SeatSnapshot["personalCards"] = []): SeatSnapshot => ({
  color: "Pink",
  charKey: "aishe",
  charName: "Aishe",
  playerName: "Aishe",
  clan: "",
  bloodline: "",
  titles: [],
  generation: "",
  birthPlace: "",
  birthYear: 0,
  embracePlace: "",
  embraceYear: 0,
  convictions: [],
  desire: "",
  ambition: "",
  absentFromSession: false,
  connected: true,
  deferAutoSeat: false,
  deferConnect: false,
  attributes: {},
  skills: {},
  specialties: [],
  health: tracker,
  willpower: tracker,
  humanity: tracker,
  bloodPotency: { base: 0, temp: 0, disabled: 0 },
  playerData: {},
  hunger: 2,
  hungerMax: 5,
  resolvedStatChanges: {},
  badges: {},
  bloodSurge: 0,
  mending: 0,
  discBonus: 0,
  discReroll: 0,
  baneSeverity: 0,
  healthMax: 5,
  willpowerMax: 5,
  humanityMax: 5,
  torpor: false,
  hudFrenzy: false,
  hudBlindfold: false,
  projectStakes: {},
  relationships: [],
  personalCards: cards
} as SeatSnapshot);

const sheetFor = (seat: SeatSnapshot): LiveSheetAccess => {
  const snapshot: SheetSnapshot = {
    ok: true,
    seats: [seat],
    sessionNum: 4,
    manualConditions: [{ id: "stronger", displayName: "Stronger" }]
  };
  return { sheet: snapshot, error: null, load: vi.fn(), apply: vi.fn() };
};

const renderSeat = (access: LiveSheetAccess) => render(
  <ScenesCommandContext.Provider value={vi.fn()}>
    <Seats
      seats={[{ slot: 1, kind: "pc", color: "Pink", name: "Aishe", seatKey: "Pink" }]}
      liveSheet={access}
    />
  </ScenesCommandContext.Provider>
);

describe("seat condition controls", () => {
  it("applies a resonance from the grid and refuses a seventh sheet card", async () => {
    const user = userEvent.setup();
    const access = sheetFor(pink());
    renderSeat(access);
    await user.click(screen.getByText("Aishe"));
    await user.click(screen.getByRole("button", { name: "Resonance" }));
    const choleric = screen.getAllByRole("button", { name: "Choleric" });
    expect(choleric).toHaveLength(3);
    const fleetingCholeric = choleric[0];
    expect(fleetingCholeric).toBeTruthy();
    await user.click(fleetingCholeric!);
    expect(access.apply).toHaveBeenCalledWith({
      op: "personalResonance",
      color: "Pink",
      temperament: "fleetingly",
      resonanceType: "Choleric"
    } satisfies ApplyCommand);

    await user.click(screen.getByRole("button", { name: "Condition" }));
    expect(screen.getByRole("option", { name: "Stronger" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Add condition" }));
    expect(access.apply).toHaveBeenCalledWith(expect.objectContaining({
      op: "personalCardAdd",
      color: "Pink",
      displayOnSheet: true,
      kind: "EndOfScene"
    }));
  });

  it("will not add a ninth condition onto the sheet", async () => {
    const user = userEvent.setup();
    const cards = Array.from({ length: 8 }, (_, index) => ({
      id: `pc-${index}`,
      title: `Card ${index}`,
      displayType: "general",
      displayOnSheet: true,
      removalTrigger: "Manual",
      triggerLabel: "Manual"
    }));
    renderSeat(sheetFor(pink(cards)));
    await user.click(screen.getByText("Aishe"));
    await user.click(screen.getByRole("button", { name: "Condition" }));
    expect(screen.getByRole("button", { name: "Add condition" })).toBeDisabled();
    expect(screen.getByText(/already has eight conditions/)).toBeTruthy();
  });
});

describe("conditions ready to remove", () => {
  it("confirms, and does not remove the card on skip", async () => {
    const user = userEvent.setup();
    const apply = vi.fn();
    render(
      <PersonalDueList
        sessionNum={4}
        apply={apply}
        rows={[{ color: "Pink", name: "Aishe", id: "pc-1", title: "Drowning", trigger: "End of the scene", pending: "EndOfScene", hunger: 2 }]}
      />
    );
    await user.click(screen.getByRole("button", { name: "Not yet" }));
    expect(apply).toHaveBeenCalledWith({ op: "personalDueSkip", color: "Pink", id: "pc-1" });
    await user.click(screen.getByRole("button", { name: "Remove it" }));
    expect(apply).toHaveBeenCalledWith({ op: "personalDueConfirm", color: "Pink", id: "pc-1" });
  });

  it("does not offer a new ending for a resonance", () => {
    render(
      <PersonalDueList
        sessionNum={4}
        apply={vi.fn()}
        rows={[{
          color: "Pink",
          name: "Aishe",
          id: "pc-2",
          title: "Acutely Sanguine, Thin blood",
          trigger: "Hunger drops, or Hunger reaches 5",
          pending: "ChangeOfBlood",
          hunger: 2,
          fixedEnding: true
        }]}
      />
    );
    expect(screen.queryByRole("button", { name: "Change the ending" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove it" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Not yet" })).toBeTruthy();
  });
});

describe("durationForTrigger", () => {
  it("fills the short lines from the overview", () => {
    expect(durationForTrigger("EndOfScene", 4, 2026, 9, 4)).toBe("The end of the current scene.");
    expect(durationForTrigger("EndOfSession", 4, 2026, 9, 4)).toBe("The end of Session 4.");
    expect(durationForTrigger("Clock", 4, 2026, 9, 4)).toBe("Nightfall on Sept 4th, 2026.");
    expect(durationForTrigger("ChangeOfBlood", 4, 2026, 9, 4)).toBe("Until you Feed or Starve.");
    expect(durationForTrigger("Manual", 4, 2026, 9, 4)).toBe("");
  });
});
