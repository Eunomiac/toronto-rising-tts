import { identityForColor } from "./identity.js";
import type { SeatColor, SeatSnapshot, SheetSnapshot, Tracker } from "./types.js";

const emptyRating = { base: 0, temp: 0, disabled: 0 };
const emptyTracker = (base: number): Tracker => ({
  base, temp: 0, disabled: 0, superficial: 0, aggravated: 0, stains: 0
});

const emptySeat = (color: SeatColor): SeatSnapshot => {
  const identity = identityForColor(color);
  return {
    color,
    charKey: identity.charKey,
    charName: identity.fullName,
    playerName: "",
    desire: "",
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
      intimidation: { base: 2, temp: 0, disabled: 0 },
      leadership: { base: 2, temp: 0, disabled: 0 },
      performance: emptyRating,
      persuasion: { base: 3, temp: 0, disabled: 0 },
      streetwise: emptyRating,
      subterfuge: { base: 4, temp: 0, disabled: 0 },
      academics: emptyRating,
      awareness: { base: 1, temp: 0, disabled: 0 },
      finance: emptyRating,
      investigation: emptyRating,
      medicine: emptyRating,
      occult: { base: 2, temp: 0, disabled: 0 },
      politics: { base: 2, temp: 0, disabled: 0 },
      science: emptyRating,
      technology: emptyRating
    },
    specialties: [
      { skill: "insight", type: "standard", name: "Omens" },
      { skill: "leadership", type: "standard", name: "Clan Malkavian" },
      { skill: "performance", type: "archaic", name: "Fortune-Telling", decade: 1810 },
      { skill: "performance", type: "archaic", name: "Disco", decade: 1940 },
      { skill: "occult", type: "archaic", name: "Mediumship", decade: 1880 }
    ],
    health: emptyTracker(5),
    willpower: emptyTracker(6),
    humanity: { base: 7, temp: 0, disabled: 0, superficial: 0, aggravated: 0, stains: 0 },
    bloodPotency: { base: 2, temp: 0, disabled: 0 },
    xp: 5,
    hunger: 1,
    hungerMax: 5,
    resolvedStatChanges: {},
    badges: { etiquette: 2, politics: 2 },
    bloodSurge: 2,
    mending: 2,
    healthMax: 5,
    willpowerMax: 6,
    humanityMax: 7,
    torpor: false,
    hudFrenzy: false,
    hudBlindfold: false
  };
};

export const fixtureSnapshot = (): SheetSnapshot => ({
  ok: true,
  seats: ["Brown", "Orange", "Red", "Pink", "Purple"].map((color) => {
    const seat = emptySeat(color as SeatColor);
    if (color !== "Pink") {
      return {
        ...seat,
        charKey: identityForColor(color as SeatColor).charKey,
        charName: identityForColor(color as SeatColor).fullName,
        specialties: [],
        badges: {}
      };
    }
    return seat;
  })
});
