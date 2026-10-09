import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactElement } from "react";
import { Icon, type IconName } from "../../lab/icons";
import { canvasPoint, Overlay } from "../../lab/sketch";
import { SEAT_ACCENT } from "../../pcSheet/layout";
import type { PcRoll, PoolKind, RollsSlice, StLiveRoll, StRollSlot } from "../../worldState";
import type { RollOptionsView } from "./bridge";
import type { PoolDieAction, RollsSend } from "./commands";
import { DiceRing, PoolDiamonds, RolledDice } from "./dice";
import {
  draftFromView,
  PERMANENT_OPTIONS,
  poolRingChoices,
  RESULT_CLASSES,
  rollPhaseLabel,
  rollTypeLabel,
  STRUCTURAL_OPTIONS,
  toggleCondition,
  toggleStructural,
  type RollOptionsDraft
} from "./view";

/**
 * The Scenes tab's Rolls cell: every Storyteller roll control. PC rolls get one row each (the difficulty strip
 * doubles as approval for a roll waiting in setup); the three Storyteller dice drawers sit below, then the live
 * NPC roll. A row's background and glow tell its phase; clicking an editable pool opens its dice ring. Dice still
 * roll physically in TTS.
 */

export type OptionsAccess = {
  /** What the pop-up opens with. */
  readonly load: (color: string) => Promise<RollOptionsView>;
  /** Change the roll type now (TTS re-reads the per-roll rules for it) and return the fresh values. */
  readonly changeType: (color: string, rollType: string) => Promise<RollOptionsView>;
};

const DIFFICULTY_MAX = 10;

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, index) => from + index);

/** Phase as background and glow: setup glows red, ready is steady gold, rolling pulses gold (blue on a Willpower reroll). */
const phaseClass = (phase: string | undefined, wpReroll: boolean): string =>
  `phase-${phase ?? "none"}${wpReroll ? " wp" : ""}`;

const phaseTitle = (phase: string | undefined, wpReroll: boolean): string =>
  wpReroll ? `${rollPhaseLabel(phase)} (Willpower reroll)` : rollPhaseLabel(phase);

const DifficultyStrip = ({ value, disabled, title, onPick }: {
  value: number | undefined;
  disabled?: boolean;
  title: string;
  onPick: (n: number) => void;
}): ReactElement => (
  <div className={`roll-strip${disabled ? " disabled" : ""}`} title={title}>
    {range(0, DIFFICULTY_MAX).map((n) => (
      <button key={n} type="button" className={`roll-strip-cell${n === value ? " on" : ""}`} disabled={disabled} onClick={() => onPick(n)}>
        {n}
      </button>
    ))}
  </div>
);

const IconBtn = ({ icon, title, className, disabled, onClick, onContextMenu }: {
  icon: IconName;
  title: string;
  className?: string;
  disabled?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
}): ReactElement => (
  <button
    type="button"
    className={`roll-icon-btn${className ? ` ${className}` : ""}`}
    title={title}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
    onContextMenu={onContextMenu}
  >
    <Icon name={icon} />
  </button>
);

/** Right-click runs the quiet variant of an action (secret dice / no broadcast). */
const quietClick = (run: (quiet: boolean) => void) => ({
  onClick: () => run(false),
  onContextMenu: (event: MouseEvent) => {
    event.preventDefault();
    run(true);
  }
});

const ResultLine = ({ text, resultClass }: { text: string; resultClass: string | undefined }): ReactElement | null =>
  text ? <span className={`roll-result ${resultClass ?? ""}`}>{text}</span> : null;

const pendingText = (pending: string | undefined): string | null =>
  pending === "oblivHungerStain" ? "Waiting for the player: Hunger or Stain"
    : pending === "brutalFailViolence" ? "Waiting for the player: fail or violence"
      : null;

type PoolRing = { readonly x: number; readonly y: number; readonly target: { readonly kind: "pc"; readonly color: string } | { readonly kind: "npc" } };

const PC_POOL_ACTIONS: Readonly<Partial<Record<PoolKind, readonly [PoolDieAction, PoolDieAction]>>> = {
  hunger: ["addHungerDie", "remHungerDie"],
  normal: ["addStandardDie", "remStandardDie"]
};

const PcRollRow = ({ roll, send, onOptions, onPool }: {
  roll: PcRoll;
  send: RollsSend;
  onOptions: (event: MouseEvent<HTMLElement>, roll: PcRoll) => void;
  onPool: (event: MouseEvent<HTMLElement>, color: string) => void;
}): ReactElement => {
  const color = roll.color;
  const style = { "--seat-color": SEAT_ACCENT[color] ?? "#888" } as CSSProperties;
  const setup = roll.phase === "setup";
  const resolved = roll.phase === "resolved";
  const waiting = pendingText(roll.pending);
  const title = roll.held
    ? "Held result: the roll is finished but not yet shown to the table. Broadcast it, or dismiss it."
    : phaseTitle(roll.phase, roll.wpReroll);
  return (
    <div className={`roll-row ${roll.held ? "held" : phaseClass(roll.phase, roll.wpReroll)}`} style={style} title={title}>
      <div className="roll-row-head">
        <span className="roll-row-name">{roll.name}</span>
        <span className="roll-row-type" title={roll.label}>{rollTypeLabel(roll.rollType)}</span>
        {roll.held ? (
          <IconBtn icon="broadcast" title="Broadcast: show this result to the table" onClick={() => send({ op: "broadcast", color })} />
        ) : (
          <IconBtn icon="options" title="Roll options" onClick={(event) => onOptions(event, roll)} />
        )}
        <IconBtn
          icon="cancel"
          className="danger"
          title={roll.held ? "Dismiss this result" : "Cancel this roll"}
          onClick={() => send({ op: "cancel", color })}
        />
      </div>
      <div className="roll-row-line">
        <PoolDiamonds pool={roll.pool} onClick={!roll.held && roll.canModifyPool ? (event) => onPool(event, color) : undefined} />
        <ResultLine text={roll.result?.text ?? ""} resultClass={roll.result?.resultClass} />
      </div>
      {roll.conditions && <div className="roll-row-sub dim">{roll.conditions}</div>}
      <RolledDice dice={roll.dice} pickable={false} />
      {waiting && <div className="roll-row-sub warn">{waiting}</div>}
      {!roll.held && roll.canModifyPool && (
        <select
          className="roll-override"
          title="Override the result"
          value=""
          onChange={(event) => {
            if (event.target.value) {
              send({ op: "override", color, resultClass: event.target.value });
            }
          }}
        >
          <option value="">Override…</option>
          {RESULT_CLASSES.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
        </select>
      )}
      {!roll.held && !roll.canModifyPool && !resolved && (
        <DifficultyStrip
          value={roll.difficulty}
          title={setup ? "Pick a difficulty to approve the roll and open it to the player" : "Difficulty"}
          onPick={(value) => send({ op: "difficulty", color, value })}
        />
      )}
    </div>
  );
};

const SlotChip = ({ slot, send }: { slot: StRollSlot; send: RollsSend }): ReactElement => (
  <div
    className={`roll-slot ${phaseClass(slot.phase, false)}${slot.live ? " live" : ""}`}
    title={`Drawer ${slot.index}: ${rollTypeLabel(slot.rollType)}, ${rollPhaseLabel(slot.phase)}`}
  >
    <span className="roll-slot-index">{slot.index}</span>
    <span className="roll-slot-label">{slot.label ?? "—"}</span>
    {slot.canBroadcast && (
      <IconBtn icon="broadcast" title="Broadcast: show this held result to the table" onClick={() => send({ op: "slotBroadcast", slot: slot.index })} />
    )}
    <IconBtn icon="cancel" className="danger" title="Clear this drawer" onClick={() => send({ op: "slotCancel", slot: slot.index })} />
  </div>
);

const NpcRollPanel = ({ live, send, onPool }: { live: StLiveRoll; send: RollsSend; onPool: (event: MouseEvent<HTMLElement>) => void }): ReactElement => {
  const editable = live.phase === "setup" || live.phase === "preRoll";
  const a = live.actions;
  return (
    <div className={`roll-npc ${phaseClass(live.phase, live.wpReroll)}`} title={live.hint}>
      <div className="roll-row-head">
        <span className="roll-row-name">{live.label ?? "NPC"}</span>
        <span className="roll-row-type">{rollTypeLabel(live.rollType)}</span>
        {live.secret && <span className="roll-flag" title="Secret dice: hidden from the players">S</span>}
        {live.quiet && <span className="roll-flag" title="No broadcast: the result is held">Q</span>}
        <IconBtn icon="cancel" className="danger" title="Cancel this roll and clear its drawer" onClick={() => send({ op: "npcCancel" })} />
      </div>
      <div className="roll-row-line">
        <PoolDiamonds pool={live.pool} onClick={editable ? onPool : undefined} />
        <ResultLine text={live.result?.text ?? ""} resultClass={live.result?.resultClass} />
      </div>
      <DifficultyStrip
        value={live.difficulty}
        disabled={live.phase === "resolved"}
        title="Difficulty"
        onPick={(value) => send({ op: "npcDifficulty", value })}
      />
      <RolledDice dice={live.dice} pickable={a.reroll} onPick={(index) => send({ op: "npcDie", index })} />
      <div className="roll-buttons">
        {a.roll && (
          <IconBtn icon="roll" className="primary" disabled={!a.rollEnabled} title="Roll (right-click: secret dice, hidden from the players)" {...quietClick((secret) => send({ op: "npcRoll", secret }))} />
        )}
        {a.half && (
          <button type="button" className="roll-icon-btn glyph" title="Take Half (right-click: no broadcast)" aria-label="Take Half" {...quietClick((quiet) => send({ op: "npcHalf", quiet }))}>
            ½
          </button>
        )}
        {a.wp && <IconBtn icon="willpower" className="wp" title="Spend Willpower to reroll" onClick={() => send({ op: "npcWp" })} />}
        {a.reroll && <IconBtn icon="reroll" disabled={!a.rerollEnabled} title="Reroll the picked dice" onClick={() => send({ op: "npcReroll" })} />}
        {a.recalc && <IconBtn icon="recalc" title="Recalculate: re-read the dice on the table" onClick={() => send({ op: "npcRecalc" })} />}
        {a.confirm && (
          <IconBtn icon="confirm" className="primary" title="Confirm (right-click: hold the result instead of broadcasting it)" {...quietClick((quiet) => send({ op: "npcConfirm", quiet }))} />
        )}
        {a.oblivChoice && (
          <span className="roll-choice" title="Oblivion: take Hunger or a Stain">
            <IconBtn icon="hunger" className="hunger" title="Oblivion: take Hunger" onClick={() => send({ op: "choice", color: "Black", choice: "hunger" })} />
            <IconBtn icon="humanity" className="humanity" title="Oblivion: take a Stain" onClick={() => send({ op: "choice", color: "Black", choice: "stain" })} />
          </span>
        )}
        {a.brutalChoice && (
          <span className="roll-choice" title="Brutal: fail the roll or turn to violence">
            <IconBtn icon="cancel" title="Brutal: take the failure" onClick={() => send({ op: "choice", color: "Black", choice: "fail" })} />
            <IconBtn icon="violence" className="danger" title="Brutal: turn to violence" onClick={() => send({ op: "choice", color: "Black", choice: "violence" })} />
          </span>
        )}
      </div>
    </div>
  );
};

type OptionsPopup = { readonly x: number; readonly y: number; readonly roll: PcRoll };

const RollOptions = ({ popup, access, send, onClose }: { popup: OptionsPopup; access: OptionsAccess; send: RollsSend; onClose: () => void }): ReactElement => {
  const color = popup.roll.color;
  const [view, setView] = useState<RollOptionsView | null>(null);
  const [draft, setDraft] = useState<RollOptionsDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { load } = access;
  useEffect(() => {
    let current = true;
    load(color).then(
      (loaded) => {
        if (current) {
          setView(loaded);
          setDraft(draftFromView(loaded));
        }
      },
      (reason: unknown) => {
        if (current) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      }
    );
    return () => {
      current = false;
    };
  }, [load, color]);
  const changeType = (rollType: string): void => {
    if (!draft || rollType === draft.rollType) {
      return;
    }
    access.changeType(color, rollType).then(
      (loaded) => {
        setView(loaded);
        setDraft({ ...draftFromView(loaded), permanent: draft.permanent, rerolls: draft.rerolls, diceRerolled: draft.diceRerolled });
      },
      (reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason))
    );
  };
  return (
    <Overlay onClose={onClose}>
      <div className="lab-modal roll-options" style={{ left: popup.x, top: popup.y }}>
        <span className="lab-modal-title">{popup.roll.name}: roll options</span>
        {error && <span className="scenes-live-status error">{error}</span>}
        {!error && (!view || !draft) && <span className="lab-note">Asking TTS…</span>}
        {view && draft && (
          <>
            <span className="roll-options-head">Roll type</span>
            <div className="roll-options-grid">
              {view.rollTypes.map((entry) => (
                <button key={entry.key} type="button" className={`roll-toggle${entry.key === draft.rollType ? " on" : ""}`} onClick={() => changeType(entry.key)}>
                  {rollTypeLabel(entry.key)}
                </button>
              ))}
            </div>
            <span className="roll-options-head">Always (every roll)</span>
            <div className="roll-options-grid">
              {PERMANENT_OPTIONS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className={`roll-toggle${draft.permanent[entry.key] ? " on" : ""}`}
                  onClick={() => setDraft({ ...draft, permanent: { ...draft.permanent, [entry.key]: draft.permanent[entry.key] !== true } })}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <span className="roll-options-head">This roll</span>
            <div className="roll-options-grid">
              {STRUCTURAL_OPTIONS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className={`roll-toggle${draft.structural[entry.key] ? " on" : ""}`}
                  disabled={(entry.key === "takeHalf" && view.locked.takeHalf) || (entry.key === "hungerDice" && view.locked.hungerDice)}
                  onClick={() => setDraft(toggleStructural(draft, entry.key, view.negating))}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            {view.conditions.length > 0 && (
              <>
                <span className="roll-options-head">Roll conditions</span>
                <div className="roll-options-grid">
                  {view.conditions.map((condition) => (
                    <button
                      key={condition.id}
                      type="button"
                      className={`roll-toggle${draft.conditions[condition.id] ? " on" : ""}`}
                      onClick={() => setDraft(toggleCondition(draft, condition.id, view.negating))}
                    >
                      {condition.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="roll-options-numbers">
              <label>
                Rerolls
                <input type="number" min={0} value={draft.rerolls} onChange={(event) => setDraft({ ...draft, rerolls: Number(event.target.value) })} />
              </label>
              <label>
                Dice per reroll
                <input type="number" value={draft.diceRerolled} onChange={(event) => setDraft({ ...draft, diceRerolled: Number(event.target.value) })} />
              </label>
            </div>
            <div className="roll-buttons end">
              <button type="button" className="lab-btn" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="lab-btn primary"
                onClick={() => {
                  send({
                    op: "options",
                    color,
                    permanent: draft.permanent,
                    structural: draft.structural,
                    conditions: draft.conditions,
                    rerolls: draft.rerolls,
                    diceRerolled: draft.diceRerolled
                  });
                  onClose();
                }}
              >
                Apply
              </button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
};


const POPUP_W = 420;
/** Keeps the dice ring's side spokes on the canvas. */
const POOL_RING_MARGIN = 110;

export const RollsCell = ({ rolls, send, options }: { rolls: RollsSlice | undefined; send: RollsSend; options: OptionsAccess }): ReactElement => {
  const [popup, setPopup] = useState<OptionsPopup | null>(null);
  const [poolRing, setPoolRing] = useState<PoolRing | null>(null);
  const openPoolRing = (event: MouseEvent<HTMLElement>, target: PoolRing["target"]): void => {
    const point = canvasPoint(event);
    setPoolRing({ x: Math.min(Math.max(point.x, POOL_RING_MARGIN), 1920 - POOL_RING_MARGIN), y: point.y, target });
  };
  const openOptions = (event: MouseEvent<HTMLElement>, roll: PcRoll): void => {
    const point = canvasPoint(event);
    setPopup({ x: Math.min(point.x - POPUP_W, 1920 - POPUP_W - 8), y: Math.max(8, point.y - 20), roll });
  };
  if (!rolls) {
    return <p className="lab-note">Waiting for TTS…</p>;
  }
  const { pcs, storyteller } = rolls;
  const empty = pcs.length === 0 && storyteller.slots.length === 0 && !storyteller.live;
  const ringTarget = poolRing?.target;
  const ringPc = ringTarget?.kind === "pc" ? pcs.find((roll) => roll.color === ringTarget.color && roll.canModifyPool) : undefined;
  const live = storyteller.live;
  const ringNpc = ringTarget?.kind === "npc" && live && (live.phase === "setup" || live.phase === "preRoll") ? live : undefined;
  const ringRoll = ringPc ?? ringNpc;
  const changePool = (kind: PoolKind, delta: 1 | -1): void => {
    if (ringPc) {
      const actions = PC_POOL_ACTIONS[kind];
      if (actions) {
        send({ op: "poolDie", color: ringPc.color, action: delta > 0 ? actions[0] : actions[1] });
      }
    } else if (ringNpc) {
      const count = Math.max(0, (ringNpc.pool[kind] ?? 0) + delta);
      send({ op: "npcPool", kind: kind === "hunger" || kind === "rage" ? "hunger" : "normal", count });
    }
  };
  return (
    <div className="roll-cell">
      {empty && <p className="lab-note">No rolls. Right-click a seat or a stage token to start one.</p>}
      {pcs.map((roll) => (
        <PcRollRow
          key={roll.color}
          roll={roll}
          send={send}
          onOptions={openOptions}
          onPool={(event, color) => openPoolRing(event, { kind: "pc", color })}
        />
      ))}
      {storyteller.slots.length > 0 && (
        <div className="roll-slots">
          {storyteller.slots.map((slot) => <SlotChip key={slot.index} slot={slot} send={send} />)}
        </div>
      )}
      {live && (
        <NpcRollPanel live={live} send={send} onPool={(event) => openPoolRing(event, { kind: "npc" })} />
      )}
      {popup && <RollOptions popup={popup} access={options} send={send} onClose={() => setPopup(null)} />}
      {poolRing && ringRoll && (
        <DiceRing
          x={poolRing.x}
          y={poolRing.y}
          pool={ringRoll.pool}
          choices={poolRingChoices(ringRoll.rollType)}
          onChange={changePool}
          onClose={() => setPoolRing(null)}
        />
      )}
    </div>
  );
};
