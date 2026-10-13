import { useSyncExternalStore } from "react";
import { normalizeNpcStatsFile, type NpcStats, type NpcStatsFile } from "../shared/npcStats";

/** `data/npc-stats.json`, loaded once and shared; the Stats window writes it. Null until it has loaded. */

let stats: NpcStatsFile | null = null;
let load: Promise<void> | null = null;
const listeners = new Set<() => void>();

const publish = (next: NpcStatsFile): void => {
  stats = next;
  for (const listener of listeners) {
    listener();
  }
};

const ensureLoaded = (): void => {
  load ??= fetch("/api/npc-stats")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`NPC stats failed to load (${response.status}).`);
      }
      publish(normalizeNpcStatsFile(await response.json()));
    })
    .catch((error: unknown) => console.error("NPC stats unavailable; NPCs roll from manual pools only.", error));
};

const subscribe = (listener: () => void): (() => void) => {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useNpcStats = (): NpcStatsFile | null => useSyncExternalStore(subscribe, () => stats);

/** Replaces the NPC's blocks; empty blocks clear them. */
export const saveNpcStats = async (characterKey: string, next: NpcStats): Promise<void> => {
  const response = await fetch("/api/npc-stats", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [characterKey]: next })
  });
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const error = typeof body === "object" && body !== null ? (body as { error?: unknown }).error : undefined;
    throw new Error(typeof error === "string" ? error : `Saving the NPC stats failed (${response.status}).`);
  }
  publish(normalizeNpcStatsFile(body));
};
