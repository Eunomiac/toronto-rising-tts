/**
 * Memoriam NPC roster rules shared by the importer's checks, the dashboard API, and the roster tab.
 * Sheet cells stay comma-separated strings in `memoriam-npcs.json`. This module splits them.
 */

export const MEMORIAM_YEARS = ["Modern", "1900s", "1800s", "1700s"] as const;
export type MemoriamYear = (typeof MEMORIAM_YEARS)[number];

/** Year-group titles and ring colours for unique Memoriam NPCs that are not in the open period. */
export const MEMORIAM_YEAR_GROUPS: readonly { readonly year: MemoriamYear; readonly title: string; readonly color: string }[] = [
  { year: "Modern", title: "Memoriam Present", color: "#c4a15a" },
  { year: "1900s", title: "Memoriam 1900s", color: "#b5724a" },
  { year: "1800s", title: "Memoriam 1800s", color: "#4f6f8f" },
  { year: "1700s", title: "Memoriam 1700s", color: "#8a4d5c" }
];

/** Grey used for generic Memoriam groups, matching the roster's unsorted group colour. */
export const MEMORIAM_GENERIC_COLOR = "#7a7a86";

const YEAR_SET = new Set<string>(MEMORIAM_YEARS);
const GENERIC_SUFFIX_RE = /_\d{2}$/;

export const memoriamStem = (key: string): string => key.replace(GENERIC_SUFFIX_RE, "");

/**
 * Comma-separated cell. Empty cells become an empty list. A blank piece (`Toronto,,Western`) is an error
 * so a stray comma is not silently dropped.
 */
export const splitMemoriamList = (raw: string, label: string): string[] | string => {
  if (raw.trim() === "") {
    return [];
  }
  const pieces = raw.split(",");
  if (pieces.some((piece) => piece.trim() === "")) {
    return `${label} has an empty entry. Separate values with commas.`;
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of pieces) {
    const value = piece.trim();
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
};

export const parseMemoriamYears = (raw: string): MemoriamYear[] | string => {
  const parts = splitMemoriamList(raw, "Year");
  if (typeof parts === "string") {
    return parts;
  }
  if (parts.length < 1) {
    return "Year needs at least one of Modern, 1900s, 1800s, or 1700s.";
  }
  for (const part of parts) {
    if (!YEAR_SET.has(part)) {
      return `Year "${part}" must be Modern, 1900s, 1800s, or 1700s.`;
    }
  }
  return parts as MemoriamYear[];
};

export const parseMemoriamLocations = (raw: string): string[] | string => splitMemoriamList(raw, "Location");

export const memoriamGenericLabel = (label: string, years: readonly MemoriamYear[], remaining: boolean): string => {
  if (!remaining) {
    return label;
  }
  const prefix = MEMORIAM_YEARS.filter((year) => year !== "Modern" && years.includes(year));
  return prefix.length === 0 ? label : `${prefix.join(", ")} ${label}`;
};

export type MemoriamSheetNpc = {
  readonly key: string;
  readonly label: string;
  readonly filename: string;
  readonly location: string;
  readonly year: string;
  readonly variantOfUnique: string;
  readonly isGeneric: boolean;
  readonly catalog: boolean;
  readonly tags: string;
  readonly periods: readonly string[];
};

/** What the roster and the token window read: values from the spreadsheet export. */
export type MemoriamNpcView = {
  readonly key: string;
  readonly label: string;
  readonly filename: string;
  readonly tags: string;
  readonly isGeneric: boolean;
  readonly catalog: boolean;
  readonly variantOfUnique: string;
  readonly locations: readonly string[];
  readonly years: readonly MemoriamYear[];
  readonly periods: readonly string[];
};

const sheetMemoriamLists = (npc: Pick<MemoriamSheetNpc, "key" | "location" | "year" | "periods">): {
  readonly locations: readonly string[];
  readonly years: readonly MemoriamYear[];
  readonly periods: readonly string[];
} => {
  const locations = parseMemoriamLocations(npc.location);
  const years = parseMemoriamYears(npc.year);
  if (typeof locations === "string" || typeof years === "string") {
    throw new Error(`Memoriam NPC "${npc.key}" has a bad location or year: ${typeof locations === "string" ? locations : years}`);
  }
  return { locations, years, periods: npc.periods };
};

export const toMemoriamNpcView = (npc: MemoriamSheetNpc): MemoriamNpcView => ({
  key: npc.key,
  label: npc.label,
  filename: npc.filename,
  tags: npc.tags,
  isGeneric: npc.isGeneric,
  catalog: npc.catalog,
  variantOfUnique: npc.variantOfUnique,
  ...sheetMemoriamLists(npc)
});

export type MemoriamMember = { readonly characterKey: string; readonly name: string };

export type MemoriamGroup = {
  readonly key: string;
  readonly label: string;
  readonly color: string;
  readonly generic: boolean;
  readonly members: readonly MemoriamMember[];
};

export type MemoriamRosterLayout = {
  readonly surfacedUniques: readonly MemoriamMember[];
  readonly surfacedGenerics: readonly MemoriamGroup[];
  readonly remainingUniques: readonly MemoriamGroup[];
  readonly remainingGenerics: readonly MemoriamGroup[];
  readonly locations: readonly string[];
};

const byName = (left: MemoriamMember, right: MemoriamMember): number =>
  left.name.localeCompare(right.name) || left.characterKey.localeCompare(right.characterKey);

/** Keep an eligible variant beside its eligible parent while retaining alphabetical groups. */
export const sortNamedVariants = <T extends MemoriamMember>(members: readonly T[], parentOf: (key: string) => string | undefined): T[] => {
  const byKey = new Map(members.map(member => [member.characterKey, member]));
  const parent = (member: T): T => byKey.get(parentOf(member.characterKey) ?? "") ?? member;
  return [...members].sort((left, right) => {
    const a = parent(left), b = parent(right);
    return byName(a, b) || Number(a !== left) - Number(b !== right) || byName(left, right);
  });
};

const tokenName = (npc: MemoriamNpcView, names: Readonly<Record<string, string | undefined>>, remainingGeneric: boolean): string =>
  names[npc.key] ?? (npc.isGeneric ? memoriamGenericLabel(npc.label, npc.years, remainingGeneric) : npc.label);

/**
 * Surfaced NPCs are the open period. Remaining NPCs are everyone else, filtered by any selected year and any
 * selected location. When both dimensions have selections, an NPC must match at least one from each.
 * Spawned generic keys drop out, the same way the Generic tab hides figurines already in the scene.
 */
export const layoutMemoriamRoster = (
  npcs: readonly MemoriamNpcView[],
  options: {
    readonly periodKey?: string | undefined;
    readonly years: ReadonlySet<MemoriamYear>;
    readonly locations: ReadonlySet<string>;
    readonly spawnedGenerics: ReadonlySet<string>;
    readonly names: Readonly<Record<string, string | undefined>>;
  }
): MemoriamRosterLayout => {
  const locations = new Set<string>();
  const byKey = new Map(npcs.map(npc => [npc.key, npc]));
  const parentOf = (key: string) => byKey.get(key)?.variantOfUnique;
  for (const npc of npcs) {
    for (const location of npc.locations) {
      locations.add(location);
    }
  }
  const surfacedKeys = new Set<string>();
  const surfacedUniques: MemoriamMember[] = [];
  const surfacedGenericBuckets = new Map<string, MemoriamNpcView[]>();
  if (options.periodKey) {
    for (const npc of npcs) {
      if (!npc.periods.includes(options.periodKey)) {
        continue;
      }
      surfacedKeys.add(npc.key);
      if (npc.isGeneric) {
        if (options.spawnedGenerics.has(npc.key)) {
          continue;
        }
        const stem = memoriamStem(npc.key);
        surfacedGenericBuckets.set(stem, [...(surfacedGenericBuckets.get(stem) ?? []), npc]);
      } else {
        surfacedUniques.push({ characterKey: npc.key, name: tokenName(npc, options.names, false) });
      }
    }
  }
  const matches = (npc: MemoriamNpcView): boolean =>
    (options.years.size === 0 || npc.years.some((year) => options.years.has(year)))
    && (options.locations.size === 0 || npc.locations.some((location) => options.locations.has(location)));
  const remainingGenericBuckets = new Map<string, MemoriamNpcView[]>();
  const remainingUniqueByYear = new Map<MemoriamYear, MemoriamMember[]>(MEMORIAM_YEAR_GROUPS.map((group) => [group.year, []]));
  for (const npc of npcs) {
    if (surfacedKeys.has(npc.key) || npc.catalog === true || !matches(npc)) {
      continue;
    }
    if (npc.isGeneric) {
      if (options.spawnedGenerics.has(npc.key)) {
        continue;
      }
      const stem = memoriamStem(npc.key);
      remainingGenericBuckets.set(stem, [...(remainingGenericBuckets.get(stem) ?? []), npc]);
    } else {
      for (const year of npc.years) {
        if (options.years.size > 0 && !options.years.has(year)) {
          continue;
        }
        remainingUniqueByYear.get(year)?.push({ characterKey: npc.key, name: tokenName(npc, options.names, false) });
      }
    }
  }
  const genericGroup = (stem: string, bucket: readonly MemoriamNpcView[], remaining: boolean): MemoriamGroup => {
    const label = bucket[0]?.label ?? stem;
    const years = MEMORIAM_YEARS.filter((year) => bucket.some((npc) => npc.years.includes(year)));
    return {
      key: `memoriam:${stem}`,
      label: memoriamGenericLabel(label, years, remaining),
      color: MEMORIAM_GENERIC_COLOR,
      generic: true,
      members: bucket
        .map((npc) => ({ characterKey: npc.key, name: tokenName(npc, options.names, remaining) }))
        .sort(byName)
    };
  };
  const sortGroups = (groups: MemoriamGroup[]): MemoriamGroup[] =>
    groups.sort((left, right) => left.label.localeCompare(right.label) || left.key.localeCompare(right.key));
  return {
    surfacedUniques: sortNamedVariants(surfacedUniques, parentOf),
    surfacedGenerics: sortGroups([...surfacedGenericBuckets].map(([stem, bucket]) => genericGroup(stem, bucket, false))),
    remainingUniques: MEMORIAM_YEAR_GROUPS.flatMap((group) => {
      const members = sortNamedVariants(remainingUniqueByYear.get(group.year) ?? [], parentOf);
      return members.length === 0 ? [] : [{
        key: `memoriam-year:${group.year}`,
        label: group.title,
        color: group.color,
        generic: false,
        members
      }];
    }),
    remainingGenerics: sortGroups([...remainingGenericBuckets].map(([stem, bucket]) => genericGroup(stem, bucket, true))),
    locations: [...locations].sort((left, right) => left.localeCompare(right))
  };
};
