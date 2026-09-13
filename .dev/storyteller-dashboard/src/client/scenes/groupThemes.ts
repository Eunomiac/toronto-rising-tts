export const GROUP_THEMES = [
  "camarilla",
  "anarch",
  "sabbat",
  "independent",
  "hecata",
  "werewolf",
  "aapilu",
  "retainer",
  "civilian"
] as const;

export type GroupTheme = (typeof GROUP_THEMES)[number];

const THEME_BY_PICKER: Readonly<Record<string, GroupTheme>> = {
  aapilu: "aapilu",
  civilian: "civilian",
  touchstone: "civilian",
  criseDeLwa: "retainer",
  ducheskiRevenant: "retainer",
  friendlyNeighborhoodSpiders: "werewolf",
  friendlyNeighborhoodSpidersGarou: "werewolf",
  nightwolves: "werewolf",
  wychwoodHecata: "hecata",
  autarkis: "independent",
  princesCourt: "camarilla",
  harpies: "camarilla",
  ironGuard: "camarilla",
  menInBlack: "camarilla",
  petitioners: "camarilla",
  moonClub: "camarilla",
  goodDoctors: "camarilla",
  openSanctum: "camarilla",
  regencyUniversityChantry: "camarilla",
  houseRustovich: "camarilla",
  theLine: "anarch",
  redFlag: "anarch",
  jarvisJacks: "anarch",
  flyCooks: "anarch",
  fiveKeys: "anarch",
  freeChantry: "anarch",
  midnightMass: "anarch",
  beesHive: "anarch",
  redeemers: "anarch",
  colorBlitz: "anarch",
  deepSix: "sabbat",
  scarlettAndTheBoys: "sabbat",
  memoriam: "independent",
  Ungrouped: "independent"
};

export const groupThemeClass = (pickerGroup: string): string =>
  `group-theme-${THEME_BY_PICKER[pickerGroup] ?? "independent"}`;

export const groupThemeRank = (pickerGroup: string): number => {
  const theme = THEME_BY_PICKER[pickerGroup] ?? "independent";
  const index = GROUP_THEMES.indexOf(theme);
  return index < 0 ? GROUP_THEMES.length : index;
};

export const comparePickerGroups = (a: string, b: string, labelFor: (key: string) => string): number => {
  const rank = groupThemeRank(a) - groupThemeRank(b);
  if (rank !== 0) {
    return rank;
  }
  return labelFor(a).localeCompare(labelFor(b));
};
