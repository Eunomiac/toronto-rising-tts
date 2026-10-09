import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { Icon, type IconName } from "../icons";
import { canvasPoint, Overlay } from "../sketch";
import { SEAT_ACCENT } from "../../pcSheet/layout";
import type { PcRoll, PoolKind, RollPool, RollResult, RollsSlice, StLiveRoll, StRollSlot } from "../../worldState";
import type { RollOptionsView } from "./bridge";
import type { PoolDieAction, RollsSend } from "./commands";
import { DiceRing, PoolDiamonds, RolledDice } from "./dice";
import {
  bumpPool,
  conditionList,
  draftFromView,
  NPC_POOL_KEY,
  PERMANENT_OPTIONS,
  poolRingChoices,
  RESULT_CLASSES,
  rollPhaseLabel,
  rollTypeEdge,
  rollTypeLabel,
  STRUCTURAL_OPTIONS,
  toggleCondition,
  toggleStructural,
  withLocalPools,
  type RollOptionsDraft
} from "./view";

/**
 * The Scenes tab's Rolls cell: every Storyteller roll control. Each PC roll and the live NPC roll is a compact
 * card: the roll type runs down its left edge (click it for the roll options), the name collapses the card to
 * one line, the close button shows on hover, difficulty folds to "vs. N" once picked, the result text is itself
 * the override menu, and the actions stack down the right edge as icons that name themselves on hover. The
 * three Storyteller dice drawers sit between the PC rolls and the NPC roll. A card's background and glow tell
 * its phase. Dice still roll physically in TTS.
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

/**
 * Difficulty: the 0–10 strip until one is picked, then a "vs. N" box; clicking the box slides the strip open
 * again over the result line, and picking folds it.
 */
const Difficulty = ({ value, editable, title, onPick }: {
  value: number | undefined;
  editable: boolean;
  title: string;
  onPick: (n: number) => void;
}): ReactElement | null => {
  const [open, setOpen] = useState(false);
  if (editable && (value === undefined || open)) {
    return (
      <div className={`roll-strip${value === undefined ? "" : " over"}`} title={title}>
        {range(0, DIFFICULTY_MAX).map((n) => (
          <button
            key={n}
            type="button"
            className={`roll-strip-cell${n === value ? " on" : ""}`}
            onClick={() => {
              setOpen(false);
              onPick(n);
            }}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }
  if (value === undefined) {
    return null;
  }
  return (
    <span className="roll-vs">
      vs.
      <button type="button" className="roll-vs-box" disabled={!editable} title={editable ? "Change the difficulty" : "Difficulty"} onClick={() => setOpen(true)}>
        {value}
      </button>
    </span>
  );
};

/** The result headline; when the Storyteller may override it, the text itself opens the result menu. */
const ResultText = ({ result, onOverride }: { result: RollResult | undefined; onOverride?: (resultClass: string) => void }): ReactElement | null => {
  if (!result?.text) {
    return null;
  }
  const text = <span className={`roll-result ${result.resultClass ?? ""}`}>{result.text}</span>;
  return onOverride ? (
    <label className="roll-result-pick" title="Click to override the result">
      {text}
      <select
        value={result.resultClass ?? ""}
        onChange={(event) => onOverride(event.target.value)}
        aria-label="Override the result"
      >
        {RESULT_CLASSES.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
      </select>
    </label>
  ) : text;
};

/** One action down a card's right edge: an icon (or glyph) that names itself on hover. */
type CardAction = {
  readonly key: string;
  readonly label: string;
  readonly icon?: IconName;
  readonly glyph?: string;
  readonly tone?: string;
  readonly disabled?: boolean;
  /** Still shown on a collapsed one-line card. */
  readonly keep?: boolean;
  readonly onClick: () => void;
  /** Right-click runs the quiet variant (secret dice / no broadcast). */
  readonly onQuiet?: () => void;
};

const ActionButton = ({ action }: { action: CardAction }): ReactElement => (
  <button
    type="button"
    className={`roll-act${action.tone ? ` ${action.tone}` : ""}`}
    title={action.label}
    aria-label={action.label}
    disabled={action.disabled}
    onClick={action.onClick}
    onContextMenu={action.onQuiet ? (event) => {
      event.preventDefault();
      action.onQuiet?.();
    } : undefined}
  >
    <span className="roll-act-label">{action.label}</span>
    {action.icon ? <Icon name={action.icon} /> : <span className="roll-act-glyph">{action.glyph}</span>}
  </button>
);

const RollCard = ({ className, style, title, rollType, onType, name, flags, conditions, result, collapsed, onToggle, actions, onClose, closeLabel, children }: {
  className: string;
  style?: CSSProperties;
  title: string;
  rollType: string | undefined;
  onType?: (event: MouseEvent<HTMLElement>) => void;
  name: string;
  flags?: ReactNode;
  conditions: string;
  result: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  actions: readonly CardAction[];
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}): ReactElement => {
  const shown = collapsed ? actions.filter((action) => action.keep === true) : actions;
  const conditionParts = conditionList(conditions);
  return (
    <div className={`roll-card ${className}${collapsed ? " collapsed" : ""}${shown.length > 0 ? " has-acts" : ""}`} style={style} title={title}>
      <button
        type="button"
        className="roll-edge"
        disabled={!onType}
        title={onType ? `${rollTypeLabel(rollType)}: click for the roll options` : rollTypeLabel(rollType)}
        onClick={onType}
      >
        <span>{rollTypeEdge(rollType, collapsed)}</span>
      </button>
      <div className="roll-body">
        <div className="roll-head">
          <button type="button" className="roll-name" title={collapsed ? "Show the whole roll" : "Fold to one line"} onClick={onToggle}>
            {name}
          </button>
          {flags}
          {collapsed ? result : conditionParts.length > 0 && (
            <span className="roll-conds">
              {conditionParts.map((part, index) => (
                <span key={part}>{index > 0 && <span className="roll-conds-dia">◆</span>}{part}</span>
              ))}
            </span>
          )}
        </div>
        {!collapsed && children}
      </div>
      {shown.length > 0 && (
        <div className="roll-acts">
          {shown.map((action) => <ActionButton key={action.key} action={action} />)}
        </div>
      )}
      <button type="button" className="roll-close" title={closeLabel} aria-label={closeLabel} onClick={onClose}>
        <Icon name="cancel" />
      </button>
    </div>
  );
};

const pendingText = (pending: string | undefined): string | null =>
  pending === "oblivHungerStain" ? "Waiting for the player: Hunger or Stain"
    : pending === "brutalFailViolence" ? "Waiting for the player: fail or violence"
      : null;

type PoolRing = { readonly x: number; readonly y: number; readonly target: { readonly kind: "pc"; readonly color: string } | { readonly kind: "npc" } };

const PC_POOL_ACTIONS: Readonly<Partial<Record<PoolKind, readonly [PoolDieAction, PoolDieAction]>>> = {
  hunger: ["addHungerDie", "remHungerDie"],
  normal: ["addStandardDie", "remStandardDie"]
};

const PcRollRow = ({ roll, send, collapsed, onToggle, onOptions, onPool }: {
  roll: PcRoll;
  send: RollsSend;
  collapsed: boolean;
  onToggle: () => void;
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
  const overridable = !roll.held && roll.canModifyPool;
  const result = (
    <ResultText
      result={roll.result}
      {...(overridable ? { onOverride: (resultClass: string) => send({ op: "override", color, resultClass }) } : {})}
    />
  );
  const actions: CardAction[] = roll.held
    ? [{ key: "broadcast", icon: "broadcast", label: "Broadcast to the table", tone: "gold", keep: true, onClick: () => send({ op: "broadcast", color }) }]
    : [];
  return (
    <RollCard
      className={`pc ${roll.held ? "held" : phaseClass(roll.phase, roll.wpReroll)}`}
      style={style}
      title={title}
      rollType={roll.rollType}
      {...(roll.held ? {} : { onType: (event: MouseEvent<HTMLElement>) => onOptions(event, roll) })}
      name={roll.name}
      conditions={roll.conditions}
      result={result}
      collapsed={collapsed}
      onToggle={onToggle}
      actions={actions}
      onClose={() => send({ op: "cancel", color })}
      closeLabel={roll.held ? "Dismiss this result" : "Cancel this roll"}
    >
      <PoolDiamonds pool={roll.pool} onClick={overridable ? (event) => onPool(event, color) : undefined} />
      <div className="roll-line">
        <Difficulty
          value={roll.difficulty}
          editable={!roll.held && !roll.canModifyPool && !resolved}
          title={setup ? "Pick a difficulty to approve the roll and open it to the player" : "Difficulty"}
          onPick={(value) => send({ op: "difficulty", color, value })}
        />
        {result}
      </div>
      <RolledDice dice={roll.dice} pickable={false} />
      {waiting && <div className="roll-sub warn">{waiting}</div>}
    </RollCard>
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
      <button type="button" className="roll-act gold" title="Broadcast this held result to the table" aria-label="Broadcast" onClick={() => send({ op: "slotBroadcast", slot: slot.index })}>
        <Icon name="broadcast" />
      </button>
    )}
    <button type="button" className="roll-act danger" title="Clear this drawer" aria-label="Clear this drawer" onClick={() => send({ op: "slotCancel", slot: slot.index })}>
      <Icon name="cancel" />
    </button>
  </div>
);

const npcActions = (live: StLiveRoll, send: RollsSend): CardAction[] => {
  const a = live.actions;
  const actions: CardAction[] = [];
  if (a.roll) {
    actions.push({ key: "roll", icon: "roll", label: "Roll (right-click: secret dice)", tone: "gold", disabled: !a.rollEnabled, keep: true, onClick: () => send({ op: "npcRoll", secret: false }), onQuiet: () => send({ op: "npcRoll", secret: true }) });
  }
  if (a.half) {
    actions.push({ key: "half", glyph: "½", label: "Take Half (right-click: no broadcast)", onClick: () => send({ op: "npcHalf", quiet: false }), onQuiet: () => send({ op: "npcHalf", quiet: true }) });
  }
  if (a.wp) {
    actions.push({ key: "wp", icon: "willpower", label: "Spend Willpower to reroll", tone: "wp", onClick: () => send({ op: "npcWp" }) });
  }
  if (a.recalc) {
    actions.push({ key: "recalc", icon: "recalc", label: "Recalculate from the table", onClick: () => send({ op: "npcRecalc" }) });
  }
  if (a.reroll) {
    actions.push({ key: "reroll", icon: "reroll", label: "Reroll the picked dice", disabled: !a.rerollEnabled, onClick: () => send({ op: "npcReroll" }) });
  }
  if (a.confirm) {
    actions.push({ key: "confirm", icon: "confirm", label: "Confirm (right-click: hold the result)", tone: "gold", keep: true, onClick: () => send({ op: "npcConfirm", quiet: false }), onQuiet: () => send({ op: "npcConfirm", quiet: true }) });
  }
  if (a.oblivChoice) {
    actions.push(
      { key: "obHunger", icon: "hunger", label: "Oblivion: take Hunger", tone: "hunger", keep: true, onClick: () => send({ op: "choice", color: "Black", choice: "hunger" }) },
      { key: "obStain", icon: "humanity", label: "Oblivion: take a Stain", tone: "humanity", keep: true, onClick: () => send({ op: "choice", color: "Black", choice: "stain" }) }
    );
  }
  if (a.brutalChoice) {
    actions.push(
      { key: "brFail", icon: "cancel", label: "Brutal: take the failure", keep: true, onClick: () => send({ op: "choice", color: "Black", choice: "fail" }) },
      { key: "brViolence", icon: "violence", label: "Brutal: turn to violence", tone: "danger", keep: true, onClick: () => send({ op: "choice", color: "Black", choice: "violence" }) }
    );
  }
  return actions;
};

const NpcRollPanel = ({ live, send, collapsed, onToggle, onPool }: {
  live: StLiveRoll;
  send: RollsSend;
  collapsed: boolean;
  onToggle: () => void;
  onPool: (event: MouseEvent<HTMLElement>) => void;
}): ReactElement => {
  const editable = live.phase === "setup" || live.phase === "preRoll";
  const result = <ResultText result={live.result} />;
  const flags = (live.secret || live.quiet) && (
    <span className="roll-flags">
      {live.secret && <span title="Secret dice: hidden from the players">Secret</span>}
      {live.quiet && <span title="No broadcast: the result is held">Held</span>}
    </span>
  );
  return (
    <RollCard
      className={`npc ${phaseClass(live.phase, live.wpReroll)}`}
      title={live.hint ?? phaseTitle(live.phase, live.wpReroll)}
      rollType={live.rollType}
      name={live.label ?? "NPC"}
      flags={flags}
      conditions=""
      result={result}
      collapsed={collapsed}
      onToggle={onToggle}
      actions={npcActions(live, send)}
      onClose={() => send({ op: "npcCancel" })}
      closeLabel="Cancel this roll and clear its drawer"
    >
      <PoolDiamonds pool={live.pool} onClick={editable ? onPool : undefined} />
      <div className="roll-line">
        <Difficulty value={live.difficulty} editable={live.phase !== "resolved"} title="Difficulty" onPick={(value) => send({ op: "npcDifficulty", value })} />
        {result}
      </div>
      <RolledDice dice={live.dice} pickable={live.actions.reroll} onPick={(index) => send({ op: "npcDie", index })} />
    </RollCard>
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
/** Fold key for the live NPC roll (PC rolls fold by seat colour). */
const NPC_FOLD = "npc";
/** Keeps the dice ring's side spokes on the canvas. */
const POOL_RING_MARGIN = 110;

/** After the roll queue drains, TTS's push takes over the painted pools; this long without one, they clear anyway. */
const LOCAL_POOL_HOLD_MS = 2000;

/**
 * Dice-ring clicks paint the pool at once, so quick clicks count up while their commands queue for TTS. Pushes
 * that land mid-queue are hidden behind the paint; the first push after the queue drains replaces it.
 */
const useLocalPools = (rolls: RollsSlice | undefined, pending: number): {
  shown: RollsSlice | undefined;
  paint: (key: string, base: RollPool, kind: PoolKind, delta: 1 | -1) => void;
} => {
  const [local, setLocal] = useState<ReadonlyMap<string, RollPool>>(() => new Map());
  const drained = useRef(false);
  useEffect(() => {
    if (pending > 0 || local.size === 0) {
      drained.current = false;
      return undefined;
    }
    drained.current = true;
    const timer = window.setTimeout(() => setLocal(new Map()), LOCAL_POOL_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [pending, local]);
  useEffect(() => {
    if (drained.current) {
      drained.current = false;
      setLocal(new Map());
    }
  }, [rolls]);
  const paint = (key: string, base: RollPool, kind: PoolKind, delta: 1 | -1): void =>
    setLocal((current) => new Map(current).set(key, bumpPool(current.get(key) ?? base, kind, delta)));
  return { shown: rolls && withLocalPools(rolls, local), paint };
};

export const RollsCell = ({ rolls: pushed, pending = 0, send, options }: {
  rolls: RollsSlice | undefined;
  /** Roll commands not yet answered by TTS. */
  pending?: number;
  send: RollsSend;
  options: OptionsAccess;
}): ReactElement => {
  const { shown: rolls, paint } = useLocalPools(pushed, pending);
  const [popup, setPopup] = useState<OptionsPopup | null>(null);
  const [poolRing, setPoolRing] = useState<PoolRing | null>(null);
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set());
  const toggleFold = (key: string): void =>
    setFolded((current) => {
      const next = new Set(current);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });
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
        paint(ringPc.color, ringPc.pool, kind, delta);
        send({ op: "poolDie", color: ringPc.color, action: delta > 0 ? actions[0] : actions[1] });
      }
    } else if (ringNpc) {
      paint(NPC_POOL_KEY, ringNpc.pool, kind, delta);
      send({ op: "npcPool", kind: kind === "hunger" || kind === "rage" ? "hunger" : "normal", delta });
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
          collapsed={folded.has(roll.color)}
          onToggle={() => toggleFold(roll.color)}
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
        <NpcRollPanel
          live={live}
          send={send}
          collapsed={folded.has(NPC_FOLD)}
          onToggle={() => toggleFold(NPC_FOLD)}
          onPool={(event) => openPoolRing(event, { kind: "npc" })}
        />
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
