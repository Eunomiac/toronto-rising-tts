import type { Identity, SeatColor, SeatSnapshot } from "./types.js";

export const clanPhraseFor = (clan: string): string => {
  if (clan === "Banu Haqim") {
    return "the Banu Haqim";
  }
  if (clan === "") {
    return "";
  }
  return `Clan ${clan}`;
};

export const identityFromSeat = (seat: SeatSnapshot): Identity => ({
  charKey: seat.charKey,
  fullName: seat.charName,
  clan: seat.clan,
  bloodline: seat.bloodline,
  titles: seat.titles,
  generation: seat.generation,
  birthPlace: seat.birthPlace,
  birthYear: seat.birthYear,
  embracePlace: seat.embracePlace,
  embraceYear: seat.embraceYear,
  ambition: seat.ambition,
  convictions: seat.convictions
});

export const subtitleFor = (identity: Identity): string => {
  const clanPart = clanPhraseFor(identity.clan);
  const bloodline = identity.bloodline.trim();
  const generation = identity.generation.trim();
  if (generation === "" && clanPart === "") {
    return bloodline;
  }
  const head = `${generation} Generation Ancilla of ${clanPart}`.trim();
  if (bloodline === "") {
    return head;
  }
  return `${head} ◆ ${bloodline}`;
};

export const chronologyFor = (identity: Identity): string => {
  if (identity.birthPlace === "" && identity.embracePlace === "") {
    return "";
  }
  return `Born in ${identity.birthPlace}, ${identity.birthYear}  ·  Embraced in ${identity.embracePlace}, ${identity.embraceYear}`;
};

/** @deprecated Live UI must use identityFromSeat. Kept only for unit tests of subtitle formatting. */
export const identityFor = (charKey: string): Identity => ({
  charKey,
  fullName: charKey,
  clan: "",
  bloodline: "",
  titles: [],
  generation: "",
  birthPlace: "",
  birthYear: 0,
  embracePlace: "",
  embraceYear: 0,
  ambition: "",
  convictions: []
});

export const identityForColor = (_color: SeatColor): Identity => identityFor("unknown");
