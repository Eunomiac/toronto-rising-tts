import { useSyncExternalStore } from "react";
import type { MemoriamNpcView } from "../shared/memoriamNpc";

/** Memoriam roster from the spreadsheet export (`/api/memoriam-npcs`). */

type Catalog = readonly MemoriamNpcView[];

const EMPTY: Catalog = [];
let catalog: Catalog = EMPTY;
let load: Promise<void> | null = null;
const listeners = new Set<() => void>();

const publish = (next: Catalog): void => {
  catalog = next;
  for (const listener of listeners) {
    listener();
  }
};

const readCatalog = async (response: Response): Promise<Catalog> => {
  const body = await response.json() as { npcs?: Catalog; error?: string };
  if (!response.ok || !body.npcs) {
    throw new Error(body.error ?? `The Memoriam NPC catalog failed to load (${response.status}).`);
  }
  return body.npcs;
};

const ensureLoaded = (): void => {
  load ??= fetch("/api/memoriam-npcs")
    .then(readCatalog)
    .then(publish)
    .catch((error: unknown) => console.error("Memoriam NPC catalog unavailable.", error));
};

const subscribe = (listener: () => void): (() => void) => {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useMemoriamCatalog = (): Catalog => useSyncExternalStore(subscribe, () => catalog);
