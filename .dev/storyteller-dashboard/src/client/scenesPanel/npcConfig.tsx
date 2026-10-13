import { useState, type ReactElement } from "react";
import { CARD_SCALE_RANGE, parseNpcOverride, SEATED_Y_RANGE, type NpcOverride } from "../../shared/npcOverride";
import { openHeadshotEditor } from "../headshots/headshotEditor";
import { saveNpcOverride, useNpcOverrides } from "../npcOverrides";
import { NpcStatsModal } from "./npcStatsModal";
import { Overlay } from "./sketch";

/** World Y of a seated figurine (`SEAT_FIGURE.defaultY` in lib/seat_role_offsets.ttslua). */
const DEFAULT_SEATED_Y = -52.89;
/** Card scale of an NPC with no override (D.DEFAULT_FIGURINE_SCALE in lib/npcs_data.ttslua). */
const DEFAULT_CARD_SCALE = 53;
const WIDTH = 300;

export type NpcConfigTarget = {
  readonly characterKey: string;
  /** Canvas point the window opens at. */
  readonly at: { readonly x: number; readonly y: number };
  /** Catalog full name (generic NPCs: catalog label), before any override. */
  readonly defaultName: string;
  /** Ring colour the token gets from its roster group. */
  readonly defaultColor: string;
  /** Generic NPCs keep a stat block per tier; named NPCs keep one. */
  readonly generic: boolean;
  /** A generic already in the scene: Name renames it there (like the stage's Rename…) instead of saving an override. */
  readonly inScene?: { readonly name: string; readonly rename: (name: string) => void };
};

const numberOrUndefined = (text: string): number | string | undefined => {
  if (text.trim() === "") {
    return undefined;
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : text;
};

/**
 * One NPC's token settings: name, ring colour, head crop, card scale and seated height. Blank fields keep the
 * defaults. Clicking off (or Escape) saves; the token art and TTS pick the changes up on the next
 * `npm run npc-art` and Save & Play.
 */
export const NpcConfigModal = ({ target, onClose }: { target: NpcConfigTarget; onClose: () => void }): ReactElement => {
  const saved = useNpcOverrides()[target.characterKey] ?? {};
  const { inScene } = target;
  const [name, setName] = useState(inScene ? inScene.name : saved.name ?? "");
  const [color, setColor] = useState<string | null>(saved.color ?? null);
  const [cardScale, setCardScale] = useState(saved.cardScale === undefined ? "" : String(saved.cardScale));
  const [seatedY, setSeatedY] = useState(saved.seatedY === undefined ? "" : String(saved.seatedY));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const label = name.trim() || target.defaultName;

  const draft = (): NpcOverride | string => {
    const scale = numberOrUndefined(cardScale);
    const y = numberOrUndefined(seatedY);
    const overrideName = inScene ? saved.name : name;
    return parseNpcOverride({
      name: overrideName === undefined || overrideName.trim() === target.defaultName ? undefined : overrideName,
      color: color === target.defaultColor ? undefined : color,
      cardScale: scale === DEFAULT_CARD_SCALE ? undefined : scale,
      seatedY: y === DEFAULT_SEATED_Y ? undefined : y
    });
  };

  const close = (): void => {
    if (busy || statsOpen) {
      return;
    }
    const next = draft();
    if (typeof next === "string") {
      setError(next);
      return;
    }
    if (inScene && name.trim() !== "" && name.trim() !== inScene.name) {
      inScene.rename(name.trim());
    }
    if (JSON.stringify(next) === JSON.stringify(saved)) {
      onClose();
      return;
    }
    setBusy(true);
    saveNpcOverride(target.characterKey, next).then(onClose, (reason: unknown) => {
      setBusy(false);
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  };

  return (
    <Overlay onClose={close}>
      <div className="lab-modal lab-group-edit lab-npc-config" style={{ left: Math.min(target.at.x, 1920 - WIDTH - 8), top: target.at.y }}>
        <div className="lab-npc-config-head">
          <span className="lab-modal-title">{label}</span>
          <button type="button" className="lab-btn" title="Stat blocks for rolls and trackers" onClick={() => setStatsOpen(true)}>
            Stats
          </button>
        </div>
        <label className="lab-group-edit-row">
          <span>Name</span>
          <input className="lab-select" placeholder={target.defaultName} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="lab-group-edit-row">
          <span>Colour</span>
          <input type="color" className="lab-cat-color" value={color ?? target.defaultColor} onChange={(event) => setColor(event.target.value)} />
          {color !== null && (
            <button type="button" className="lab-btn" title="Back to the roster group's colour" onClick={() => setColor(null)}>
              ↺ Group colour
            </button>
          )}
        </label>
        <div className="lab-group-edit-row">
          <span>Head</span>
          <button type="button" className="lab-btn" onClick={() => void openHeadshotEditor(target.characterKey, label)}>
            Edit crop…
          </button>
        </div>
        <label className="lab-group-edit-row" title={`Custom Figurine card scale on the stage (${CARD_SCALE_RANGE[0]}–${CARD_SCALE_RANGE[1]}); seated figurines always use 53.`}>
          <span>Scale</span>
          <input
            className="lab-select"
            type="number"
            step="any"
            placeholder={String(DEFAULT_CARD_SCALE)}
            value={cardScale}
            onChange={(event) => setCardScale(event.target.value)}
          />
        </label>
        <label className="lab-group-edit-row" title={`World height of the figurine at a table seat (${SEATED_Y_RANGE[0]} to ${SEATED_Y_RANGE[1]}).`}>
          <span>Seat Y</span>
          <input
            className="lab-select"
            type="number"
            step="any"
            placeholder={String(DEFAULT_SEATED_Y)}
            value={seatedY}
            onChange={(event) => setSeatedY(event.target.value)}
          />
        </label>
        {error && <p className="lab-note">{error}</p>}
        <p className="lab-npc-config-hint">
          {inScene ? "Name renames them in this scene (queued for Send). " : ""}
          Blank keeps the default. Click off to save. TTS shows {inScene ? "the other " : ""}changes after npm run npc-art and Save &amp; Play.
        </p>
      </div>
      {statsOpen && (
        <NpcStatsModal characterKey={target.characterKey} label={label} generic={target.generic} onClose={() => setStatsOpen(false)} />
      )}
    </Overlay>
  );
};
