import { useSyncExternalStore } from "react";
import type { NpcOverride, NpcOverrideFile } from "../shared/npcOverride";

/** `data/npc-overrides.json`, loaded once and shared; the token configuration window writes it. */

type Overrides = Readonly<Record<string, NpcOverride>>;

const EMPTY: Overrides = {};
let overrides: Overrides = EMPTY;
let load: Promise<void> | null = null;
const listeners = new Set<() => void>();

const publish = (next: Overrides): void => {
  overrides = next;
  for (const listener of listeners) {
    listener();
  }
};

const ensureLoaded = (): void => {
  load ??= fetch("/api/npc-overrides")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`NPC overrides failed to load (${response.status}).`);
      }
      publish({ ...((await response.json()) as NpcOverrideFile).overrides });
    })
    .catch((error: unknown) => console.error("NPC overrides unavailable; showing catalog names and colours.", error));
};

const subscribe = (listener: () => void): (() => void) => {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useNpcOverrides = (): Overrides => useSyncExternalStore(subscribe, () => overrides);

/** Replaces the NPC's override; an empty one removes it. */
export const saveNpcOverride = async (characterKey: string, override: NpcOverride): Promise<void> => {
  const response = await fetch(`/api/npc-overrides?key=${encodeURIComponent(characterKey)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(override)
  });
  const body = (await response.json()) as NpcOverrideFile & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Saving the NPC settings failed (${response.status}).`);
  }
  publish({ ...body.overrides });
};
