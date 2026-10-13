import { useMemo, type ReactElement } from "react";
import type { LibraryScene } from "../../shared/sceneLibrary";
import { ambientLabel, AspectRow, ConditionsPanel, LocationPanel, RosterDock, SoundMixer, WeatherPanel, WhenPanel } from "./glance";
import { previewLayout } from "./preview";
import { Box, WideBoard, type LiveBoard } from "./sketch";
import type { SceneCatalogs } from "./catalogs";
import { GenericTiersContext, PendingGenericsContext, SceneGenericsContext, ScenesCommandContext, type ScenesCommand } from "./commands";
import { genericTiers } from "./queue";
import { RollsCommandContext } from "./rolls/commands";
import {
  applyToDraft,
  draftAtPresentDay,
  draftClock,
  draftGenerics,
  draftScatterGroups,
  draftSceneSlice,
  draftSeatRows,
  draftSoundView,
  draftStage,
  draftTable,
  savedPlacements,
  withPlacements,
  withScatterPack
} from "./library";
import { isScatter, lightingPreset, liveSeats, liveTokens, sceneConditions, toDate, weatherAxes } from "./liveScene";
import { useControlBoardSnaps } from "./roster";
import { ADD_CORNER, freeSlotNear, stageSpots } from "./stage";
import { boardToStage, stagePacks, stageToBoard, type StagePack } from "./stageFrame";
import { useWorldState } from "../worldState";

const NO_PENDING: Readonly<Record<string, string>> = {};


const locationOf = (scene: LibraryScene): { districtKey: string; siteKey: string } | null => {
  const { districtKey, siteKey } = scene.sessionScene;
  return typeof districtKey === "string" && typeof siteKey === "string" ? { districtKey, siteKey } : null;
};

const sameMinute = (a: Date, b: Date): boolean => Math.floor(a.getTime() / 60000) === Math.floor(b.getTime() / 60000);

/** Generics new to the draft also stand, lit, on the free slot nearest the stage's top-left corner (as on the table). */
const withAddedGenerics = (scene: LibraryScene, command: Extract<ScenesCommand, { op: "genericAdd" }>, packs: readonly StagePack[]): LibraryScene => {
  const known = new Set(draftGenerics(scene).map((npc) => npc.characterKey));
  return command.keys.filter((key) => !known.has(key)).reduce((next, key) => {
    const slot = freeSlotNear(ADD_CORNER, packs, stageSpots(draftStage(next)));
    return slot ? applyToDraft(next, { op: "stage", changes: { [key]: { ...stageToBoard(slot.u, slot.v), lightMode: "STANDARD" } } }) : next;
  }, applyToDraft(scene, command));
};

/**
 * One preview: the table's panels reading a draft library row. Every panel command rewrites the draft
 * (`onChange`); nothing goes to TTS until Save, On deck or Play Scene. The stage edits the draft's NPC placements,
 * table, sky and lighting; the seat strip shows the draft's seating, and a seat click marks that character present
 * or out of the scene for when it plays. A Scatter draft shows and edits its stored groups (`scatterPlacements`),
 * laid out fresh when the draft's table goes to Scatter. The left column is the table's notes-and-roster dock: roster
 * NPCs drop onto the draft's stage, and generics join the draft (`genericMembership`, spawned by TTS when the scene plays).
 */
export const DraftPanels = ({ draft, saved, present, catalogs, w, h, onChange }: {
  draft: LibraryScene;
  /** The library copy, for the location's Release; absent for a new scene. */
  saved: LibraryScene | undefined;
  present: Date;
  catalogs: SceneCatalogs | null;
  w: number;
  h: number;
  /** Rewrites the stored draft (always the latest copy, not this render's). */
  onChange: (update: (scene: LibraryScene) => LibraryScene) => void;
}): ReactElement => {
  const box = previewLayout(w, h);
  const tableSeats = useWorldState().seats?.seats ?? [];
  const { snaps } = useControlBoardSnaps();
  const packs = useMemo(() => (snaps ? stagePacks(snaps) : []), [snaps]);
  const scatterGroups = useMemo(() => draftScatterGroups(withScatterPack(draft, tableSeats, packs)), [draft, tableSeats, packs]);
  const location = locationOf(draft);
  const site = catalogs?.sites.find((entry) => entry.key === location?.siteKey);
  const indoors = site?.isIndoors === true;
  const slice = draftSceneSlice(draft, indoors);
  const clock = draftClock(draft);
  const at = clock ? toDate(clock) : present;
  const savedLocation = saved ? locationOf(saved) : null;
  const generics = draftGenerics(draft);
  const send = (command: ScenesCommand): void => {
    if (command.op === "stage" && "reset" in command) {
      onChange((scene) => withPlacements(scene, savedPlacements(saved ?? null)));
      return;
    }
    if (command.op === "genericAdd") {
      onChange((scene) => withAddedGenerics(scene, command, packs));
      return;
    }
    if (command.op === "table") {
      onChange((scene) => draftTable(scene, command.key, tableSeats, packs));
      return;
    }
    if (command.op === "scatterPlace") {
      onChange((scene) => applyToDraft(withScatterPack(scene, tableSeats, packs), command));
      return;
    }
    // "Set scene time to present day" makes the draft follow present day rather than pin this minute.
    const followPresent = command.op === "clockTo" && sameMinute(toDate(command.datetime), present);
    onChange((scene) => (followPresent ? draftAtPresentDay(scene) : applyToDraft(scene, command)));
  };
  const board: LiveBoard = {
    seats: liveSeats({ seats: draftSeatRows(draft, tableSeats), stage: [], generics, scatter: [], spotlightOrder: [] }, slice.tableKey, catalogs),
    presenceClicks: true,
    tokens: liveTokens(draftStage(draft), catalogs, generics).map((token) => ({ ...token, at: boardToStage(token.u, token.v) })),
    pending: {},
    pendingScatter: [],
    generics,
    scatter: scatterGroups,
    env: { tableKey: slice.tableKey ?? "", scatter: isScatter(slice), sky: slice.skyboxOverride ?? "", lighting: lightingPreset(slice) ?? "" },
    rollRing: { werewolves: [], oblivionSeats: [], endPhase: false }
  };
  return (
    <ScenesCommandContext.Provider value={send}>
    <PendingGenericsContext.Provider value={NO_PENDING}>
    <SceneGenericsContext.Provider value={generics}>
    <GenericTiersContext.Provider value={genericTiers(generics, [])}>
    <RollsCommandContext.Provider value={null}>
      <Box {...box.location} className="lab-backdrop-box">
        {location ? (
          <LocationPanel
            location={location}
            overridden={savedLocation !== null && (savedLocation.districtKey !== location.districtKey || savedLocation.siteKey !== location.siteKey)}
            onChange={(next) => send({ op: "location", ...next })}
            onRelease={() => savedLocation && send({ op: "location", ...savedLocation })}
            fog={{ on: slice.topFog, onToggle: () => send({ op: "topFog", on: !slice.topFog }) }}
          />
        ) : (
          <p className="lab-note">This scene has no location.</p>
        )}
      </Box>
      <Box {...box.notes} className="lab-borderless lab-dock-box">
        <RosterDock scene={draft.title} />
      </Box>
      <Box {...box.when} className="lab-backdrop-box">
        <WhenPanel
          at={at}
          present={present}
          sceneOnly
          live={{ running: false, speed: 1, allowed: false }}
          w={box.when.w - 2}
          h={box.when.h - 2}
        />
      </Box>
      <Box {...box.weather} className="lab-backdrop-box">
        <WeatherPanel
          at={at}
          celsius={null}
          {...(slice.weatherOverride ? { live: weatherAxes(slice.weather), held: true } : {})}
          w={box.weather.w - 2}
          h={box.weather.h - 2}
        />
      </Box>
      <Box {...box.sound}>
        <SoundMixer indoors={indoors} sceneAmbience={site?.locationTrack ? ambientLabel(site.locationTrack) : "Silent"} live={draftSoundView(draft)} />
      </Box>
      <Box {...box.aspects} className="lab-aspects-box lab-borderless">
        {location && <AspectRow location={location} />}
      </Box>
      <Box {...box.conditions} className="lab-aspects-box lab-borderless">
        {location && <ConditionsPanel location={location} conditions={sceneConditions(slice)} onChange={(ids) => send({ op: "conditions", ids })} />}
      </Box>
      <Box {...box.board} className="lab-borderless">
        <WideBoard w={box.board.w - 12} h={box.board.h - 10} live={board} />
      </Box>
    </RollsCommandContext.Provider>
    </GenericTiersContext.Provider>
    </SceneGenericsContext.Provider>
    </PendingGenericsContext.Provider>
    </ScenesCommandContext.Provider>
  );
};
