import { useSyncExternalStore } from "react";
import {
  EMPTY_SCENE_DECK,
  normalizeSceneDeck,
  parseRosterLayout,
  type SceneDeck,
  type SceneDeckPatch,
  type SceneDocs
} from "../shared/sceneDeck";

/**
 * The server's scene deck file (`/api/scene-deck`), fetched once and shared by every panel. Edits show at once and
 * save after `SAVE_DELAY_MS` of quiet; each save sends only the sections that changed.
 */

export type SceneDeckStatus = { readonly loaded: boolean; readonly error: string | null };

const SAVE_DELAY_MS = 600;

/** Where the Lab kept this data before the server file existed; read once to seed it, never deleted. */
const LEGACY_NOTES_KEY = "tr-lab-scene-docs";
const LEGACY_ROSTER_KEY = "tr-lab-roster-categories";

type Section = Exclude<keyof SceneDeck, "seeded">;

let deck: SceneDeck = EMPTY_SCENE_DECK;
let status: SceneDeckStatus = { loaded: false, error: null };
let requested = false;
let dirty = new Set<Section>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const notify = (): void => listeners.forEach((listener) => listener());

const setStatus = (next: SceneDeckStatus): void => {
  status = next;
  notify();
};

const request = async (method: "GET" | "PUT", body?: SceneDeckPatch): Promise<SceneDeck> => {
  const response = await fetch("/api/scene-deck", {
    method,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {})
  });
  if (response.status === 404) {
    throw new Error("Restart the dashboard server to load scene notes and the scene deck.");
  }
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = typeof payload === "object" && payload !== null ? (payload as { error?: unknown }).error : undefined;
    throw new Error(typeof error === "string" ? error : `Scene deck request failed (${response.status}).`);
  }
  return normalizeSceneDeck(payload);
};

const readLegacy = (): SceneDeckPatch => {
  const notesText = window.localStorage.getItem(LEGACY_NOTES_KEY);
  const rosterText = window.localStorage.getItem(LEGACY_ROSTER_KEY);
  const legacy = normalizeSceneDeck({
    notes: notesText ? (JSON.parse(notesText) as unknown) : {},
    roster: rosterText ? (JSON.parse(rosterText) as unknown) : {}
  });
  return {
    ...(Object.keys(legacy.notes).length > 0 ? { notes: legacy.notes } : {}),
    ...(rosterText ? { roster: parseRosterLayout(legacy.roster) } : {}),
    seeded: true
  };
};

const load = async (): Promise<void> => {
  try {
    let loaded = await request("GET");
    if (!loaded.seeded) {
      loaded = await request("PUT", readLegacy());
    }
    deck = loaded;
    setStatus({ loaded: true, error: null });
  } catch (reason: unknown) {
    setStatus({ loaded: false, error: reason instanceof Error ? reason.message : String(reason) });
  }
};

const save = async (): Promise<void> => {
  saveTimer = null;
  const sections = dirty;
  dirty = new Set();
  const patch: Record<string, unknown> = {};
  sections.forEach((section) => {
    patch[section] = deck[section];
  });
  try {
    await request("PUT", patch as SceneDeckPatch);
    if (status.error) {
      setStatus({ ...status, error: null });
    }
  } catch (reason: unknown) {
    sections.forEach((section) => dirty.add(section));
    setStatus({ ...status, error: `Could not save scene notes and deck: ${reason instanceof Error ? reason.message : String(reason)}` });
  }
};

const ensureLoaded = (): void => {
  if (!requested) {
    requested = true;
    void load();
  }
};

const subscribe = (listener: () => void): (() => void) => {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Replaces one section; ignored until the server copy has loaded, so a slow fetch cannot be overwritten. */
export const setSceneDeckSection = <K extends Section>(section: K, value: SceneDeck[K]): void => {
  if (!status.loaded) {
    return;
  }
  deck = { ...deck, [section]: value };
  dirty.add(section);
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => void save(), SAVE_DELAY_MS);
  notify();
};

/** The current copy, for callbacks that outlive the render they were created in. */
export const sceneDeckSnapshot = (): SceneDeck => deck;

export const useSceneDeck = (): SceneDeck => useSyncExternalStore(subscribe, () => deck);
export const useSceneDeckStatus = (): SceneDeckStatus => useSyncExternalStore(subscribe, () => status);

export const setSceneNotes = (scene: string, docs: SceneDocs): void =>
  setSceneDeckSection("notes", { ...deck.notes, [scene]: docs });
