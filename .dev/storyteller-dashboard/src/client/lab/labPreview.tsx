import { useState, type ReactElement } from "react";
import type { SceneClockMode } from "../scenesPanel/commands";
import { AspectRow, ConfirmButton, LocationPanel, PRESENT_DAY, SceneTimingRing, SoundMixer, WeatherPanel, WhenPanel, type LabLocation, type LiveScenes, type SceneTiming } from "./glance";
import { SceneNotes } from "./labNotes";
import { Box, WideBoard, canvasPoint } from "./sketch";

/** A library scene being prepared away from the table. */
export type PreparedScene = { readonly title: string; readonly location: LabLocation; readonly indoors: boolean };

const G = 4;
const HEAD_H = 40;
const LEFT_W = 380;
const STRIP_H = 132;
const ASPECT_H = 114;
const WHEN_W = 470;
const WEATHER_W = 380;

/** One prepared scene: the same panels as the table, framed in blue because edits only change the library copy. */
const PreparedPanels = ({ scene, w, h }: { scene: PreparedScene; w: number; h: number }): ReactElement => {
  const [location, setLocation] = useState(scene.location);
  const [at, setAt] = useState(PRESENT_DAY);
  const [fog, setFog] = useState(false);
  const top = HEAD_H + G;
  const rightX = G + LEFT_W + G;
  const rightW = w - rightX - G;
  const soundX = rightX + WHEN_W + G + WEATHER_W + G;
  const aspectY = top + STRIP_H + G;
  const boardY = aspectY + ASPECT_H + G;
  const boardH = h - boardY - G;
  return (
    <>
      <Box x={G} y={top} w={LEFT_W} h={STRIP_H} className="lab-backdrop-box">
        <LocationPanel
          location={location}
          overridden={location.districtKey !== scene.location.districtKey || location.siteKey !== scene.location.siteKey}
          onChange={setLocation}
          onRelease={() => setLocation(scene.location)}
          fog={{ on: fog, onToggle: () => setFog(!fog) }}
        />
      </Box>
      <Box x={G} y={aspectY} w={LEFT_W} h={h - aspectY - G} className="lab-borderless lab-gpreview-notes">
        <SceneNotes scene={scene.title} />
      </Box>
      <Box x={rightX} y={top} w={WHEN_W} h={STRIP_H} className="lab-backdrop-box">
        <WhenPanel at={at} present={PRESENT_DAY} onChange={setAt} onSetPresent={() => undefined} forceOpen={false} w={WHEN_W - 2} h={STRIP_H - 2} />
      </Box>
      <Box x={rightX + WHEN_W + G} y={top} w={WEATHER_W} h={STRIP_H} className="lab-backdrop-box">
        <WeatherPanel at={at} forceOverride={false} forceCelsius={null} w={WEATHER_W - 2} h={STRIP_H - 2} />
      </Box>
      <Box x={soundX} y={top} w={w - G - soundX} h={STRIP_H}>
        <SoundMixer indoors={scene.indoors} />
      </Box>
      <Box x={rightX} y={aspectY} w={rightW} h={ASPECT_H} className="lab-aspects-box lab-borderless">
        <AspectRow location={location} />
      </Box>
      <Box x={rightX} y={boardY} w={rightW} h={boardH} className="lab-borderless">
        <WideBoard w={rightW - 12} h={boardH - 10} />
      </Box>
    </>
  );
};

/**
 * Preview: prepared scenes in tabs across the top, each laid out like the table. On deck adds the scene to the
 * live scenes in the phase bar without switching to it; Play Scene asks how to set the clock, then puts it on the
 * table.
 */
export const ScenePreview = ({ x, y, w, h, prepared, scenes, onDeck, onPlay, onClose }: {
  x: number;
  y: number;
  w: number;
  h: number;
  prepared: readonly PreparedScene[];
  scenes: LiveScenes;
  onDeck: (title: string) => void;
  onPlay: (title: string, clockMode: SceneClockMode) => void;
  onClose: () => void;
}): ReactElement => {
  const [activeTitle, setActiveTitle] = useState(prepared[0]?.title ?? "");
  const [timing, setTiming] = useState<SceneTiming | null>(null);
  const active = prepared.find((scene) => scene.title === activeTitle) ?? prepared[0];
  const onTable = active !== undefined && active.title === scenes.current;
  const onDeckAlready = active !== undefined && scenes.live.includes(active.title);
  return (
    <div className="lab-gpreview" style={{ left: x, top: y, width: w, height: h }}>
      <div className="lab-gpreview-head">
        <span className="lab-gpreview-tag">Preview</span>
        <span className="lab-gpreview-tabs">
          {prepared.map((scene) => (
            <button
              key={scene.title}
              type="button"
              className={`lab-gpreview-tab${scene.title === active?.title ? " on" : ""}${scenes.live.includes(scene.title) ? " live" : ""}`}
              onClick={() => setActiveTitle(scene.title)}
            >
              {scene.title}
            </button>
          ))}
          <button type="button" className="lab-gpreview-tab add" title="Prepare another scene from the library">+ Prepare</button>
        </span>
        <span className="lab-gpreview-actions">
          <button type="button" className="lab-btn" onClick={onClose}>Save</button>
          <button
            type="button"
            className="lab-btn"
            disabled={!active || onDeckAlready}
            title="Add to the live scenes in the phase bar without switching to it"
            onClick={() => active && onDeck(active.title)}
          >
            {onTable ? "On the table" : onDeckAlready ? "On deck ✓" : "On deck"}
          </button>
          <button type="button" className="lab-btn live" disabled={!active || onTable}
            onClick={(event) => {
              if (active) {
                const title = active.title;
                setTiming({ at: canvasPoint(event), go: (mode) => onPlay(title, mode) });
              }
            }}
          >
            Play Scene
          </button>
          <ConfirmButton label="Discard" className="lab-btn danger" onConfirm={onClose} />
        </span>
      </div>
      {active && <PreparedPanels key={active.title} scene={active} w={w} h={h} />}
      {timing && <SceneTimingRing timing={timing} onClose={() => setTiming(null)} />}
    </div>
  );
};
