import { Fragment, useState, type ReactElement } from "react";
import type { SceneClockMode } from "../scenesPanel/commands";
import {
  AspectRow,
  ConditionsPanel,
  ConfirmButton,
  LocationPanel,
  PRESENT_DAY,
  SceneTimingRing,
  SoundMixer,
  WeatherPanel,
  WhenPanel,
  type LabLocation,
  type LiveScenes,
  type SceneRef,
  type SceneTiming
} from "./glance";
import { SceneNotes } from "./labNotes";
import { Box, WideBoard, canvasPoint } from "./sketch";

/** A Lab scene being prepared away from the table. */
export type PreparedScene = SceneRef & { readonly location: LabLocation; readonly indoors: boolean };

const G = 4;
const HEAD_H = 40;
const LEFT_W = 380;
const STRIP_H = 132;
const ASPECT_H = 114;
const WHEN_W = 470;
const WEATHER_W = 380;
const CONDITIONS_W = 265;

type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/** Where each panel sits inside a preview of size `w` × `h` (the table's layout, under the tab row). */
export const previewLayout = (w: number, h: number): Readonly<Record<"location" | "notes" | "when" | "weather" | "sound" | "aspects" | "conditions" | "board", Rect>> => {
  const top = HEAD_H + G;
  const rightX = G + LEFT_W + G;
  const rightW = w - rightX - G;
  const soundX = rightX + WHEN_W + G + WEATHER_W + G;
  const aspectY = top + STRIP_H + G;
  const boardY = aspectY + ASPECT_H + G;
  return {
    location: { x: G, y: top, w: LEFT_W, h: STRIP_H },
    notes: { x: G, y: aspectY, w: LEFT_W, h: h - aspectY - G },
    when: { x: rightX, y: top, w: WHEN_W, h: STRIP_H },
    weather: { x: rightX + WHEN_W + G, y: top, w: WEATHER_W, h: STRIP_H },
    sound: { x: soundX, y: top, w: w - G - soundX, h: STRIP_H },
    aspects: { x: rightX, y: aspectY, w: rightW - CONDITIONS_W - G, h: ASPECT_H },
    conditions: { x: w - G - CONDITIONS_W, y: aspectY, w: CONDITIONS_W, h: ASPECT_H },
    board: { x: rightX, y: boardY, w: rightW, h: h - boardY - G }
  };
};

/** The Lab's prepared scene: the same panels as the table on local mock state. */
export const PreparedPanels = ({ scene, w, h }: { scene: PreparedScene; w: number; h: number }): ReactElement => {
  const [location, setLocation] = useState(scene.location);
  const [at, setAt] = useState(PRESENT_DAY);
  const [fog, setFog] = useState(false);
  const box = previewLayout(w, h);
  return (
    <>
      <Box {...box.location} className="lab-backdrop-box">
        <LocationPanel
          location={location}
          overridden={location.districtKey !== scene.location.districtKey || location.siteKey !== scene.location.siteKey}
          onChange={setLocation}
          onRelease={() => setLocation(scene.location)}
          fog={{ on: fog, onToggle: () => setFog(!fog) }}
        />
      </Box>
      <Box {...box.notes} className="lab-borderless lab-gpreview-notes">
        <SceneNotes scene={scene.title} />
      </Box>
      <Box {...box.when} className="lab-backdrop-box">
        <WhenPanel at={at} present={PRESENT_DAY} onChange={setAt} onSetPresent={() => undefined} forceOpen={false} w={box.when.w - 2} h={box.when.h - 2} />
      </Box>
      <Box {...box.weather} className="lab-backdrop-box">
        <WeatherPanel at={at} forceOverride={false} forceCelsius={null} w={box.weather.w - 2} h={box.weather.h - 2} />
      </Box>
      <Box {...box.sound}>
        <SoundMixer indoors={scene.indoors} />
      </Box>
      <Box {...box.aspects} className="lab-aspects-box lab-borderless">
        <AspectRow location={location} />
      </Box>
      <Box {...box.conditions} className="lab-aspects-box lab-borderless">
        <ConditionsPanel location={location} />
      </Box>
      <Box {...box.board} className="lab-borderless">
        <WideBoard w={box.board.w - 12} h={box.board.h - 10} />
      </Box>
    </>
  );
};

/**
 * Preview: prepared scenes in tabs across the top, each laid out like the table and framed in blue because edits
 * only change the library copy. Save keeps the edits in the library; On deck also adds the scene to the live
 * scenes in the phase bar without switching to it; Play Scene asks how to set the clock, then puts it on the
 * table; Discard (second click) drops the edits. `panels` draws the open scene's panels.
 */
export const ScenePreview = ({ x, y, w, h, prepared, initialKey, scenes, note, onSave, onDeck, onPlay, onDiscard, onPrepare, panels }: {
  x: number;
  y: number;
  w: number;
  h: number;
  prepared: readonly SceneRef[];
  initialKey?: string;
  scenes: LiveScenes;
  /** A line under the tabs about the open scene (for example, that the table writes into it). */
  note?: (key: string) => string | undefined;
  onSave: (key: string) => void;
  onDeck: (key: string) => void;
  onPlay: (key: string, clockMode: SceneClockMode) => void;
  onDiscard: (key: string) => void;
  onPrepare?: () => void;
  panels: (key: string, w: number, h: number) => ReactElement;
}): ReactElement => {
  const [activeKey, setActiveKey] = useState(initialKey ?? prepared[0]?.key ?? "");
  const [timing, setTiming] = useState<SceneTiming | null>(null);
  const active = prepared.find((scene) => scene.key === activeKey) ?? prepared[0];
  const onTable = active !== undefined && active.key === scenes.current?.key;
  const onDeckAlready = active !== undefined && scenes.live.some((scene) => scene.key === active.key);
  const activeNote = active && note?.(active.key);
  return (
    <div className="lab-gpreview" style={{ left: x, top: y, width: w, height: h }}>
      <div className="lab-gpreview-head">
        <span className="lab-gpreview-tag">Preview</span>
        <span className="lab-gpreview-tabs">
          {prepared.map((scene) => (
            <button
              key={scene.key}
              type="button"
              className={`lab-gpreview-tab${scene.key === active?.key ? " on" : ""}${scenes.live.some((live) => live.key === scene.key) ? " live" : ""}`}
              onClick={() => setActiveKey(scene.key)}
            >
              {scene.title}
            </button>
          ))}
          {onPrepare && <button type="button" className="lab-gpreview-tab add" title="Prepare another scene from the library" onClick={onPrepare}>+ Prepare</button>}
        </span>
        {activeNote && <span className="lab-gpreview-note">{activeNote}</span>}
        <span className="lab-gpreview-actions">
          <button type="button" className="lab-btn" disabled={!active} title="Keep these edits in the scene library" onClick={() => active && onSave(active.key)}>Save</button>
          <button
            type="button"
            className="lab-btn"
            disabled={!active || onDeckAlready}
            title="Save, and add to the live scenes in the phase bar without switching to it"
            onClick={() => active && onDeck(active.key)}
          >
            {onTable ? "On the table" : onDeckAlready ? "On deck ✓" : "On deck"}
          </button>
          <button type="button" className="lab-btn live" disabled={!active || onTable}
            onClick={(event) => {
              if (active) {
                const key = active.key;
                setTiming({ at: canvasPoint(event), go: (mode) => onPlay(key, mode) });
              }
            }}
          >
            Play Scene
          </button>
          <ConfirmButton label="Discard" className="lab-btn danger" onConfirm={() => active && onDiscard(active.key)} />
        </span>
      </div>
      {active && <Fragment key={active.key}>{panels(active.key, w, h)}</Fragment>}
      {timing && <SceneTimingRing timing={timing} onClose={() => setTiming(null)} />}
    </div>
  );
};
