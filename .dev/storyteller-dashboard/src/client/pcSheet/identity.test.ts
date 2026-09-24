import { describe, expect, it } from "vitest";
import { chronologyFor, clanPhraseFor, identityFromSeat, subtitleFor } from "./identity.js";
import type { SeatSnapshot } from "./types.js";

const seat = (partial: Partial<SeatSnapshot>): SeatSnapshot => ({
  color: "Pink",
  charKey: "aishe",
  charName: "Aishe Tache",
  playerName: "JRook",
  clan: "Malkavian",
  bloodline: "Descendant of the Pythia",
  titles: ["Malkavian Primogen"],
  generation: "Eighth",
  birthPlace: "Brasov, Romania",
  birthYear: 1799,
  embracePlace: "Louisiana, USA",
  embraceYear: 1834,
  convictions: ["Keep Every Door Open"],
  desire: "",
  ambition: "Create a legacy in Toronto that long outlasts me",
  absentFromSession: false,
  deferAutoSeat: false,
  deferConnect: false,
  attributes: {},
  skills: {},
  specialties: [],
  health: { base: 5, temp: 0, disabled: 0, superficial: 0, aggravated: 0, stains: 0 },
  willpower: { base: 4, temp: 0, disabled: 0, superficial: 0, aggravated: 0, stains: 0 },
  humanity: { base: 7, temp: 0, disabled: 0, superficial: 0, aggravated: 0, stains: 0 },
  bloodPotency: { base: 2, temp: 0, disabled: 0 },
  xp: 0,
  xpLog: {},
  hunger: 1,
  hungerMax: 5,
  resolvedStatChanges: {},
  badges: {},
  bloodSurge: 1,
  mending: 1,
  healthMax: 5,
  willpowerMax: 4,
  humanityMax: 7,
  torpor: false,
  hudFrenzy: false,
  hudBlindfold: false,
  ...partial
});

describe("identityFromSeat", () => {
  it("builds a subtitle from live TTS identity fields", () => {
    expect(subtitleFor(identityFromSeat(seat({})))).toBe(
      "Eighth Generation Ancilla of Clan Malkavian ◆ Descendant of the Pythia"
    );
  });

  it("uses Banu Haqim phrasing", () => {
    expect(clanPhraseFor("Banu Haqim")).toBe("the Banu Haqim");
    expect(subtitleFor(identityFromSeat(seat({
      clan: "Banu Haqim",
      bloodline: "Descendant of Ur-Shulgi",
      generation: "Eighth"
    })))).toBe(
      "Eighth Generation Ancilla of the Banu Haqim ◆ Descendant of Ur-Shulgi"
    );
  });

  it("formats chronology from seat birth and embrace fields", () => {
    expect(chronologyFor(identityFromSeat(seat({})))).toBe(
      "Born in Brasov, Romania, 1799  ·  Embraced in Louisiana, USA, 1834"
    );
  });

  it("omits chronology when birth and embrace are empty", () => {
    expect(chronologyFor(identityFromSeat(seat({
      birthPlace: "",
      birthYear: 0,
      embracePlace: "",
      embraceYear: 0
    })))).toBe("");
  });
});
