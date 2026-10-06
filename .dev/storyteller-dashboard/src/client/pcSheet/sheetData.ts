/**
 * Typed views over the raw `playerData` dump carried by each seat snapshot
 * (Pages 2, 3 and 6 read these; the host stays the source of truth).
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

/** Lua JSON may encode a 1-based array as an object with "1","2" keys. */
const asList = (value: unknown): readonly unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (isRecord(value)) {
    return Object.keys(value)
      .filter((key) => /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => value[key]);
  }
  return [];
};

export const asLines = (value: unknown): readonly string[] => {
  if (typeof value === "string") {
    return value.trim() === "" ? [] : [value];
  }
  return asList(value).filter((line): line is string => typeof line === "string");
};

const statsOf = (playerData: Record<string, unknown>): Record<string, unknown> =>
  isRecord(playerData.stats) ? playerData.stats : {};

// ---------------------------------------------------------------- Disciplines

export const DISC_ORDER = [
  "animalism",
  "auspex",
  "bloodSorcery",
  "celerity",
  "dominate",
  "fortitude",
  "obfuscate",
  "oblivion",
  "potence",
  "presence",
  "protean"
] as const;

export type DisciplineKey = (typeof DISC_ORDER)[number];

export const DISCIPLINE_LABELS: Record<DisciplineKey, string> = {
  animalism: "Animalism",
  auspex: "Auspex",
  bloodSorcery: "Blood Sorcery",
  celerity: "Celerity",
  dominate: "Dominate",
  fortitude: "Fortitude",
  obfuscate: "Obfuscate",
  oblivion: "Oblivion",
  potence: "Potence",
  presence: "Presence",
  protean: "Protean"
};

export const MAX_DISCIPLINES = 6;

export type RitualKind = "rituals" | "ceremonies";

/** Rituals live under Blood Sorcery, Ceremonies under Oblivion. */
export const RITUAL_HOST: Record<RitualKind, DisciplineKey> = {
  rituals: "bloodSorcery",
  ceremonies: "oblivion"
};

export type PowerEntry = {
  /** 1-based position in the stored array (apply ops address rows by this). */
  readonly index: number;
  readonly name: string;
  readonly level: number;
  readonly notes: string;
};

export type DisciplineRow = {
  readonly key: DisciplineKey;
  readonly base: number;
  readonly temp: number;
  readonly powers: readonly PowerEntry[];
  readonly rituals: readonly PowerEntry[];
  readonly ceremonies: readonly PowerEntry[];
};

const parsePowers = (value: unknown): readonly PowerEntry[] =>
  asList(value).flatMap((row, offset) => {
    if (!isRecord(row)) {
      return [];
    }
    return [{
      index: offset + 1,
      name: asString(row.name),
      level: Math.floor(asNumber(row.level)),
      notes: asString(row.notes)
    }];
  });

export const isDisciplineKey = (key: string): key is DisciplineKey =>
  (DISC_ORDER as readonly string[]).includes(key);

/** Owned disciplines in chronicle order (same order as the TTS page 2 grid). */
export const parseDisciplines = (playerData: Record<string, unknown>): readonly DisciplineRow[] => {
  const discs = statsOf(playerData).disciplines;
  if (!isRecord(discs)) {
    return [];
  }
  return DISC_ORDER.flatMap((key) => {
    const row = discs[key];
    if (!isRecord(row)) {
      return [];
    }
    return [{
      key,
      base: Math.floor(asNumber(row.base)),
      temp: Math.floor(asNumber(row.temp)),
      powers: parsePowers(row.powers),
      rituals: parsePowers(row.rituals),
      ceremonies: parsePowers(row.ceremonies)
    }];
  });
};

export const unownedDisciplines = (rows: readonly DisciplineRow[]): readonly DisciplineKey[] =>
  DISC_ORDER.filter((key) => !rows.some((row) => row.key === key));

export type PowerLevelGroup = {
  readonly level: number;
  readonly powers: readonly PowerEntry[];
};

/** One group per level, ascending; names sorted within a level (TTS `powersText`). */
export const powersByLevel = (powers: readonly PowerEntry[]): readonly PowerLevelGroup[] => {
  const byLevel = new Map<number, PowerEntry[]>();
  for (const power of powers) {
    if (power.name === "") {
      continue;
    }
    const bucket = byLevel.get(power.level) ?? [];
    bucket.push(power);
    byLevel.set(power.level, bucket);
  }
  return [...byLevel.keys()]
    .sort((a, b) => a - b)
    .map((level) => ({
      level,
      powers: [...(byLevel.get(level) ?? [])].sort((a, b) => a.name.localeCompare(b.name))
    }));
};

export const ritualsOf = (rows: readonly DisciplineRow[], kind: RitualKind): readonly PowerEntry[] =>
  rows.find((row) => row.key === RITUAL_HOST[kind])?.[kind] ?? [];

/** Page 2 capacity: 5 + 5 when both kinds exist, otherwise up to 10 of one kind. */
export const validRitualCounts = (rituals: number, ceremonies: number): boolean =>
  rituals > 0 && ceremonies > 0 ? rituals <= 5 && ceremonies <= 5 : rituals <= 10 && ceremonies <= 10;

export const canAddRitual = (kind: RitualKind, rituals: number, ceremonies: number): boolean =>
  kind === "rituals" ? validRitualCounts(rituals + 1, ceremonies) : validRitualCounts(rituals, ceremonies + 1);

export type RitualSlot = { readonly kind: RitualKind; readonly entry: PowerEntry } | null;

export type RitualLayout = {
  readonly divider: "divider_ritualsAndCeremonies" | "divider_rituals" | "divider_ceremonies";
  readonly left: readonly RitualSlot[];
  readonly right: readonly RitualSlot[];
} | null;

const padFive = (slots: RitualSlot[]): readonly RitualSlot[] => {
  const out = slots.slice(0, 5);
  while (out.length < 5) {
    out.push(null);
  }
  return out;
};

/** Same column split as `lib/csheet_page2_xml.ttslua`. */
export const ritualLayout = (rituals: readonly PowerEntry[], ceremonies: readonly PowerEntry[]): RitualLayout => {
  const r: RitualSlot[] = rituals.map((entry) => ({ kind: "rituals", entry }));
  const c: RitualSlot[] = ceremonies.map((entry) => ({ kind: "ceremonies", entry }));
  if (r.length === 0 && c.length === 0) {
    return null;
  }
  if (r.length > 0 && c.length > 0) {
    return { divider: "divider_ritualsAndCeremonies", left: padFive(r), right: padFive(c) };
  }
  const only = r.length > 0 ? r : c;
  return {
    divider: r.length > 0 ? "divider_rituals" : "divider_ceremonies",
    left: padFive(only.slice(0, 5)),
    right: padFive(only.slice(5, 10))
  };
};

// ---------------------------------------------------------------- Advantages

export const ADVANTAGE_CATEGORIES = ["backgrounds", "merits", "flaws"] as const;

export type AdvantageCategory = (typeof ADVANTAGE_CATEGORIES)[number];

export const ADVANTAGE_LABELS: Record<AdvantageCategory, string> = {
  backgrounds: "Background",
  merits: "Merit",
  flaws: "Flaw"
};

export type AdvantageSource = { readonly book: string; readonly page: number };

export type AdvantageEntry = {
  readonly category: AdvantageCategory;
  /** 1-based position in `stats.<category>`. */
  readonly index: number;
  readonly name: string;
  readonly focus: string;
  readonly base: number;
  readonly temp: number;
  readonly max?: number;
  readonly disabled: number;
  readonly description: readonly string[];
  readonly rules: readonly string[];
  readonly source?: AdvantageSource;
  readonly sheetDisplay: boolean;
};

export const parseAdvantages = (playerData: Record<string, unknown>, category: AdvantageCategory): readonly AdvantageEntry[] =>
  asList(statsOf(playerData)[category]).flatMap((row, offset) => {
    if (!isRecord(row) || row.blank === true) {
      return [];
    }
    const source = isRecord(row.source)
      ? { book: asString(row.source.book), page: Math.floor(asNumber(row.source.page)) }
      : undefined;
    const entry: AdvantageEntry = {
      category,
      index: offset + 1,
      name: asString(row.name),
      focus: asString(row.focus),
      base: Math.floor(asNumber(row.base)),
      temp: Math.floor(asNumber(row.temp)),
      ...(typeof row.max === "number" ? { max: Math.floor(row.max) } : {}),
      disabled: Math.floor(asNumber(row.disabled)),
      description: asLines(row.description),
      rules: asLines(row.rules),
      ...(source ? { source } : {}),
      sheetDisplay: row.sheetDisplay !== false
    };
    return [entry];
  });

export const advantageTitle = (entry: Pick<AdvantageEntry, "name" | "focus">): string => {
  const focus = entry.focus.trim();
  return (focus !== "" ? `${entry.name}: ${focus}` : entry.name).toUpperCase();
};

export const formatSourceLine = (source?: AdvantageSource): string | null => {
  if (!source) {
    return null;
  }
  if (source.book === "" && source.page === 0) {
    return null;
  }
  if (source.book === "") {
    return `p.${source.page}`;
  }
  return source.page ? `${source.book}, p.${source.page}` : source.book;
};

/** Stake key shared with the Lua snapshot (`projectStakes`). */
export const advantageStakeKey = (name: string, focus: string): string => `${name}|${focus.trim()}`;

// ---------------------------------------------------------------- Experience Log

export type XpEntry = { readonly amount: number; readonly description: string };

export type XpSession = {
  readonly key: string;
  readonly num: number;
  readonly sessionDisplay: string;
  readonly date?: number;
  readonly prevTotal: number;
  readonly gainTotal: number;
  readonly spendTotal: number;
  readonly newTotal: number;
  readonly gains: readonly XpEntry[];
  readonly spends: readonly XpEntry[];
};

const parseXpEntries = (value: unknown): readonly XpEntry[] =>
  asList(value).flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }
    return [{ amount: Math.abs(Math.floor(asNumber(row.amount))), description: asString(row.description) }];
  });

/** Sessions newest first. Session keys are strings and may be negative. */
export const parseXpLog = (playerData: Record<string, unknown>): readonly XpSession[] => {
  const log = playerData.xp;
  if (!isRecord(log)) {
    return [];
  }
  return Object.entries(log)
    .flatMap(([key, block]) => {
      const num = Number(key);
      if (!Number.isInteger(num) || !isRecord(block)) {
        return [];
      }
      const session: XpSession = {
        key,
        num,
        sessionDisplay: asString(block.sessionDisplay),
        ...(typeof block.date === "number" ? { date: block.date } : {}),
        prevTotal: Math.floor(asNumber(block.prevTotal)),
        gainTotal: Math.floor(asNumber(block.gainTotal)),
        spendTotal: Math.floor(asNumber(block.spendTotal)),
        newTotal: Math.floor(asNumber(block.newTotal)),
        gains: parseXpEntries(block.gains),
        spends: parseXpEntries(block.spends)
      };
      return [session];
    })
    .sort((a, b) => b.num - a.num);
};
