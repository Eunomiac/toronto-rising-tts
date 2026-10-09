import { useSyncExternalStore } from "react";
import { EMPTY_SCENE_LIBRARY, normalizeSceneLibrary, type LibraryScene, type SceneLibrary, type SceneLibraryPatch } from "../shared/sceneLibrary";
import { mergeFromTts, parseTtsLibrarySnapshot, scenesFromTts } from "./scenesPanel/library";
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

/** Copies TTS's library in once; until it succeeds the picker says so and offers a retry. */
export const seedSceneLibraryFromTts = (): Promise<void> => {
  if (!seeding && status.loaded) {
    seeding = (async () => {
      try {
        const tts = await readTtsScenes();
        write({ scenes: mergeFromTts(library.scenes, tts), seeded: true });
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

/** Refreshes rows from TTS (all, or only `keys`): linked rows take the table's copy, link flags follow TTS. */
export const pullScenesFromTts = async (keys?: readonly string[]): Promise<void> => {
  if (!status.loaded) {
    return;
  }
  const tts = await readTtsScenes(keys);
  const merged = mergeFromTts(library.scenes, tts);
  if (merged !== library.scenes) {
    write({ ...library, scenes: merged });
  }
};

/** The current copy, for callbacks that outlive the render they were created in. */
export const sceneLibrarySnapshot = (): SceneLibrary => library;

export const useSceneLibrary = (): SceneLibrary => useSyncExternalStore(subscribe, () => library);
export const useSceneLibraryStatus = (): SceneLibraryStatus => useSyncExternalStore(subscribe, () => status);
