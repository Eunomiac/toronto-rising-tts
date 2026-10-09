import { type ReactElement } from "react";
import type { LibraryScene } from "../../shared/sceneLibrary";
import { ambientLabel, AspectRow, ConditionsPanel, LocationPanel, SoundMixer, WeatherPanel, WhenPanel } from "./glance";
import { SceneNotes } from "./sceneNotes";
import { previewLayout } from "./preview";
import { Box, WideBoard, type LiveBoard } from "./sketch";
import type { SceneCatalogs } from "./catalogs";
import { ScenesCommandContext, type ScenesCommand } from "./commands";
import { RollsCommandContext } from "./rolls/commands";
import { applyToDraft, draftAtPresentDay, draftClock, draftSceneSlice, draftSoundView, draftStage, savedPlacements, withPlacements } from "./library";
import { isScatter, lightingPreset, liveTokens, sceneConditions, toDate, weatherAxes } from "./liveScene";
import { boardToStage } from "./stageFrame";

const NO_SHEET = { ok: true, seats: [] } as const;

const locationOf = (scene: LibraryScene): { districtKey: string; siteKey: string } | null => {
  const { districtKey, siteKey } = scene.sessionScene;
  return typeof districtKey === "string" && typeof siteKey === "string" ? { districtKey, siteKey } : null;
};

const sameMinute = (a: Date, b: Date): boolean => Math.floor(a.getTime() / 60000) === Math.floor(b.getTime() / 60000);

/**
 * One preview: the table's panels reading a draft library row. Every panel command rewrites the draft
 * (`onChange`); nothing goes to TTS until Save, On deck or Play Scene. The stage edits the draft's NPC placements,
 * table, sky and lighting; seats and Scatter groups stay the table's business (Scatter drafts show no groups).
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
  const location = locationOf(draft);
  const site = catalogs?.sites.find((entry) => entry.key === location?.siteKey);
  const indoors = site?.isIndoors === true;
  const slice = draftSceneSlice(draft, indoors);
  const clock = draftClock(draft);
  const at = clock ? toDate(clock) : present;
  const savedLocation = saved ? locationOf(saved) : null;
  const send = (command: ScenesCommand): void => {
    if (command.op === "stage" && "reset" in command) {
      onChange((scene) => withPlacements(scene, savedPlacements(saved ?? null)));
      return;
    }
    // "Set scene time to present day" makes the draft follow present day rather than pin this minute.
    const followPresent = command.op === "clockTo" && sameMinute(toDate(command.datetime), present);
    onChange((scene) => (followPresent ? draftAtPresentDay(scene) : applyToDraft(scene, command)));
  };
  const board: LiveBoard = {
    seats: [],
    sheet: NO_SHEET,
    tokens: liveTokens(draftStage(draft), catalogs).map((token) => ({ ...token, at: boardToStage(token.u, token.v) })),
    pending: {},
    pendingScatter: [],
    generics: [],
    scatter: [],
    env: { tableKey: slice.tableKey ?? "", scatter: isScatter(slice), sky: slice.skyboxOverride ?? "", lighting: lightingPreset(slice) ?? "" },
    rollRing: { werewolves: [], oblivionSeats: [], endPhase: false }
  };
  return (
    <ScenesCommandContext.Provider value={send}>
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
      <Box {...box.notes} className="lab-borderless lab-gpreview-notes">
        <SceneNotes scene={draft.title} />
      </Box>
      <Box {...box.when} className="lab-backdrop-box">
        <WhenPanel
          at={at}
          present={present}
          onChange={() => undefined}
          onSetPresent={() => undefined}
          forceOpen={false}
          sceneOnly
          live={{ running: false, speed: 1 }}
          w={box.when.w - 2}
          h={box.when.h - 2}
        />
      </Box>
      <Box {...box.weather} className="lab-backdrop-box">
        <WeatherPanel
          at={at}
          forceOverride={false}
          forceCelsius={null}
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
    </ScenesCommandContext.Provider>
  );
};
