import { useEffect, useMemo, useState } from "react";
import type { RosterLayout } from "../../shared/sceneDeck";
import { useNpcOverrides } from "../npcOverrides";
import { setSceneDeckSection, useSceneDeck } from "../sceneDeck";
import { parseControlBoardSnaps } from "./catalogs";
import type { CatalogCharacter, ControlBoardSnaps, SceneCatalogs } from "./catalogs";

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

const renamed = (catalogs: SceneCatalogs, overrides: ReturnType<typeof useNpcOverrides>): SceneCatalogs => {
  const rename = (character: CatalogCharacter): CatalogCharacter => {
    const name = overrides[character.characterKey]?.name;
    return name === undefined ? character : { ...character, fullName: name };
  };
  return { ...catalogs, pcs: catalogs.pcs.map(rename), namedNpcs: catalogs.namedNpcs.map(rename) };
};

/**
 * Scene catalogs, fetched once and shared by every Lab panel that needs them, with the token configuration
 * window's name overrides already applied to `fullName`. `raw` keeps the catalog names (the window's defaults).
 */
export const useSceneCatalogs = (): { catalogs: SceneCatalogs | null; raw: SceneCatalogs | null; error: string | null } => {
  const [raw, setRaw] = useState<SceneCatalogs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const overrides = useNpcOverrides();
  useEffect(() => {
    loadSceneCatalogs()
      .then(setRaw)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);
  const catalogs = useMemo(() => (raw ? renamed(raw, overrides) : null), [raw, overrides]);
  return { catalogs, raw, error };
};

export type { RosterCategory, RosterLayout } from "../../shared/sceneDeck";

export const setRosterLayout = (next: RosterLayout): void => setSceneDeckSection("roster", next);

/** The roster layout from the dashboard's scene deck file; every subscriber sees the same copy. */
export const useRosterLayout = (): RosterLayout => useSceneDeck().roster;

/** The group's own colour, else its category's colour; undefined while unsorted and uncoloured. */
export const groupColor = (layout: RosterLayout, groupKey: string): string | undefined =>
  layout.groupColors[groupKey] ?? layout.categories.find((category) => category.id === layout.assigned[groupKey])?.color;

/**
 * The group's leader: the one picked in the roster, else the catalog's `groupBosses` default (undefined while the
 * catalog loads); undefined for none.
 */
export const groupLeader = (
  layout: RosterLayout,
  bosses: Readonly<Record<string, string>> | undefined,
  groupKey: string
): string | undefined => {
  const picked = layout.leaders[groupKey];
  return picked === undefined ? bosses?.[groupKey] : picked || undefined;
};
