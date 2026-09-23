import type { SeatColor, SeatSnapshot, SheetSnapshot, Tracker } from "./types.js";

const emptyRating = { base: 0, temp: 0, disabled: 0 };
const emptyTracker = (base: number): Tracker => ({
  base, temp: 0, disabled: 0, superficial: 0, aggravated: 0, stains: 0
});

/** Minimal seats for unit tests only — never shown in the live PCs tab. */
export const emptySeat = (color: SeatColor): SeatSnapshot => ({
  color,
  charKey: "test",
  charName: "Test",
  playerName: "",
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
  deferAutoSeat: false,
  deferConnect: false,
  attributes: {
    strength: { base: 1, temp: 0, disabled: 0 },
    dexterity: { base: 2, temp: 0, disabled: 0 },
    stamina: { base: 2, temp: 0, disabled: 0 },
    charisma: { base: 3, temp: 0, disabled: 0 },
    manipulation: { base: 4, temp: 0, disabled: 0 },
    composure: { base: 3, temp: 0, disabled: 0 },
    intelligence: { base: 2, temp: 0, disabled: 0 },
    wits: { base: 2, temp: 0, disabled: 0 },
    resolve: { base: 3, temp: 0, disabled: 0 }
  },
  skills: {
    athletics: { base: 1, temp: 0, disabled: 0 },
    brawl: { base: 1, temp: 0, disabled: 0 },
    craft: emptyRating,
    drive: emptyRating,
    firearms: emptyRating,
    larceny: emptyRating,
    melee: emptyRating,
    stealth: emptyRating,
    survival: emptyRating,
    animalKen: emptyRating,
    etiquette: { base: 2, temp: 0, disabled: 0 },
    insight: { base: 3, temp: 0, disabled: 0 },
    intimidation: emptyRating,
    leadership: emptyRating,
    performance: emptyRating,
    persuasion: { base: 2, temp: 0, disabled: 0 },
    streetwise: emptyRating,
    subterfuge: { base: 3, temp: 0, disabled: 0 },
    academics: emptyRating,
    awareness: emptyRating,
    finance: emptyRating,
    investigation: emptyRating,
    medicine: emptyRating,
    occult: { base: 2, temp: 0, disabled: 0 },
    politics: emptyRating,
    science: emptyRating,
    technology: emptyRating
  },
  specialties: [
    { skill: "insight", type: "standard", name: "Omens" },
    { skill: "subterfuge", type: "archaic", name: "Courtly Lies", decade: 1830 }
  ],
  health: emptyTracker(5),
  willpower: emptyTracker(4),
  humanity: { ...emptyTracker(7), stains: 0 },
  bloodPotency: { base: 2, temp: 0, disabled: 0 },
  xp: 12,
  hunger: 1,
  hungerMax: 5,
  resolvedStatChanges: {},
  badges: { etiquette: 1 },
  bloodSurge: 2,
  mending: 2,
  healthMax: 5,
  willpowerMax: 4,
  humanityMax: 7,
  torpor: false,
  hudFrenzy: false,
  hudBlindfold: false
});

export const fixtureSnapshot = (): SheetSnapshot => ({
  ok: true,
  seats: ["Brown", "Orange", "Red", "Pink", "Purple"].map((color) => emptySeat(color as SeatColor))
});

export const emptySnapshot = (): SheetSnapshot => ({
  ok: false,
  seats: []
});
