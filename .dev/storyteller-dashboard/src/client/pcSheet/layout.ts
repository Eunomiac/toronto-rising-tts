export const ATTRIBUTE_COLUMNS = [
  ["strength", "dexterity", "stamina"],
  ["charisma", "manipulation", "composure"],
  ["intelligence", "wits", "resolve"]
] as const;

export const SKILL_COLUMNS = [
  ["athletics", "brawl", "craft", "drive", "firearms", "larceny", "melee", "stealth", "survival"],
  ["animalKen", "etiquette", "insight", "intimidation", "leadership", "performance", "persuasion", "streetwise", "subterfuge"],
  ["academics", "awareness", "finance", "investigation", "medicine", "occult", "politics", "science", "technology"]
] as const;

export const ATTRIBUTE_LABELS: Record<string, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  stamina: "Stamina",
  charisma: "Charisma",
  manipulation: "Manipulation",
  composure: "Composure",
  intelligence: "Intelligence",
  wits: "Wits",
  resolve: "Resolve"
};

export const SKILL_LABELS: Record<string, string> = {
  athletics: "Athletics",
  brawl: "Brawl",
  craft: "Craft",
  drive: "Drive",
  firearms: "Firearms",
  larceny: "Larceny",
  melee: "Melee",
  stealth: "Stealth",
  survival: "Survival",
  animalKen: "Animal Ken",
  etiquette: "Etiquette",
  insight: "Insight",
  intimidation: "Intimidation",
  leadership: "Leadership",
  performance: "Performance",
  persuasion: "Persuasion",
  streetwise: "Streetwise",
  subterfuge: "Subterfuge",
  academics: "Academics",
  awareness: "Awareness",
  finance: "Finance",
  investigation: "Investigation",
  medicine: "Medicine",
  occult: "Occult",
  politics: "Politics",
  science: "Science",
  technology: "Technology"
};

export const ROLL_TYPES = [
  { id: "standard", label: "Std" },
  { id: "simplecheck", label: "Simple" },
  { id: "rouse", label: "Rouse" },
  { id: "willpowerroll", label: "WP" },
  { id: "discipline", label: "Disc" },
  { id: "humanityroll", label: "Hum" },
  { id: "frenzy", label: "Frenzy" },
  { id: "remorse", label: "Rem" },
  { id: "launch", label: "Launch" },
  { id: "goal", label: "Goal" }
] as const;

export const SEAT_ACCENT: Record<string, string> = {
  Brown: "#713b17",
  Orange: "#f4641d",
  Red: "#da1a18",
  Pink: "#f500ad",
  Purple: "#a020f0"
};

export const assetUrl = (relative: string): string =>
  `/pc-sheet-assets/${relative.split("/").map(encodeURIComponent).join("/")}`;
