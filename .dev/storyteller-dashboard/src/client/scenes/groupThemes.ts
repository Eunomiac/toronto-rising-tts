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
  petitioners: "independent",
  memoriam: "independent",
  Ungrouped: "independent",
  princesCourt: "camarilla",
  harpies: "camarilla",
  ironGuard: "camarilla",
  menInBlack: "camarilla",
  moonClub: "camarilla",
  goodDoctors: "camarilla",
  openSanctum: "camarilla",
  regencyUniversityChantry: "camarilla",
  houseRustovich: "camarilla",
  beesHive: "camarilla",
  fiveKeys: "camarilla",
  freeChantry: "camarilla",
  midnightMass: "camarilla",
  scarlettAndTheBoys: "camarilla",
  theLine: "anarch",
  redFlag: "anarch",
  jarvisJacks: "anarch",
  flyCooks: "anarch",
  redeemers: "anarch",
  colorBlitz: "anarch",
  deepSix: "sabbat"
};

const IMPORTANT_GROUPS = new Set([
  "fiveKeys",
  "regencyUniversityChantry",
  "moonClub",
  "redFlag",
  "redeemers",
  "theLine"
]);

export const groupThemeClass = (pickerGroup: string): string =>
  `group-theme-${THEME_BY_PICKER[pickerGroup] ?? "independent"}`;

export const groupThemeRank = (pickerGroup: string): number => {
  const theme = THEME_BY_PICKER[pickerGroup] ?? "independent";
  const index = GROUP_THEMES.indexOf(theme);
  return index < 0 ? GROUP_THEMES.length : index;
};

export const isImportantGroup = (pickerGroup: string): boolean => IMPORTANT_GROUPS.has(pickerGroup);

export const trayMergeLabel = (label: string): string => label.replace(/\s*\([^)]*\)\s*$/u, "").trim();

export const comparePickerGroups = (a: string, b: string, labelFor: (key: string) => string): number => {
  const rank = groupThemeRank(a) - groupThemeRank(b);
  if (rank !== 0) {
    return rank;
  }
  const important = Number(isImportantGroup(b)) - Number(isImportantGroup(a));
  if (important !== 0) {
    return important;
  }
  return trayMergeLabel(labelFor(a)).localeCompare(trayMergeLabel(labelFor(b)));
};
