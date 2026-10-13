import { useEffect, useState } from "react";

/** One numbered generic figurine: its catalog key and the type label it shares with the rest of its group. */
export type GenericEntry = { readonly key: string; readonly label: string; readonly tags: string };

let catalog: Promise<readonly GenericEntry[]> | null = null;

/** `/api/generic-npcs`, fetched once and shared; a failed fetch is retried on the next call. */
export const loadGenericCatalog = (): Promise<readonly GenericEntry[]> => {
  catalog ??= fetch("/api/generic-npcs").then(async (response) => {
    const body = await response.json() as { npcs?: readonly GenericEntry[]; error?: string };
    if (!response.ok || !body.npcs) {
      throw new Error(body.error ?? `The generic NPC catalog failed to load (${response.status}).`);
    }
    return body.npcs;
  });
  catalog.catch(() => {
    catalog = null;
  });
  return catalog;
};

/** The generic catalog once loaded; null until then (a failure is logged). */
export const useGenericCatalog = (): readonly GenericEntry[] | null => {
  const [entries, setEntries] = useState<readonly GenericEntry[] | null>(null);
  useEffect(() => {
    let live = true;
    loadGenericCatalog().then(
      (list) => {
        if (live) {
          setEntries(list);
        }
      },
      (error: unknown) => console.error("Generic NPC catalog unavailable; generic NPCs show no stats.", error)
    );
    return () => {
      live = false;
    };
  }, []);
  return entries;
};
