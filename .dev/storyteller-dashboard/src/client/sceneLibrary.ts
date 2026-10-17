import { useSyncExternalStore } from "react";
import { EMPTY_SCENE_LIBRARY, normalizeSceneLibrary, type LibraryScene, type SceneLibrary, type SceneLibraryPatch } from "../shared/sceneLibrary";
import { addMissingFromTts, mergeFromTts, parseTtsLibrarySnapshot, scenesFromTts } from "./scenesPanel/library";
import { executeLua, luaJsonArg } from "./ttsBridge";

/**
 * The server's scene library file (`/api/scene-library`), the dashboard's master copy of every scene. Copied in
 * from TTS once (`seeded`); afterwards `pullScenesFromTts` refreshes rows TTS writes from the live table. Edits show
 * at once and save after `SAVE_DELAY_MS` of quiet.
 */

export type SceneLibraryStatus = { readonly loaded: boolean; readonly error: string | null };

const SAVE_DELAY_MS = 600;

let library: SceneLibrary = EMPTY_SCENE_LIBRARY;
let status: SceneLibraryStatus = { loaded: false, error: null };
let requested = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let seeding: Promise<void> | null = null;
const listeners = new Set<() => void>();

const notify = (): void => listeners.forEach((listener) => listener());

const setStatus = (next: SceneLibraryStatus): void => {
  status = next;
  notify();
};

const message = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason));

const request = async (method: "GET" | "PUT", body?: SceneLibraryPatch): Promise<SceneLibrary> => {
  const response = await fetch("/api/scene-library", {
    method,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {})
  });
  if (response.status === 404) {
    throw new Error("Restart the dashboard server to load the scene library.");
  }
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = typeof payload === "object" && payload !== null ? (payload as { error?: unknown }).error : undefined;
    throw new Error(typeof error === "string" ? error : `Scene library request failed (${response.status}).`);
  }
  return normalizeSceneLibrary(payload);
};

/** TTS's rows (all, or only `keys`) via `GlobalDashboardSceneLibrarySnapshot`. */
const readTtsScenes = async (keys?: readonly string[]): Promise<readonly LibraryScene[]> => {
  const argument = keys ? luaJsonArg(keys) : "";
  const result = await executeLua(`return GlobalDashboardSceneLibrarySnapshot(${argument})`);
  if (result.timedOut) {
    throw new Error("TTS did not answer.");
  }
  if (typeof result.returnValue !== "string") {
    throw new Error(result.error && /nil value/.test(result.error) ? "TTS has not loaded the scene library commands yet. Save & Play once." : result.error ?? "TTS returned nothing.");
  }
  return scenesFromTts(parseTtsLibrarySnapshot(JSON.parse(result.returnValue)));
};

const save = async (): Promise<void> => {
  saveTimer = null;
  try {
    await request("PUT", { scenes: library.scenes, seeded: library.seeded });
    if (status.error) {
      setStatus({ ...status, error: null });
    }
  } catch (reason: unknown) {
    setStatus({ ...status, error: `Could not save the scene library: ${message(reason)}` });
  }
};

const write = (next: SceneLibrary): void => {
  library = next;
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => void save(), SAVE_DELAY_MS);
  notify();
};

const acknowledge = async (commands: readonly { op: "ackSceneLibraryImport" }[] | readonly { op: "ackSceneWriteBack"; key: string }[]): Promise<void> => {
  if (commands.length === 0) {
    return;
  }
  await executeLua(`return GlobalDashboardScenesApply(${luaJsonArg(commands)})`);
};

/**
 * Copies scenes that an old save still holds, when the dashboard file does not already have them,
 * then tells TTS it can drop that copy. A scene already in the file is left alone.
 */
export const importLegacySceneLibrary = async (): Promise<void> => {
  if (!status.loaded) {
    return;
  }
  const result = await executeLua("return GlobalDashboardSceneLibrarySnapshot()");
  if (result.timedOut || typeof result.returnValue !== "string") {
    if (!library.seeded) {
      throw new Error(result.timedOut ? "TTS did not answer." : "TTS has not loaded the scene library commands yet. Save & Play once.");
    }
    return;
  }
  const snapshot = parseTtsLibrarySnapshot(JSON.parse(result.returnValue));
  if (!snapshot.legacy && library.seeded) {
    return;
  }
  const tts = scenesFromTts(snapshot);
  const hotKeys = new Set([snapshot.liveKey, snapshot.departedKey].filter((key): key is string => typeof key === "string"));
  const kept = addMissingFromTts(library.scenes, tts.filter((row) => !hotKeys.has(row.key)));
  const merged = mergeFromTts(kept, tts.filter((row) => hotKeys.has(row.key)), true);
  library = { scenes: merged, seeded: true };
  notify();
  await request("PUT", { scenes: library.scenes, seeded: true });
  if (snapshot.legacy) {
    await acknowledge([{ op: "ackSceneLibraryImport" }]);
  }
};

/** Copies leftover save rows once; until it succeeds the picker says so and offers a retry. */
export const seedSceneLibraryFromTts = (): Promise<void> => {
  if (!seeding && status.loaded) {
    seeding = (async () => {
      try {
        await importLegacySceneLibrary();
        setStatus({ loaded: true, error: null });
      } catch (reason: unknown) {
        setStatus({ ...status, error: `Could not copy the scene library from TTS: ${message(reason)}` });
      } finally {
        seeding = null;
      }
    })();
  }
  return seeding ?? Promise.resolve();
};

const load = async (): Promise<void> => {
  try {
    library = await request("GET");
    setStatus({ loaded: true, error: null });
    if (!library.seeded) {
      await seedSceneLibraryFromTts();
    } else {
      await importLegacySceneLibrary();
    }
  } catch (reason: unknown) {
    setStatus({ loaded: false, error: message(reason) });
  }
};

const subscribe = (listener: () => void): (() => void) => {
  if (!requested) {
    requested = true;
    void load();
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Replaces the scene list; ignored until the server copy has loaded, so a slow fetch cannot be overwritten. */
export const setLibraryScenes = (scenes: readonly LibraryScene[]): void => {
  if (status.loaded) {
    write({ ...library, scenes });
  }
};

/** Adds the row, or replaces the row with the same key in place. */
export const putLibraryScene = (scene: LibraryScene): void => {
  const index = library.scenes.findIndex((row) => row.key === scene.key);
  setLibraryScenes(index < 0 ? [...library.scenes, scene] : library.scenes.map((row, i) => (i === index ? scene : row)));
};

export const removeLibraryScene = (key: string): void => setLibraryScenes(library.scenes.filter((row) => row.key !== key));

/**
 * Refreshes rows from TTS (all, or only `keys`): linked rows take the table's copy, link flags follow TTS. `adopt`
 * takes TTS's copy of every row read (the table's write-back after a scene leaves it).
 */
export const pullScenesFromTts = async (keys?: readonly string[], adopt = false): Promise<void> => {
  if (!status.loaded) {
    return;
  }
  const tts = await readTtsScenes(keys);
  const merged = mergeFromTts(library.scenes, tts, adopt);
  if (merged !== library.scenes) {
    library = { ...library, scenes: merged };
    notify();
    await request("PUT", { scenes: library.scenes, seeded: library.seeded });
  }
  const departed = keys?.filter((key) => tts.some((row) => row.key === key && !row.linked)) ?? [];
  if (departed.length > 0) {
    await acknowledge(departed.map((key) => ({ op: "ackSceneWriteBack" as const, key })));
  }
};

/** The current copy, for callbacks that outlive the render they were created in. */
export const sceneLibrarySnapshot = (): SceneLibrary => library;

export const useSceneLibrary = (): SceneLibrary => useSyncExternalStore(subscribe, () => library);
export const useSceneLibraryStatus = (): SceneLibraryStatus => useSyncExternalStore(subscribe, () => status);
