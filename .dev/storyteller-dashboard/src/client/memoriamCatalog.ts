import { useSyncExternalStore } from "react";
import type { MemoriamNpcView, MemoriamYear } from "../shared/memoriamNpc";

/** Merged Memoriam catalog (`/api/memoriam-npcs`): the sheet plus dashboard location, year, and period edits. */

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

export type MemoriamFieldDraft = {
  readonly locations: readonly string[];
  readonly years: readonly MemoriamYear[];
  readonly periods: readonly string[];
};

/** Saves this NPC's location, year, and periods. Values that match the sheet are not stored. */
export const saveMemoriamFields = async (key: string, draft: MemoriamFieldDraft): Promise<void> => {
  const response = await fetch(`/api/memoriam-npcs?key=${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft)
  });
  publish(await readCatalog(response));
};
