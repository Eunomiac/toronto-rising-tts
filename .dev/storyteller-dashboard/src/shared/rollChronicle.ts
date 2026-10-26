/**
 * Chronicle copy of finished rolls, and the automation flags the dashboard edits.
 * TTS keeps a live copy of the flags for player Confirm, and only the roll just finished.
 */

export const PERMANENT_KEYS = ["autoApplyRouseOutcomes", "autoWp", "autoRemorse", "autoHunger"] as const;

export type SavedRoll = {
  readonly rollId: string;
  readonly color: string;
  readonly label: string;
  readonly rollType: string;
  readonly text: string;
  readonly at: string;
  /** History row TTS can show again (`showLoggedRoll`). */
  readonly entry: Readonly<Record<string, unknown>>;
};

export type RollChronicle = {
  readonly permanent: Readonly<Record<string, boolean>>;
  readonly entries: readonly SavedRoll[];
};

const CAP = 200;

export const EMPTY_ROLL_CHRONICLE: RollChronicle = {
  permanent: {
    autoApplyRouseOutcomes: true,
    autoWp: true,
    autoRemorse: true,
    autoHunger: true
  },
  entries: []
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const permanentOf = (value: unknown): Record<string, boolean> => {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(PERMANENT_KEYS.map((key) => [key, source[key] !== false]));
};

const entryOf = (value: unknown): SavedRoll | null => {
  if (!isRecord(value) || typeof value.rollId !== "string" || value.rollId === "" || typeof value.color !== "string") {
    return null;
  }
  return {
    rollId: value.rollId,
    color: value.color,
    label: typeof value.label === "string" ? value.label : value.rollId,
    rollType: typeof value.rollType === "string" ? value.rollType : "",
    text: typeof value.text === "string" ? value.text : "",
    at: typeof value.at === "string" ? value.at : "",
    entry: isRecord(value.entry) ? value.entry : {}
  };
};

export const normalizeRollChronicle = (value: unknown): RollChronicle => {
  const source = isRecord(value) ? value : {};
  const entries = Array.isArray(source.entries) ? source.entries.flatMap((row) => {
    const entry = entryOf(row);
    return entry ? [entry] : [];
  }) : [];
  return { permanent: permanentOf(source.permanent), entries: entries.slice(-CAP) };
};

/** Adds finished rolls and updates corrected results without moving their original timestamp/order. */
export const appendRolls = (chronicle: RollChronicle, incoming: readonly SavedRoll[]): RollChronicle => {
  const entries = [...chronicle.entries];
  let changed = false;
  for (const row of incoming) {
    if (!row.rollId) continue;
    const index = entries.findIndex((entry) => entry.rollId === row.rollId && entry.color === row.color);
    if (index < 0) {
      entries.push(row);
      changed = true;
    } else {
      const prior = entries[index]!;
      if (prior.text !== row.text || JSON.stringify(prior.entry) !== JSON.stringify(row.entry)) {
        entries[index] = { ...row, at: prior.at };
        changed = true;
      }
    }
  }
  return changed ? { ...chronicle, entries: entries.slice(-CAP) } : chronicle;
};

export const parseRollChroniclePatch = (value: unknown): Partial<RollChronicle> => {
  if (!isRecord(value)) {
    throw new Error("Expected a roll chronicle.");
  }
  const patch: { permanent?: RollChronicle["permanent"]; entries?: RollChronicle["entries"] } = {};
  if ("permanent" in value) {
    patch.permanent = permanentOf(value.permanent);
  }
  if ("entries" in value) {
    patch.entries = normalizeRollChronicle({ entries: value.entries }).entries;
  }
  return patch;
};
