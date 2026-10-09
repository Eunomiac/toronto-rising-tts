/**
 * The dashboard's scene library, kept by the server in `data/scene-library.json` (git-ignored: chronicle content,
 * and the repo is public). It is the master copy; TTS's `gameState.sceneLibrary` holds the rows it has been sent
 * to play. Rows keep TTS's own shape so they travel both ways unchanged.
 */

export type PlacementMode = "standard" | "scatter";

export type LibraryScene = {
  readonly key: string;
  readonly title: string;
  readonly placementMode: PlacementMode;
  /** TTS's `receivesLiveWrites`: while this scene is on the table, TTS writes the live scene into the row. */
  readonly linked: boolean;
  /** TTS's `sessionScene`; the dashboard edits only the fields it knows and passes the rest through. */
  readonly sessionScene: Readonly<Record<string, unknown>>;
};

export type SceneLibrary = {
  /** In the Storyteller's order. */
  readonly scenes: readonly LibraryScene[];
  /** Set once the library has been copied in from TTS. */
  readonly seeded: boolean;
};

export type SceneLibraryPatch = Partial<SceneLibrary>;

export const EMPTY_SCENE_LIBRARY: SceneLibrary = { scenes: [], seeded: false };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const SCENE_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export const parseLibraryScene = (value: unknown): LibraryScene | null => {
  if (!isRecord(value) || typeof value.key !== "string" || !SCENE_KEY_PATTERN.test(value.key) || typeof value.title !== "string") {
    return null;
  }
  return {
    key: value.key,
    title: value.title,
    placementMode: value.placementMode === "scatter" ? "scatter" : "standard",
    linked: value.linked === true,
    sessionScene: isRecord(value.sessionScene) ? value.sessionScene : {}
  };
};

const parseScenes = (value: unknown): readonly LibraryScene[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  return value.flatMap((row) => {
    const scene = parseLibraryScene(row);
    if (!scene || seen.has(scene.key)) {
      return [];
    }
    seen.add(scene.key);
    return [scene];
  });
};

/** Reads whatever is on disk, dropping malformed rows rather than failing the whole tab. */
export const normalizeSceneLibrary = (value: unknown): SceneLibrary =>
  isRecord(value) ? { scenes: parseScenes(value.scenes), seeded: value.seeded === true } : EMPTY_SCENE_LIBRARY;

/** A PUT body replaces whole sections; unknown keys or wrong types are refused. */
export const parseSceneLibraryPatch = (value: unknown): SceneLibraryPatch => {
  if (!isRecord(value)) {
    throw new Error("Expected a JSON object.");
  }
  const unknown = Object.keys(value).filter((key) => key !== "scenes" && key !== "seeded");
  if (unknown.length > 0) {
    throw new Error(`Unknown scene library section: ${unknown.join(", ")}.`);
  }
  if (value.scenes !== undefined && !Array.isArray(value.scenes)) {
    throw new Error("scenes must be an array.");
  }
  if (value.seeded !== undefined && typeof value.seeded !== "boolean") {
    throw new Error("seeded must be true or false.");
  }
  return {
    ...(value.scenes !== undefined ? { scenes: parseScenes(value.scenes) } : {}),
    ...(value.seeded !== undefined ? { seeded: value.seeded } : {})
  };
};
