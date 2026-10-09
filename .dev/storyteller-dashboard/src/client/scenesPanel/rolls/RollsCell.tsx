import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactElement } from "react";
import { canvasPoint, Overlay } from "../../lab/sketch";
import { SEAT_ACCENT } from "../../pcSheet/layout";
import type { PcRoll, RollDie, RollsSlice, StLiveRoll, StRollSlot } from "../../worldState";
import type { RollOptionsView } from "./bridge";
import type { RollsSend } from "./commands";
import {
  draftFromView,
  PERMANENT_OPTIONS,
  POOL_DIE_ACTIONS,
  poolText,
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
 * NPC roll with its pool pickers and buttons. Dice still roll physically in TTS.
 */

export type OptionsAccess = {
  /** What the pop-up opens with. */
  readonly load: (color: string) => Promise<RollOptionsView>;
  /** Change the roll type now (TTS re-reads the per-roll rules for it) and return the fresh values. */
  readonly changeType: (color: string, rollType: string) => Promise<RollOptionsView>;
};

const HUNGER_MAX = 5;
const POOL_MAX = 10;
const DIFFICULTY_MAX = 10;

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, index) => from + index);

const Strip = ({ label, from, to, value, disabled, title, cellText, onPick }: {
  label: string;
  from: number;
  to: number;
  value: number | undefined;
  disabled?: boolean;
  title: string;
  cellText?: (n: number) => string;
  onPick: (n: number) => void;
}): ReactElement => (
  <div className={`roll-strip${disabled ? " disabled" : ""}`} title={title}>
    <span className="roll-strip-label">{label}</span>
    {range(from, to).map((n) => (
      <button key={n} type="button" className={`roll-strip-cell${n === value ? " on" : ""}`} disabled={disabled} onClick={() => onPick(n)}>
        {cellText ? cellText(n) : n}
      </button>
    ))}
  </div>
);

const Dice = ({ dice, pickable, onPick }: { dice: readonly RollDie[]; pickable: boolean; onPick?: (index: number) => void }): ReactElement | null =>
  dice.length === 0 ? null : (
    <div className="roll-dice">
      {dice.map((die, index) => (
        <button
          key={index}
          type="button"
          className={`roll-die ${die.kind}${die.selected ? " selected" : ""}`}
          disabled={!pickable}
          title={pickable ? "Click to pick this die for a reroll" : undefined}
          onClick={() => onPick?.(index + 1)}
        >
          {die.value ?? "?"}
        </button>
      ))}
    </div>
  );

const ResultLine = ({ text, resultClass }: { text: string; resultClass: string | undefined }): ReactElement | null =>
  text ? <div className={`roll-result ${resultClass ?? ""}`}>{text}</div> : null;

const pendingText = (pending: string | undefined): string | null =>
  pending === "oblivHungerStain" ? "Waiting for the player: Hunger or Stain"
    : pending === "brutalFailViolence" ? "Waiting for the player: fail or violence"
      : null;

const PcRollRow = ({ roll, send, onOptions }: {
  roll: PcRoll;
  send: RollsSend;
  onOptions: (event: MouseEvent<HTMLElement>, roll: PcRoll) => void;
}): ReactElement => {
  const color = roll.color;
  const style = { "--seat-color": SEAT_ACCENT[color] ?? "#888" } as CSSProperties;
  const setup = roll.phase === "setup";
  const resolved = roll.phase === "resolved";
  const waiting = pendingText(roll.pending);
  return (
    <div className={`roll-row${roll.held ? " held" : ""}${setup ? " setup" : ""}`} style={style}>
      <div className="roll-row-head">
        <span className="roll-row-name">{roll.name}</span>
        <span className="roll-row-type">{rollTypeLabel(roll.rollType)}</span>
        {roll.held ? (
          <button type="button" className="roll-btn" title="Show this result to the table" onClick={() => send({ op: "broadcast", color })}>Broadcast</button>
        ) : (
          <button type="button" className="roll-btn icon" title="Roll options" onClick={(event) => onOptions(event, roll)}>⚙</button>
        )}
        <button
          type="button"
          className="roll-btn icon danger"
          title={roll.held ? "Dismiss this result" : "Cancel this roll"}
          onClick={() => send({ op: "cancel", color })}
        >
          ✕
        </button>
      </div>
      <div className="roll-row-sub">
        {roll.held ? "Held result" : rollPhaseLabel(roll.phase)} · {poolText(roll.pool)}
        {roll.label ? ` · ${roll.label}` : ""}
      </div>
      {roll.conditions && <div className="roll-row-sub dim">{roll.conditions}</div>}
      <ResultLine text={roll.result?.text ?? ""} resultClass={roll.result?.resultClass} />
      {waiting && <div className="roll-row-sub warn">{waiting}</div>}
      {!roll.held && roll.canModifyPool && (
        <div className="roll-buttons">
          {POOL_DIE_ACTIONS.map((entry) => (
            <button key={entry.action} type="button" className="roll-btn small" title={entry.title} onClick={() => send({ op: "poolDie", color, action: entry.action })}>
              {entry.label}
            </button>
          ))}
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
        </div>
      )}
      {!roll.held && !roll.canModifyPool && !resolved && (
        <div className="roll-buttons">
          <Strip
            label="Diff"
            from={0}
            to={DIFFICULTY_MAX}
            value={roll.difficulty}
            title={setup ? "Pick a difficulty to approve the roll and open it to the player" : "Difficulty"}
            onPick={(value) => send({ op: "difficulty", color, value })}
          />
          {setup && <button type="button" className="roll-btn small" title="Open the roll to the player without a difficulty" onClick={() => send({ op: "open", color })}>Open</button>}
        </div>
      )}
    </div>
  );
};

const SlotChip = ({ slot, send }: { slot: StRollSlot; send: RollsSend }): ReactElement => (
  <div className={`roll-slot${slot.live ? " live" : ""}`} title={`Drawer ${slot.index}: ${rollTypeLabel(slot.rollType)}, ${rollPhaseLabel(slot.phase)}`}>
    <span className="roll-slot-index">{slot.index}</span>
    <span className="roll-slot-label">{slot.label ?? "—"}</span>
    {slot.canBroadcast && (
      <button type="button" className="roll-btn small" title="Show this held result to the table" onClick={() => send({ op: "slotBroadcast", slot: slot.index })}>B</button>
    )}
    <button type="button" className="roll-btn small danger" title="Clear this drawer" onClick={() => send({ op: "slotCancel", slot: slot.index })}>✕</button>
  </div>
);

/** Right-click runs the quiet variant of an action (secret dice / no broadcast). */
const quietClick = (run: (quiet: boolean) => void) => ({
  onClick: () => run(false),
  onContextMenu: (event: MouseEvent) => {
    event.preventDefault();
    run(true);
  }
});

const NpcRollPanel = ({ live, send }: { live: StLiveRoll; send: RollsSend }): ReactElement => {
  const werewolf = live.rollType === "werewolf";
  const hunger = (werewolf ? live.pool.rage : live.pool.hunger) ?? 0;
  const normal = (werewolf ? live.pool.werewolf : live.pool.normal) ?? 0;
  const editable = live.phase === "setup" || live.phase === "preRoll";
  const a = live.actions;
  const pickPool = (kind: "hunger" | "normal", current: number) => (n: number): void =>
    send({ op: "npcPool", kind, count: n === current ? 0 : n });
  return (
    <div className="roll-npc">
      <div className="roll-row-head">
        <span className="roll-row-name">{live.label ?? "NPC"}</span>
        <span className="roll-row-type">{rollTypeLabel(live.rollType)}</span>
        <button type="button" className="roll-btn icon danger" title="Cancel this roll and clear its drawer" onClick={() => send({ op: "npcCancel" })}>✕</button>
      </div>
      <div className="roll-row-sub">{live.hint}</div>
      {(live.secret || live.quiet) && (
        <div className="roll-row-sub dim">{[live.secret ? "Secret dice" : "", live.quiet ? "No broadcast" : ""].filter(Boolean).join(" · ")}</div>
      )}
      {editable ? (
        <>
          <Strip
            label={werewolf ? "Rage" : "Hunger"}
            from={1}
            to={HUNGER_MAX}
            value={hunger || undefined}
            title={werewolf ? "Rage dice (click again to clear)" : "Hunger dice (click again to clear)"}
            onPick={pickPool("hunger", hunger)}
          />
          <Strip
            label="Pool"
            from={1}
            to={POOL_MAX}
            value={normal || undefined}
            title="Total dice in the pool, Hunger included (click again to clear)"
            cellText={(n) => String(n + hunger)}
            onPick={pickPool("normal", normal)}
          />
        </>
      ) : (
        <div className="roll-row-sub">Pool {poolText(live.pool)}</div>
      )}
      <Strip
        label="Diff"
        from={0}
        to={DIFFICULTY_MAX}
        value={live.difficulty}
        disabled={live.phase === "resolved"}
        title="Difficulty"
        onPick={(value) => send({ op: "npcDifficulty", value })}
      />
      <Dice dice={live.dice} pickable={a.reroll} onPick={(index) => send({ op: "npcDie", index })} />
      <ResultLine text={live.result?.text ?? ""} resultClass={live.result?.resultClass} />
      <div className="roll-buttons">
        {a.roll && (
          <button type="button" className="roll-btn primary" disabled={!a.rollEnabled} title="Roll (right-click: secret dice, hidden from the players)" {...quietClick((secret) => send({ op: "npcRoll", secret }))}>
            Roll
          </button>
        )}
        {a.half && <button type="button" className="roll-btn" title="Take Half (right-click: no broadcast)" {...quietClick((quiet) => send({ op: "npcHalf", quiet }))}>Take Half</button>}
        {a.wp && <button type="button" className="roll-btn" title="Spend Willpower to reroll" onClick={() => send({ op: "npcWp" })}>WP</button>}
        {a.reroll && <button type="button" className="roll-btn" disabled={!a.rerollEnabled} title="Reroll the picked dice" onClick={() => send({ op: "npcReroll" })}>Reroll</button>}
        {a.recalc && <button type="button" className="roll-btn" title="Re-read the dice on the table" onClick={() => send({ op: "npcRecalc" })}>Recalc</button>}
        {a.confirm && (
          <button type="button" className="roll-btn primary" title="Confirm (right-click: hold the result instead of broadcasting it)" {...quietClick((quiet) => send({ op: "npcConfirm", quiet }))}>
            Confirm
          </button>
        )}
      </div>
      {a.oblivChoice && (
        <div className="roll-buttons">
          <span className="roll-row-sub">Oblivion:</span>
          <button type="button" className="roll-btn" onClick={() => send({ op: "choice", color: "Black", choice: "hunger" })}>Hunger</button>
          <button type="button" className="roll-btn" onClick={() => send({ op: "choice", color: "Black", choice: "stain" })}>Stain</button>
        </div>
      )}
      {a.brutalChoice && (
        <div className="roll-buttons">
          <span className="roll-row-sub">Brutal:</span>
          <button type="button" className="roll-btn" onClick={() => send({ op: "choice", color: "Black", choice: "fail" })}>Fail</button>
          <button type="button" className="roll-btn" onClick={() => send({ op: "choice", color: "Black", choice: "violence" })}>Violence</button>
        </div>
      )}
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

export const RollsCell = ({ rolls, send, options }: { rolls: RollsSlice | undefined; send: RollsSend; options: OptionsAccess }): ReactElement => {
  const [popup, setPopup] = useState<OptionsPopup | null>(null);
  const openOptions = (event: MouseEvent<HTMLElement>, roll: PcRoll): void => {
    const point = canvasPoint(event);
    setPopup({ x: Math.min(point.x - POPUP_W, 1920 - POPUP_W - 8), y: Math.max(8, point.y - 20), roll });
  };
  if (!rolls) {
    return <p className="lab-note">Waiting for TTS…</p>;
  }
  const { pcs, storyteller } = rolls;
  const empty = pcs.length === 0 && storyteller.slots.length === 0 && !storyteller.live;
  return (
    <div className="roll-cell">
      {empty && <p className="lab-note">No rolls. Right-click a seat or a stage token to start one.</p>}
      {pcs.map((roll) => <PcRollRow key={roll.color} roll={roll} send={send} onOptions={openOptions} />)}
      {storyteller.slots.length > 0 && (
        <div className="roll-slots">
          {storyteller.slots.map((slot) => <SlotChip key={slot.index} slot={slot} send={send} />)}
        </div>
      )}
      {storyteller.live && <NpcRollPanel live={storyteller.live} send={send} />}
      {popup && <RollOptions popup={popup} access={options} send={send} onClose={() => setPopup(null)} />}
    </div>
  );
};
