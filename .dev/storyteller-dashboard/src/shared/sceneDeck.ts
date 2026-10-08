/**
 * Dashboard-owned Scenes tab data, kept by the server in `data/scene-deck.json` (git-ignored: chronicle content,
 * and the repo is public). TTS never sees it, so it survives every TTS reload.
 */

export type SceneDoc = { readonly id: string; readonly title: string; readonly html: string };
export type SceneDocs = { readonly docs: readonly SceneDoc[]; readonly activeId: string };

/** A live scene on deck: TTS library key (to play it) and the title shown. */
export type DeckScene = { readonly key: string; readonly title: string };

export type RosterCategory = { readonly id: string; readonly name: string; readonly color: string; readonly open: boolean };

/**
 * Roster categories, which category each group is filed in, colours picked for individual groups, and leaders
 * picked for individual groups ("" means the group has no leader).
 */
export type RosterLayout = {
  readonly categories: readonly RosterCategory[];
  readonly assigned: Readonly<Record<string, string>>;
  readonly groupColors: Readonly<Record<string, string>>;
  readonly leaders: Readonly<Record<string, string>>;
};

export type SceneDeck = {
  /** Live scenes on deck, in the order they were added. TTS still decides which one is on the table. */
  readonly deck: readonly DeckScene[];
  /** Scene notes keyed by scene title. */
  readonly notes: Readonly<Record<string, SceneDocs>>;
  readonly roster: RosterLayout;
  /** Set once this browser's old Lab copies (local storage) have been copied in. */
  readonly seeded: boolean;
};

export type SceneDeckPatch = Partial<SceneDeck>;

export const EMPTY_ROSTER: RosterLayout = { categories: [], assigned: {}, groupColors: {}, leaders: {} };
export const EMPTY_SCENE_DECK: SceneDeck = { deck: [], notes: {}, roster: EMPTY_ROSTER, seeded: false };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringRecord = (value: unknown): Record<string, string> =>
  isRecord(value) ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};

const parseDoc = (value: unknown): SceneDoc | null =>
  isRecord(value) && typeof value.id === "string" && typeof value.title === "string" && typeof value.html === "string"
    ? { id: value.id, title: value.title, html: value.html }
    : null;

const parseDocs = (value: unknown): SceneDocs | null => {
  if (!isRecord(value) || !Array.isArray(value.docs)) {
    return null;
  }
  const docs = value.docs.map(parseDoc).filter((doc): doc is SceneDoc => doc !== null);
  return docs.length > 0 ? { docs, activeId: typeof value.activeId === "string" ? value.activeId : docs[0]!.id } : null;
};

const parseDeck = (value: unknown): readonly DeckScene[] =>
  Array.isArray(value)
    ? value.flatMap((row) => (isRecord(row) && typeof row.key === "string" && typeof row.title === "string" ? [{ key: row.key, title: row.title }] : []))
    : [];

const parseNotes = (value: unknown): Record<string, SceneDocs> => {
  if (!isRecord(value)) {
    return {};
  }
  const notes: Record<string, SceneDocs> = {};
  for (const [scene, docs] of Object.entries(value)) {
    const parsed = parseDocs(docs);
    if (parsed) {
      notes[scene] = parsed;
    }
  }
  return notes;
};

export const parseRosterLayout = (value: unknown): RosterLayout => {
  if (!isRecord(value)) {
    return EMPTY_ROSTER;
  }
  const categories = Array.isArray(value.categories)
    ? value.categories.flatMap((row): RosterCategory[] =>
      isRecord(row) && typeof row.id === "string" && typeof row.name === "string" && typeof row.color === "string"
        ? [{ id: row.id, name: row.name, color: row.color, open: row.open === true }]
        : [])
    : [];
  return { categories, assigned: stringRecord(value.assigned), groupColors: stringRecord(value.groupColors), leaders: stringRecord(value.leaders) };
};

/** Reads whatever is on disk, dropping malformed parts rather than failing the whole tab. */
export const normalizeSceneDeck = (value: unknown): SceneDeck => {
  if (!isRecord(value)) {
    return EMPTY_SCENE_DECK;
  }
  return {
    deck: parseDeck(value.deck),
    notes: parseNotes(value.notes),
    roster: parseRosterLayout(value.roster),
    seeded: value.seeded === true
  };
};

/** A PUT body replaces whole sections; unknown keys or wrong types are refused. */
export const parseSceneDeckPatch = (value: unknown): SceneDeckPatch => {
  if (!isRecord(value)) {
    throw new Error("Expected a JSON object.");
  }
  const allowed = new Set(["deck", "notes", "roster", "seeded"]);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new Error(`Unknown scene deck section: ${unknown.join(", ")}.`);
  }
  if (value.deck !== undefined && !Array.isArray(value.deck)) {
    throw new Error("deck must be an array.");
  }
  for (const key of ["notes", "roster"] as const) {
    if (value[key] !== undefined && !isRecord(value[key])) {
      throw new Error(`${key} must be an object.`);
    }
  }
  if (value.seeded !== undefined && typeof value.seeded !== "boolean") {
    throw new Error("seeded must be true or false.");
  }
  return {
    ...(value.deck !== undefined ? { deck: parseDeck(value.deck) } : {}),
    ...(value.notes !== undefined ? { notes: parseNotes(value.notes) } : {}),
    ...(value.roster !== undefined ? { roster: parseRosterLayout(value.roster) } : {}),
    ...(value.seeded !== undefined ? { seeded: value.seeded } : {})
  };
};
