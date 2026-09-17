import type { Identity, SeatColor } from "./types.js";

const IDENTITIES: Record<string, Identity> = {
  aishe: {
    charKey: "aishe",
    fullName: "Aishe Tache",
    clan: "Malkavian",
    titles: ["Malkavian Primogen"],
    generation: "Eighth",
    birthPlace: "Brasov, Romania",
    birthYear: 1799,
    embracePlace: "Louisiana, USA",
    embraceYear: 1834,
    ambition: "Create a legacy in Toronto that long outlasts me",
    convictions: [
      "You Must Take Care Of Yourself First",
      "Keep Every Door Open",
      "Keep Everyone Guessing"
    ]
  },
  lordLucien: {
    charKey: "lordLucien",
    fullName: "Lord Lucien St. Clair",
    clan: "Toreador",
    titles: ["Prince"],
    generation: "Tenth",
    birthPlace: "Lucerne, Switzerland",
    birthYear: 1864,
    embracePlace: "Paris, France",
    embraceYear: 1889,
    ambition: "Orchestrate a political order that collapses without me",
    convictions: [
      "Drama Over Caution",
      "You Must Take Care Of Your Friends First",
      "Results Sanctify The Method"
    ]
  },
  rashid: {
    charKey: "rashid",
    fullName: "Rashid Abdulrahman",
    clan: "Banu Haqim",
    titles: ["Vizier Caste", "Seneschal"],
    generation: "Eighth",
    birthPlace: "Diriyah, Ottoman Empire",
    birthYear: 1774,
    embracePlace: "Diriyah, Ottoman Empire",
    embraceYear: 1811,
    ambition: "",
    convictions: [
      "The City Must Not Burn",
      "Diplomacy Over Coercion",
      "The Court Must Be Protected"
    ]
  },
  fomorach: {
    charKey: "fomorach",
    fullName: "Fomórach",
    clan: "Nosferatu",
    titles: ["Nosferatu Primogen"],
    generation: "Eighth",
    birthPlace: "Belfast, Ireland",
    birthYear: 1769,
    embracePlace: "Pennsylvania, USA",
    embraceYear: 1786,
    ambition: "",
    convictions: [
      "Clan Over Sect",
      "Survival At Any Cost",
      "The British Must Be Destroyed"
    ]
  },
  blackCaesar: {
    charKey: "blackCaesar",
    fullName: "Henri “Black” Caesar",
    clan: "Tremere",
    titles: ["Sheriff"],
    generation: "Eighth",
    birthPlace: "Asante Empire",
    birthYear: 1699,
    embracePlace: "Spanish Florida, USA",
    embraceYear: 1735,
    ambition: "",
    convictions: [
      "My Soldiers Must Be Able To Handle Anything",
      "The Captain Always Saves Himself First",
      "Reward Success, Excoriate Failure"
    ]
  }
};

export const CHAR_BY_COLOR: Record<SeatColor, string> = {
  Brown: "fomorach",
  Orange: "rashid",
  Red: "lordLucien",
  Pink: "aishe",
  Purple: "blackCaesar"
};

export const identityFor = (charKey: string): Identity => IDENTITIES[charKey] ?? {
  charKey,
  fullName: charKey,
  clan: "",
  titles: [],
  generation: "",
  birthPlace: "",
  birthYear: 0,
  embracePlace: "",
  embraceYear: 0,
  ambition: "",
  convictions: []
};

export const identityForColor = (color: SeatColor): Identity => identityFor(CHAR_BY_COLOR[color]);

export const subtitleFor = (identity: Identity): string => {
  const title = identity.titles[identity.titles.length - 1] ?? identity.clan;
  return `${identity.generation} Generation ${title} of Clan ${identity.clan}`;
};

export const chronologyFor = (identity: Identity): string =>
  `Born in ${identity.birthPlace}, ${identity.birthYear}  ·  Embraced in ${identity.embracePlace}, ${identity.embraceYear}`;
