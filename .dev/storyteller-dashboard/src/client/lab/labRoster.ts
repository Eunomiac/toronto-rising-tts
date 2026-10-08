import { useEffect, useState, useSyncExternalStore } from "react";
import type { SceneCatalogs } from "../scenes/types";

let catalogsRequest: Promise<SceneCatalogs> | null = null;

const loadSceneCatalogs = (): Promise<SceneCatalogs> => {
  catalogsRequest ??= fetch("/api/scene-catalogs").then(async (response) => {
    if (!response.ok) {
      throw new Error(`Scene catalogs failed to load (${response.status}).`);
    }
    return (await response.json()) as SceneCatalogs;
  });
  return catalogsRequest;
};

/** Scene catalogs, fetched once and shared by every Lab panel that needs them. */
export const useSceneCatalogs = (): { catalogs: SceneCatalogs | null; error: string | null } => {
  const [catalogs, setCatalogs] = useState<SceneCatalogs | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadSceneCatalogs()
      .then(setCatalogs)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);
  return { catalogs, error };
};

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

const ROSTER_LAYOUT_KEY = "tr-lab-roster-categories";

const readRosterLayout = (): RosterLayout => {
  const saved = window.localStorage.getItem(ROSTER_LAYOUT_KEY);
  const parsed = saved ? (JSON.parse(saved) as Partial<RosterLayout>) : {};
  return {
    categories: parsed.categories ?? [],
    assigned: parsed.assigned ?? {},
    groupColors: parsed.groupColors ?? {},
    leaders: parsed.leaders ?? {}
  };
};

let rosterLayout: RosterLayout | null = null;
const listeners = new Set<() => void>();

const rosterSnapshot = (): RosterLayout => {
  rosterLayout ??= readRosterLayout();
  return rosterLayout;
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const setRosterLayout = (next: RosterLayout): void => {
  rosterLayout = next;
  window.localStorage.setItem(ROSTER_LAYOUT_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
};

/** The Lab keeps the roster layout in this browser's local storage; every subscriber sees the same copy. */
export const useRosterLayout = (): RosterLayout => useSyncExternalStore(subscribe, rosterSnapshot);

/** The group's own colour, else its category's colour; undefined while unsorted and uncoloured. */
export const groupColor = (layout: RosterLayout, groupKey: string): string | undefined =>
  layout.groupColors[groupKey] ?? layout.categories.find((category) => category.id === layout.assigned[groupKey])?.color;

/**
 * Default group leaders, keyed by picker group: the NPCs marked "Boss?" in the chronicle sheet's NPCs tab that
 * have a catalogued token. The real build should carry this flag in the scene catalog export instead.
 */
const GROUP_BOSSES: Readonly<Record<string, string>> = {
  beesHive: "bee",
  colorBlitz: "rubyRouge",
  fiveKeys: "myleneHamelin",
  freeChantry: "nasirKhan",
  harpies: "theAristocrat",
  ironGuard: "laz",
  jarvisJacks: "maxFloyd",
  midnightMass: "fatherDiaz",
  moonClub: "victorVex",
  redFlag: "rosie",
  redeemers: "ren",
  scarlettAndTheBoys: "oliverGagnon",
  theLine: "sageSam",
  wychwoodHecata: "bacchusGiovanni"
};

/** The group's leader: the one picked in the roster, else the chronicle sheet's boss; undefined for none. */
export const groupLeader = (layout: RosterLayout, groupKey: string): string | undefined => {
  const picked = layout.leaders[groupKey];
  return picked === undefined ? GROUP_BOSSES[groupKey] : picked || undefined;
};
