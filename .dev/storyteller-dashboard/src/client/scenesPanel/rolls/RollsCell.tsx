import { NPC_DIFFICULTY_MAX, npcDifficultyAllows, parseNpcDifficulty } from "../../../shared/npcCustomRolls";
import { useContext, useEffect, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { Icon, type IconName } from "../icons";
import { NpcLiveContext } from "../npcTrackers";
import { canvasPoint, Overlay } from "../sketch";
import { ROLL_CONTROL_EVENT, type RollControlRequest } from "../dnd/rollControls";
import { startNativeDrag } from "../dnd/native";
import { ROLL_DRAG_TYPE } from "../dnd/mime";
import { NPC_DRAG_TYPE, NPC_ROLL_DROP_ATTR, NPC_ROLL_DROP_EVENT } from "../stage";
import { SEAT_ACCENT } from "../../pcSheet/layout";
import { bloodPotencyRow, ROLL_TYPE_RULES, STRUCTURAL_OPTIONS } from "../../catalogVocab";
import type { PcRoll, PoolKind, RollPool, RollResult, RollsSlice, StLiveRoll, StRollSlot } from "../../worldState";
import type { RollOptionsView } from "./bridge";
import type { PoolDieAction, RollsSend } from "./commands";
import { DiceRing, PoolDiamonds, RolledDice } from "./dice";
import { saveRollPermanent, useRollChronicle, useRollChronicleSync } from "../../rollChronicle";
import { NpcConfigure, type ConfigureAt } from "./npcConfigure";
import { rollCardKeys, NPC_FOLD, slotFold } from "./rollFolds";
import {
  bumpPool,
  completedRollClearCommands,
  conditionList,
  draftFromView,
  isRouseCheck,
  NPC_POOL_KEY,
  PERMANENT_OPTIONS,
  poolRingChoices,
  RESULT_CLASSES,
  rollPhaseLabel,
  rollTypeEdge,
  rollTypeLabel,
  toggleCondition,
  toggleStructural,
  withLocalPools,
  type RollOptionsDraft
} from "./view";

/**
 * The Scenes tab's Rolls cell: every Storyteller roll control. Each PC roll and the live NPC roll is a compact
 * card: the roll type runs down its left edge (click it for the roll options), the name collapses the card to
 * one line (double-click a card to clear it), difficulty folds to "vs. N" once picked, the result text is itself
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

/** The difficulties of an NPC dropped on a PC roll card, held for that roll until a difficulty is picked. */
type DifficultyHighlight = { readonly rollId: string | undefined; readonly strong?: number | undefined; readonly weak?: number | undefined };

/** Phase as background and glow: setup glows red, ready is steady gold, rolling pulses gold (blue on a Willpower reroll). */
const phaseClass = (phase: string | undefined, wpReroll: boolean): string =>
  `phase-${phase ?? "none"}${wpReroll ? " wp" : ""}`;

const phaseTitle = (phase: string | undefined, wpReroll: boolean): string =>
  wpReroll ? `${rollPhaseLabel(phase)} (Willpower reroll)` : rollPhaseLabel(phase);

const NO_DIFFICULTY_TITLE = "No difficulty: count successes only";

/**
 * Difficulty: the 0–10 strip until one is picked, then a "vs. N" box; clicking the box slides the strip open
 * again over the result line, and picking folds it. With `noneCell` the 0 cell reads "–": a roll with no
 * difficulty has to be declared, so a forgotten one cannot roll as a success count.
 */
export const Difficulty = ({ value, editable, title, onPick, highlight, noneCell = false, rule: expression }: {
  value: number | undefined;
  editable: boolean;
  title: string;
  onPick: (n: number) => void;
  /** An NPC dropped on the card: its difficulties for actions it is suited to / everything else. */
  highlight?: DifficultyHighlight | undefined;
  noneCell?: boolean;
  rule?: string;
}): ReactElement | null => {
  const [open, setOpen] = useState(false);
  const none = (n: number): boolean => noneCell && n === 0;
  const rule = parseNpcDifficulty(expression ?? "");
  const max = expression ? NPC_DIFFICULTY_MAX : Math.max(DIFFICULTY_MAX, value ?? 0);
  if (editable && (value === undefined || open)) {
    const mark = (n: number): string =>
      n === highlight?.strong ? " strong" : n === highlight?.weak ? " weak" : "";
    const markTitle = (n: number): string | undefined =>
      none(n) ? NO_DIFFICULTY_TITLE
        : n === highlight?.strong ? "Against the dropped NPC where it is well suited" : n === highlight?.weak ? "Against the dropped NPC otherwise" : undefined;
    return (
      <div className={`roll-strip${value === undefined ? "" : " over"}`} title={title}>
        {range(0, max).filter((n) => npcDifficultyAllows(rule, n)).map((n) => (
          <button
            key={n}
            type="button"
            title={markTitle(n)}
            className={`roll-strip-cell${n === value ? " on" : ""}${mark(n)}`}
            onClick={() => {
              setOpen(false);
              onPick(n);
            }}
          >
            {none(n) ? "–" : n}
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
      <button
        type="button"
        className="roll-vs-box"
        disabled={!editable}
        title={none(value) ? NO_DIFFICULTY_TITLE : editable ? "Change the difficulty" : "Difficulty"}
        onClick={() => setOpen(true)}
      >
        {none(value) ? "–" : value}
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
  readonly onClick: (event: MouseEvent<HTMLElement>) => void;
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

/** A click on a collapsed card's name waits this long before unfolding, so a double-click clears it without a flicker. */
const UNFOLD_DELAY_MS = 250;

const RollCard = ({ className, style, title, rollType, onType, name, flags, conditions, detail, advice, result, collapsed, onToggle, actions, onClear, clearLabel, onNpcDrop, dndKind, dndColor, onDndStart, children }: {
  className: string;
  style?: CSSProperties;
  title: string;
  rollType: string | undefined;
  onType?: (event: MouseEvent<HTMLElement>) => void;
  name: string;
  flags?: ReactNode;
  conditions: string;
  detail?: string;
  advice?: string;
  result: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  actions: readonly CardAction[];
  /** Double-clicking the card does this. */
  onClear: () => void;
  clearLabel: string;
  /** An NPC dropped on the card: roster / seat drags, or a stage token released over it (`NPC_ROLL_DROP_EVENT`). */
  onNpcDrop?: ((characterKey: string) => void) | undefined;
  /** DnD matrix drop-kind for this card (hit-testing + drag source). */
  dndKind?: "pcRollPreroll" | "pcRollPostroll" | "npcRollPreroll" | "npcRollPostrollRevealed" | "npcRollPostrollSecret";
  dndColor?: string;
  onDndStart?: (event: DragEvent<HTMLDivElement>) => void;
  children: ReactNode;
}): ReactElement => {
  const shown = collapsed ? actions.filter((action) => action.keep === true) : actions;
  const conditionParts = conditionList(conditions);
  const unfoldTimer = useRef<number | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);
  const [dropOver, setDropOver] = useState(false);
  useEffect(() => {
    const card = cardRef.current;
    if (!card || !onNpcDrop) {
      return undefined;
    }
    const listener = (event: Event): void => {
      if (event instanceof CustomEvent && typeof event.detail === "string") {
        onNpcDrop(event.detail);
      }
    };
    card.addEventListener(NPC_ROLL_DROP_EVENT, listener);
    return () => card.removeEventListener(NPC_ROLL_DROP_EVENT, listener);
  }, [onNpcDrop]);
  useEffect(() => () => window.clearTimeout(unfoldTimer.current), []);
  const clickName = (event: MouseEvent<HTMLButtonElement>): void => {
    if (event.detail >= 2) {
      window.clearTimeout(unfoldTimer.current);
    } else if (collapsed) {
      unfoldTimer.current = window.setTimeout(onToggle, UNFOLD_DELAY_MS);
    } else {
      onToggle();
    }
  };
  return (
    <div
      ref={cardRef}
      className={`roll-card ${className}${collapsed ? " collapsed" : ""}${shown.length > 0 ? " has-acts" : ""}${dropOver ? " npc-drop" : ""}`}
      style={style}
      title={title}
      draggable={onDndStart !== undefined}
      data-tr-dnd-roll={dndKind}
      data-tr-dnd-roll-color={dndColor}
      onDragStart={onDndStart}
      {...(onNpcDrop ? {
        [NPC_ROLL_DROP_ATTR]: "",
        onDragOver: (event: DragEvent<HTMLDivElement>) => {
          if (event.dataTransfer.types.includes(NPC_DRAG_TYPE)) {
            event.preventDefault();
            setDropOver(true);
          }
        },
        onDragLeave: () => setDropOver(false),
        onDrop: (event: DragEvent<HTMLDivElement>) => {
          setDropOver(false);
          const characterKey = event.dataTransfer.getData(NPC_DRAG_TYPE);
          if (characterKey) {
            event.preventDefault();
            onNpcDrop(characterKey);
          }
        }
      } : {})}
      onDoubleClick={(event) => {
        // The roll options edge, the actions and the result override keep their own clicks.
        if (!(event.target as Element).closest(".roll-edge, .roll-acts, .roll-result-pick")) {
          onClear();
        }
      }}
    >
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
          <button type="button" className="roll-name" title={collapsed ? `Show the whole roll (double-click: ${clearLabel.toLowerCase()})` : "Fold to one line"} onClick={clickName}>
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
        {!collapsed && detail && <div className="roll-detail">{detail}</div>}
        {!collapsed && children}
        {!collapsed && advice && <div className="roll-advice">{advice}</div>}
      </div>
      {shown.length > 0 && (
        <div className="roll-acts">
          {shown.map((action) => <ActionButton key={action.key} action={action} />)}
        </div>
      )}
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

const PcRollRow = ({ roll, send, collapsed, onToggle, onOptions, onPool, highlight, onNpcDrop, onDifficulty }: {
  roll: PcRoll;
  send: RollsSend;
  collapsed: boolean;
  onToggle: () => void;
  onOptions: (event: MouseEvent<HTMLElement>, roll: PcRoll) => void;
  onPool: (event: MouseEvent<HTMLElement>, color: string) => void;
  highlight: DifficultyHighlight | undefined;
  onNpcDrop: (characterKey: string) => void;
  onDifficulty: () => void;
}): ReactElement => {
  const color = roll.color;
  const style = { "--seat-color": SEAT_ACCENT[color] ?? "#888" } as CSSProperties;
  const setup = roll.phase === "setup";
  const resolved = roll.phase === "resolved";
  const waiting = pendingText(roll.pending);
  const title = roll.done
    ? "Finished: shown here until this player rolls again. Broadcast it again, or fold it and double-click to dismiss it."
    : phaseTitle(roll.phase, roll.wpReroll);
  const overridable = !roll.done && roll.canModifyPool;
  const result = (
    <ResultText
      result={roll.result}
      {...(overridable ? { onOverride: (resultClass: string) => send({ op: "override", color, resultClass }) } : {})}
    />
  );
  const detail = roll.rollType === "launch" && roll.label
    ? `${roll.label.replace(/^Roll\s+/i, "")} · Difficulty ${roll.difficulty ?? "—"}`
    : undefined;
  const actions: CardAction[] = roll.done
    ? [{ key: "broadcast", icon: "broadcast", label: "Broadcast again", tone: "gold", keep: true, onClick: () => send({ op: "broadcast", color }) }]
    : [];
  if (roll.canStartComplications && roll.rollId) {
    actions.push({ key: "complications", icon: "cards", label: "Play Deck of Complications", tone: "gold", keep: true,
      onClick: () => send({ op: "complications", color, rollId: roll.rollId! }) });
  }
  return (
    <RollCard
      className={`pc ${phaseClass(roll.phase, roll.wpReroll)}${roll.done ? " broadcast" : ""}`}
      style={style}
      title={title}
      rollType={roll.rollType}
      {...(roll.done ? {} : { onType: (event: MouseEvent<HTMLElement>) => onOptions(event, roll) })}
      name={roll.name}
      conditions={roll.conditions}
      detail={detail}
      advice={roll.advice}
      result={result}
      collapsed={collapsed}
      onToggle={onToggle}
      actions={actions}
      onClear={() => send({ op: "cancel", color })}
      clearLabel={roll.done ? "Dismiss this result" : "Cancel this roll"}
      {...(roll.done ? {} : { onNpcDrop })}
      dndKind={roll.done || roll.phase === "postRoll" || roll.phase === "resolved" ? "pcRollPostroll" : "pcRollPreroll"}
      dndColor={color}
      onDndStart={(event) => {
        event.dataTransfer.setData(ROLL_DRAG_TYPE, color);
        event.dataTransfer.effectAllowed = "copyMove";
        const post = roll.done || roll.phase === "postRoll" || roll.phase === "resolved";
        startNativeDrag(event, {
          dragKind: post ? "pcRollPostroll" : "pcRollPreroll", color, rollType: roll.rollType, margin: roll.result?.margin, summary: `${roll.name}: ${roll.result?.text ?? "Roll pending"}`
        }, { label: `${roll.name} · ${rollTypeLabel(roll.rollType)}` });
      }}
    >
      <PoolDiamonds pool={roll.pool} onClick={overridable ? (event) => onPool(event, color) : undefined} />
      <div className="roll-line">
        <Difficulty
          value={roll.difficulty}
          editable={!roll.done && !roll.canModifyPool && !resolved}
          title={setup ? "Pick a difficulty to approve the roll and open it to the player" : "Difficulty"}
          highlight={highlight}
          onPick={(value) => {
            onDifficulty();
            send({ op: "difficulty", color, value });
          }}
        />
        {result}
      </div>
      {!isRouseCheck(roll.rollType) && <RolledDice dice={roll.dice} pickable={false} />}
      {highlight && highlight.strong === undefined && highlight.weak === undefined && (
        <div className="roll-sub">No difficulties in that NPC's Stats.</div>
      )}
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

/** A confirmed drawer's finished roll: stays until the drawer is cleared, like a PC's finished roll. */
const SlotRollCard = ({ slot, send, collapsed, onToggle }: {
  slot: StRollSlot;
  send: RollsSend;
  collapsed: boolean;
  onToggle: () => void;
}): ReactElement => {
  const result = <ResultText result={slot.result} />;
  const held = slot.pendingBroadcast;
  const flags = (
    <span className="roll-flags">
      <span title={`Storyteller dice drawer ${slot.index}`}>{slot.index}</span>
      {held && <span title="The result has not been shown to the table yet">Held</span>}
    </span>
  );
  const actions: CardAction[] = slot.canBroadcast
    ? [{
      key: "broadcast",
      icon: "broadcast",
      label: held ? "Broadcast to the table" : "Broadcast again",
      tone: "gold",
      keep: true,
      onClick: () => send({ op: "slotBroadcast", slot: slot.index })
    }]
    : [];
  return (
    <RollCard
      className={`npc phase-resolved ${held ? "held" : "broadcast"}`}
      title="Finished: shown here until the drawer is cleared. Broadcast it (again), or fold it and double-click to dismiss it."
      rollType={slot.rollType}
      name={slot.label ?? "NPC"}
      flags={flags}
      conditions=""
      result={result}
      collapsed={collapsed}
      onToggle={onToggle}
      actions={actions}
      onClear={() => send({ op: "slotCancel", slot: slot.index })}
      clearLabel="Dismiss this result and clear its drawer"
    >
      <PoolDiamonds pool={slot.pool} />
      <div className="roll-line">
        <Difficulty value={slot.difficulty} editable={false} title="Difficulty" noneCell onPick={() => undefined} />
        {result}
      </div>
      {!isRouseCheck(slot.rollType) && <RolledDice dice={slot.dice} pickable={false} />}
    </RollCard>
  );
};

const NO_PICKS: ReadonlySet<number> = new Set();

/**
 * The Blood Surge toggle and indicator: a hollow droplet when off, a glowing red one when on. Like a player's
 * surge bag, turning it on puts the surge dice and their rouse die in the pool, and turning it off takes them out.
 */
const surgeAction = (live: StLiveRoll, send: RollsSend, surgeDice: number | undefined): CardAction | null => {
  if (surgeDice === undefined && !live.bloodSurge) {
    return null;
  }
  const open = live.phase === "setup" || live.phase === "preRoll";
  const allowed = open && ROLL_TYPE_RULES.bloodSurge.includes(live.rollType ?? "");
  const label = live.bloodSurge
    ? open ? "Blood Surge is on (click to take its dice back out)" : "Blood Surge was on for this roll"
    : allowed ? `Blood Surge: +${surgeDice ?? 0} dice and a rouse check`
      : open ? "Blood Surge is not allowed on this roll type" : "No Blood Surge on this roll";
  return {
    key: "surge",
    icon: "hunger",
    label,
    tone: live.bloodSurge ? "surge on" : "surge",
    disabled: live.bloodSurge ? !open : !allowed,
    keep: true,
    onClick: () => send({ op: "npcSurge", on: !live.bloodSurge, dice: surgeDice ?? 0 })
  };
};

const npcActions = (
  live: StLiveRoll,
  send: RollsSend,
  picked: ReadonlySet<number>,
  onConfigure: ((event: MouseEvent<HTMLElement>) => void) | undefined,
  surgeDice: number | undefined,
  onOptions?: (event: MouseEvent<HTMLElement>) => void
): CardAction[] => {
  const a = live.actions;
  const actions: CardAction[] = [];
  if (onOptions) actions.push({ key: "conditions", icon: "options", label: "Roll options and conditions", keep: true, onClick: onOptions });
  if (onConfigure) {
    actions.push({ key: "configure", icon: "options", label: "Roll from the NPC's stats", keep: true, onClick: onConfigure });
  }
  const surge = surgeAction(live, send, surgeDice);
  if (surge) {
    actions.push(surge);
  }
  const needsDifficulty = live.difficulty === undefined;
  if (a.roll) {
    actions.push({
      key: "roll",
      icon: "roll",
      label: needsDifficulty ? "Pick a difficulty first (– for none)" : "Roll (right-click: secret dice)",
      tone: "gold",
      disabled: !a.rollEnabled,
      keep: true,
      onClick: () => send({ op: "npcRoll", secret: false }),
      onQuiet: () => send({ op: "npcRoll", secret: true })
    });
  }
  if (a.half) {
    actions.push({
      key: "half",
      glyph: "½",
      label: needsDifficulty ? "Pick a difficulty first (– for none)" : "Take Half (right-click: no broadcast)",
      disabled: !a.halfEnabled,
      onClick: () => send({ op: "npcHalf", quiet: false }),
      onQuiet: () => send({ op: "npcHalf", quiet: true })
    });
  }
  if (a.wp) {
    actions.push({ key: "wp", icon: "willpower", label: "Spend Willpower to reroll", tone: "wp", onClick: () => send({ op: "npcWp" }) });
  }
  if (a.recalc) {
    actions.push({ key: "recalc", icon: "recalc", label: "Recalculate from the table", onClick: () => send({ op: "npcRecalc" }) });
  }
  if (a.reroll) {
    actions.push({
      key: "reroll",
      icon: "reroll",
      label: "Reroll the picked dice",
      disabled: picked.size === 0,
      onClick: () => send({ op: "npcReroll", indices: [...picked].sort((x, y) => x - y) })
    });
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

const NpcRollPanel = ({ live, send, collapsed, onToggle, onPool, onConfigure, surgeDice, onOptions }: {
  live: StLiveRoll;
  send: RollsSend;
  collapsed: boolean;
  onToggle: () => void;
  onPool: (event: MouseEvent<HTMLElement>) => void;
  /** Set while the pool is still open and the NPC has a stat block. */
  onConfigure?: (event: MouseEvent<HTMLElement>) => void;
  /** A vampire NPC's Blood Surge dice (its Blood Potency); undefined for anyone who cannot surge. */
  surgeDice?: number | undefined;
  onOptions: (event: MouseEvent<HTMLElement>) => void;
}): ReactElement => {
  const editable = live.phase === "setup" || live.phase === "preRoll";
  // Reroll picks stay on the dashboard until Reroll sends them; any new throw clears them.
  const throwKey = `${live.rollId ?? ""}:${live.phase ?? ""}:${live.dice.map((die) => `${die.kind}${die.value ?? "?"}`).join(",")}`;
  const [picks, setPicks] = useState<{ readonly throwKey: string; readonly dice: ReadonlySet<number> }>({ throwKey, dice: new Set() });
  const picked = picks.throwKey === throwKey ? picks.dice : NO_PICKS;
  const togglePick = (index: number): void => {
    const next = new Set(picked);
    if (!next.delete(index)) {
      next.add(index);
    }
    setPicks({ throwKey, dice: next });
  };
  useEffect(() => {
    const onControl = (event: Event): void => {
      const request = (event as CustomEvent<RollControlRequest>).detail;
      if (request.action !== "rerollSelected" || !request.payload.dragKind.startsWith("npcRoll") || !live.actions.reroll || picked.size === 0) return;
      event.preventDefault();
      send({ op: "npcReroll", indices: [...picked].sort((a, b) => a - b) });
    };
    window.addEventListener(ROLL_CONTROL_EVENT, onControl);
    return () => window.removeEventListener(ROLL_CONTROL_EVENT, onControl);
  }, [live.actions.reroll, picked, send]);
  const result = <ResultText result={live.result} />;
  const flags = (live.secret || live.quiet) && (
    <span className="roll-flags">
      {live.secret && <span title="Secret dice: hidden from the players">Secret</span>}
      {live.quiet && <span title="No broadcast: the result is held">Held</span>}
    </span>
  );
  return (
    <RollCard
      className={`npc ${phaseClass(live.phase, live.wpReroll)}${live.result && live.phase !== "rolling" ? " held" : ""}`}
      title={live.hint ?? phaseTitle(live.phase, live.wpReroll)}
      rollType={live.rollType}
      name={live.label ?? "NPC"}
      flags={flags}
      conditions={live.conditions ?? ""}
      result={result}
      collapsed={collapsed}
      onToggle={onToggle}
      actions={npcActions(live, send, picked, onConfigure, surgeDice, onOptions)}
      onClear={() => send({ op: "npcCancel" })}
      clearLabel="Cancel this roll and clear its drawer"
      dndKind={editable ? "npcRollPreroll" : live.secret ? "npcRollPostrollSecret" : "npcRollPostrollRevealed"}
      onDndStart={(event) => {
        event.dataTransfer.setData(ROLL_DRAG_TYPE, "NPC");
        startNativeDrag(event, {
          dragKind: editable ? "npcRollPreroll" : live.secret ? "npcRollPostrollSecret" : "npcRollPostrollRevealed",
          characterKey: live.npcCharacterKey, label: live.label, rollType: live.rollType, margin: live.result?.margin, summary: `${live.label ?? "NPC"}: ${live.result?.text ?? "Roll pending"}`
        }, { label: `${live.label ?? "NPC"} · ${rollTypeLabel(live.rollType)}${live.secret ? " · Secret" : ""}` });
      }}
    >
      <PoolDiamonds pool={live.pool} onClick={editable ? onPool : undefined} />
      <div className="roll-line">
        <Difficulty
          value={live.difficulty}
          rule={live.difficultyRule}
          editable={live.phase !== "resolved"}
          title={live.difficulty === undefined ? "Pick a difficulty before rolling (– for none)" : "Difficulty"}
          noneCell
          onPick={(value) => send({ op: "npcDifficulty", value })}
        />
        {result}
      </div>
      {!isRouseCheck(live.rollType) && <RolledDice dice={live.dice} pickable={live.actions.reroll} picked={picked} onPick={togglePick} />}
    </RollCard>
  );
};

type OptionsPopup = { readonly x: number; readonly y: number; readonly roll: Pick<PcRoll, "color" | "name"> };

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
            {(view.activeConditions?.length ?? 0) > 0 && (
              <div>
                <span className="roll-options-head">Active conditions</span>
                <div className="roll-flags roll-active-conditions">
                  {view.activeConditions?.map((condition) => (
                    <span key={condition.id}>{condition.label}</span>
                  ))}
                </div>
              </div>
            )}
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
                  saveRollPermanent(draft.permanent);
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

export const RollsCell = ({ rolls: pushed, pending = 0, send, options, transitionKey }: {
  rolls: RollsSlice | undefined;
  /** Roll commands not yet answered by TTS. */
  pending?: number;
  send: RollsSend;
  options: OptionsAccess;
  /** Phase/subphase/live-scene identity; changing it clears cards whose rolls are already complete. */
  transitionKey: string;
}): ReactElement => {
  const { shown: rolls, paint } = useLocalPools(pushed, pending);
  useRollChronicleSync(pushed);
  const chronicle = useRollChronicle();
  const [popup, setPopup] = useState<OptionsPopup | null>(null);
  const [poolRing, setPoolRing] = useState<PoolRing | null>(null);
  const [configureAt, setConfigureAt] = useState<ConfigureAt | null>(null);
  const [highlights, setHighlights] = useState<Readonly<Record<string, DifficultyHighlight>>>({});
  const npcLive = useContext(NpcLiveContext);
  const priorTransition = useRef(transitionKey);
  useEffect(() => {
    if (priorTransition.current !== transitionKey && pushed) {
      for (const command of completedRollClearCommands(pushed)) {
        send(command);
      }
    }
    priorTransition.current = transitionKey;
  }, [transitionKey, pushed, send]);
  const dropNpc = (roll: PcRoll, characterKey: string): void => {
    const block = npcLive?.blockFor(characterKey);
    setHighlights((current) => ({
      ...current,
      [roll.color]: { rollId: roll.rollId, strong: block?.difficultyStrong, weak: block?.difficultyWeak }
    }));
  };
  const clearHighlight = (color: string): void =>
    setHighlights((current) => {
      const { [color]: _cleared, ...rest } = current;
      return rest;
    });
  const highlightFor = (roll: PcRoll): DifficultyHighlight | undefined => {
    const highlight = highlights[roll.color];
    return highlight && highlight.rollId === roll.rollId && !roll.done ? highlight : undefined;
  };
  // A fold belongs to one roll, never to its seat or the next roll created there.
  const [foldedKeys, setFoldedKeys] = useState<ReadonlyMap<string, string>>(new Map());
  const identities = pushed ? rollCardKeys(pushed) : new Map<string, string>();
  const folded = new Set([...foldedKeys].filter(([key, id]) => identities.get(key) === id).map(([key]) => key));
  const toggleFold = (key: string): void => {
    const id = identities.get(key);
    if (id === undefined) return;
    setFoldedKeys((current) => {
      const next = new Map(current);
      if (next.get(key) === id) next.delete(key);
      else next.set(key, id);
      return next;
    });
  };
  const openPoolRing = (event: MouseEvent<HTMLElement>, target: PoolRing["target"]): void => {
    const point = canvasPoint(event);
    setPoolRing({ x: Math.min(Math.max(point.x, POOL_RING_MARGIN), 1920 - POOL_RING_MARGIN), y: point.y, target });
  };
  const openOptions = (event: MouseEvent<HTMLElement>, roll: Pick<PcRoll, "color" | "name">): void => {
    const point = canvasPoint(event);
    setPopup({ x: Math.min(point.x - POPUP_W, 1920 - POPUP_W - 8), y: Math.max(8, point.y - 20), roll });
  };
  useEffect(() => {
    const onControl = (event: Event): void => {
      const { action, payload, at } = (event as CustomEvent<RollControlRequest>).detail;
      if (action === "rerollSelected") return;
      const pc = "color" in payload ? rolls?.pcs.find((row) => row.color === payload.color) : undefined;
      if (action === "adjustPool" && (pc?.canModifyPool || (!pc && rolls?.storyteller.live && ["setup", "preRoll"].includes(rolls.storyteller.live.phase ?? "")))) {
        setPoolRing({ x: Math.min(Math.max(at.x, POOL_RING_MARGIN), 1920 - POOL_RING_MARGIN), y: Math.max(100, Math.min(at.y, 900)), target: pc ? { kind: "pc", color: pc.color } : { kind: "npc" } });
        event.preventDefault();
      } else if (action === "convertType" && pc && !pc.done) {
        setPopup({ x: Math.max(8, Math.min(at.x - POPUP_W, 1920 - POPUP_W - 8)), y: Math.max(8, Math.min(at.y - 20, 650)), roll: pc });
        event.preventDefault();
      }
    };
    window.addEventListener(ROLL_CONTROL_EVENT, onControl);
    return () => window.removeEventListener(ROLL_CONTROL_EVENT, onControl);
  }, [rolls]);
  if (!rolls) {
    return <p className="lab-note">Waiting for TTS…</p>;
  }
  const { pcs, storyteller } = rolls;
  const empty = pcs.length === 0 && storyteller.slots.length === 0 && !storyteller.live;
  const ringTarget = poolRing?.target;
  const ringPc = ringTarget?.kind === "pc" ? pcs.find((roll) => roll.color === ringTarget.color && roll.canModifyPool) : undefined;
  const live = storyteller.live;
  const isFinished = (slot: StRollSlot): boolean => slot.result !== undefined && live?.slot !== slot.index;
  const finishedSlots = storyteller.slots.filter(isFinished);
  const chipSlots = storyteller.slots.filter((slot) => !isFinished(slot));
  const liveOpen = live !== undefined && (live.phase === "setup" || live.phase === "preRoll");
  const ringNpc = ringTarget?.kind === "npc" && liveOpen ? live : undefined;
  const npcKey = live?.npcCharacterKey;
  const npcBlock = npcKey && npcLive ? npcLive.blockFor(npcKey) : undefined;
  const npcRecord = npcKey ? npcLive?.trackers[npcKey] : undefined;
  const surgeDice = npcBlock?.kind === "vampire" && !(npcKey && npcLive?.conditions?.[npcKey]?.rollFeatures.noBloodSurge)
    ? bloodPotencyRow(npcBlock.bloodPotency).bloodSurge : undefined;
  const openConfigure = (event: MouseEvent<HTMLElement>): void => {
    const point = canvasPoint(event);
    setConfigureAt({ x: Math.max(8, Math.min(point.x - POPUP_W, 1920 - POPUP_W - 8)), y: Math.max(8, point.y - 20) });
  };
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
          highlight={highlightFor(roll)}
          onNpcDrop={(characterKey) => dropNpc(roll, characterKey)}
          onDifficulty={() => clearHighlight(roll.color)}
        />
      ))}
      {chipSlots.length > 0 && (
        <div className="roll-slots">
          {chipSlots.map((slot) => <SlotChip key={slot.index} slot={slot} send={send} />)}
        </div>
      )}
      {finishedSlots.map((slot) => (
        <SlotRollCard
          key={slot.index}
          slot={slot}
          send={send}
          collapsed={folded.has(slotFold(slot.index))}
          onToggle={() => toggleFold(slotFold(slot.index))}
        />
      ))}
      {live && (
        <NpcRollPanel
          live={live}
          send={send}
          collapsed={folded.has(NPC_FOLD)}
          onToggle={() => toggleFold(NPC_FOLD)}
          onOptions={(event) => openOptions(event, { color: "Black", name: live.label ?? "NPC" })}
          onPool={(event) => openPoolRing(event, { kind: "npc" })}
          {...(liveOpen && npcBlock ? { onConfigure: openConfigure } : {})}
          surgeDice={surgeDice}
        />
      )}
      {configureAt && live && liveOpen && npcBlock && (
        <NpcConfigure
          key={`${live.rollId ?? ""}:${live.npcCharacterKey ?? ""}`}
          at={configureAt}
          live={live}
          block={npcBlock}
          levels={{
            hunger: npcRecord?.hunger ?? 0,
            rage: npcRecord?.rage ?? 0,
            wpSup: npcRecord?.wpSup ?? 0,
            wpAgg: npcRecord?.wpAgg ?? 0
          }}
          send={send}
          onPool={(event) => {
            setConfigureAt(null);
            openPoolRing(event, { kind: "npc" });
          }}
          onClose={() => setConfigureAt(null)}
        />
      )}
      {chronicle.entries.length > 0 && (
        <details className="roll-chronicle">
          <summary>Recent rolls</summary>
          <ul>
            {[...chronicle.entries].slice(-8).reverse().map((entry) => (
              <li key={entry.rollId}>
                <span>{entry.label} — {entry.text || entry.rollType}</span>
                <button
                  type="button"
                  className="lab-btn"
                  onClick={() => send({ op: "showLoggedRoll", color: entry.color, entry: entry.entry })}
                >
                  Show
                </button>
              </li>
            ))}
          </ul>
        </details>
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
