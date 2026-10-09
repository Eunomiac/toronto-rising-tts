import { useEffect, useState } from "react";
import type { RosterLayout } from "../../shared/sceneDeck";
import { setSceneDeckSection, useSceneDeck } from "../sceneDeck";
import { parseControlBoardSnaps } from "./catalogs";
import type { ControlBoardSnaps, SceneCatalogs } from "./catalogs";

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

let snapsRequest: Promise<ControlBoardSnaps> | null = null;

/** Control board snap catalog, fetched once and shared; the stage drawing places its slots from it. */
export const useControlBoardSnaps = (): { snaps: ControlBoardSnaps | null; error: string | null } => {
  const [snaps, setSnaps] = useState<ControlBoardSnaps | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    snapsRequest ??= fetch("/api/control-board-snaps").then(async (response) => {
      if (!response.ok) {
        throw new Error(`Control board snaps failed to load (${response.status}).`);
      }
      return parseControlBoardSnaps(await response.json());
    });
    snapsRequest.then(setSnaps).catch((reason: unknown) => {
      snapsRequest = null;
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  }, []);
  return { snaps, error };
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

export type { RosterCategory, RosterLayout } from "../../shared/sceneDeck";

export const setRosterLayout = (next: RosterLayout): void => setSceneDeckSection("roster", next);

/** The roster layout from the dashboard's scene deck file; every subscriber sees the same copy. */
export const useRosterLayout = (): RosterLayout => useSceneDeck().roster;

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
