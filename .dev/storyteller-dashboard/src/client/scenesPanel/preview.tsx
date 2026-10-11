import { Fragment, useState, type ReactElement } from "react";
import type { SceneStatus } from "../../shared/sceneLibrary";
import { ConfirmButton, useSceneEntry, type LiveScenes, type PlayScene, type SceneRef } from "./glance";
import { canvasPoint } from "./sketch";

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

/**
 * Preview: prepared scenes in tabs across the top, each laid out like the table and framed in blue because edits
 * only change the library copy. A new scene can be made a template (it then plays as a dated copy, `[Title]`).
 * Save keeps the edits in the library; On deck also adds the scene to the live scenes in the phase bar without
 * switching to it; Play Scene puts it on the table (a new scene first asks how to set the clock); Discard (second
 * click) drops the edits. `panels` draws the open scene's panels.
 */
export const ScenePreview = ({ x, y, w, h, prepared, initialKey, scenes, note, statusOf, onStatus, onSave, onDeck, onPlay, onDiscard, panels }: {
  x: number;
  y: number;
  w: number;
  h: number;
  prepared: readonly SceneRef[];
  initialKey?: string;
  scenes: LiveScenes;
  /** A line under the tabs about the open scene (for example, that the table writes into it). */
  note?: (key: string) => string | undefined;
  statusOf: (key: string) => SceneStatus | undefined;
  onStatus: (key: string, status: SceneStatus) => void;
  onSave: (key: string) => void;
  onDeck: (key: string) => void;
  onPlay: PlayScene;
  onDiscard: (key: string) => void;
  panels: (key: string, w: number, h: number) => ReactElement;
}): ReactElement => {
  const [activeKey, setActiveKey] = useState(initialKey ?? prepared[0]?.key ?? "");
  const entry = useSceneEntry();
  const active = prepared.find((scene) => scene.key === activeKey) ?? prepared[0];
  const onTable = active !== undefined && active.key === scenes.current?.key;
  const onDeckAlready = active !== undefined && scenes.live.some((scene) => scene.key === active.key);
  const activeNote = active && note?.(active.key);
  const status = active ? statusOf(active.key) : undefined;
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
              {statusOf(scene.key) === "template" ? `[${scene.title}]` : scene.title}
            </button>
          ))}
        </span>
        {activeNote && <span className="lab-gpreview-note">{activeNote}</span>}
        <span className="lab-gpreview-actions">
          {active && (status === "new" || status === "template") && (
            <select
              className="lab-select"
              value={status}
              title="A template never goes live itself: playing it plays a fresh copy dated with the night"
              onChange={(event) => onStatus(active.key, event.target.value as SceneStatus)}
            >
              <option value="new">New scene</option>
              <option value="template">Template</option>
            </select>
          )}
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
                entry.enter(key, canvasPoint(event), (clock, edit) => onPlay(key, clock, edit));
              }
            }}
          >
            Play Scene
          </button>
          <ConfirmButton label="Discard" className="lab-btn danger" onConfirm={() => active && onDiscard(active.key)} />
        </span>
      </div>
      {active && <Fragment key={active.key}>{panels(active.key, w, h)}</Fragment>}
      {entry.modal}
    </div>
  );
};
